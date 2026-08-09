import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AVATAR_COMPONENTS,
  AVATAR_SHEET_GRID,
  createAvatarSheetLlmPrompt,
} from "@/lib/avatar";
import { V1_PSD_EDITOR_LAYER_SPEC } from "@/lib/avatar-v1-psd";
import {
  breakdownAvatarSheet,
  createAvatarBreakdownPsd,
  revokeBreakdown,
} from "@/lib/avatar-sheet-breakdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const STORAGE_KEY = "creator-buddy.avatar-helper.v1";
const DEFAULT_STYLE = {
  character: "",
  artStyle: "",
  palette: "",
  wardrobe: "",
  mood: "",
  notes: "",
};
const COMPONENT_BY_FILE = new Map(AVATAR_COMPONENTS.map((component) => [component.file, component]));
const GRID_CELLS = AVATAR_SHEET_GRID.flatMap((row, rowIndex) => row.map((file, columnIndex) => ({
  file,
  label: `${String.fromCharCode(65 + rowIndex)}${columnIndex + 1}`,
})));

function safeFileName(value) {
  return value.trim().replace(/\.psd$/i, "").replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "creator-buddy-avatar-v1";
}

function createStyleBrief(style) {
  return [
    ["Character", style.character],
    ["Art style", style.artStyle],
    ["Palette", style.palette],
    ["Wardrobe and props", style.wardrobe],
    ["Mood and lighting", style.mood],
    ["Extra direction", style.notes],
  ]
    .filter(([, value]) => value.trim())
    .map(([label, value]) => `${label}: ${value.trim()}`)
    .join("\n");
}

export default function AvatarHelper() {
  const sourceUrlRef = useRef("");
  const breakdownRef = useRef(null);
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [sourceFile, setSourceFile] = useState(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [breakdown, setBreakdown] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [breakdownStatus, setBreakdownStatus] = useState("Choose or paste a 4×4 avatar sheet.");
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [documentName, setDocumentName] = useState("creator-buddy-avatar-v1");

  const styleBrief = useMemo(() => createStyleBrief(style), [style]);
  const llmPrompt = useMemo(
    () => style.character.trim() ? createAvatarSheetLlmPrompt(styleBrief) : "",
    [style.character, styleBrief],
  );
  const mappedCount = useMemo(() => Object.values(assignments).filter(Boolean).length, [assignments]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      if (saved?.style) {
        setStyle({ ...DEFAULT_STYLE, ...saved.style });
      } else if (saved?.context) {
        setStyle({ ...DEFAULT_STYLE, character: saved.context });
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ style }));
  }, [hydrated, style]);

  useEffect(() => () => {
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    revokeBreakdown(breakdownRef.current);
  }, []);

  function updateStyle(field, value) {
    setStyle((current) => ({ ...current, [field]: value }));
    setCopied(false);
    setCopyError("");
  }

  async function copyText() {
    if (!llmPrompt) return;
    try {
      await navigator.clipboard.writeText(llmPrompt);
      setCopyError("");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopyError("Clipboard was blocked. Allow clipboard access and try again.");
    }
  }

  function useImage(file) {
    if (!file?.type?.startsWith("image/")) {
      setBreakdownStatus("That clipboard or file item is not an image.");
      return;
    }
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    revokeBreakdown(breakdownRef.current);
    const url = URL.createObjectURL(file);
    sourceUrlRef.current = url;
    breakdownRef.current = null;
    setSourceFile(file);
    setSourceUrl(url);
    setSourceName(file.name || "clipboard-image.png");
    setBreakdown(null);
    setAssignments({});
    setBreakdownStatus("Image ready. Break it down to inspect the 14 layers.");
  }

  function pasteImage(event) {
    event.preventDefault();
    const item = [...(event.clipboardData?.items || [])].find((entry) => entry.type.startsWith("image/"));
    const file = item?.getAsFile();
    if (!file) {
      setBreakdownStatus("No image was found. Copy the image itself, then paste here.");
      return;
    }
    useImage(file);
  }

  async function runBreakdown() {
    if (!sourceFile) return;
    setIsBreakingDown(true);
    setBreakdownStatus("Finding separated artwork…");
    try {
      revokeBreakdown(breakdownRef.current);
      const next = await breakdownAvatarSheet(sourceFile);
      breakdownRef.current = next;
      setBreakdown(next);
      setAssignments(Object.fromEntries(
        next.pieces.map((piece, index) => [piece.id, AVATAR_COMPONENTS[index]?.file || ""]),
      ));
      setBreakdownStatus(next.pieces.length === AVATAR_COMPONENTS.length
        ? "14 pieces found and mapped from the 4×4 grid. Check every assignment."
        : `${next.pieces.length} pieces found. Check the grid and map the usable pieces before export.`);
    } catch (error) {
      setBreakdown(null);
      setAssignments({});
      setBreakdownStatus(error?.message || "Could not break down this image.");
    } finally {
      setIsBreakingDown(false);
    }
  }

  function assignPiece(pieceId, layerName) {
    setAssignments((current) => {
      const next = { ...current };
      Object.keys(next).forEach((id) => {
        if (id !== pieceId && layerName && next[id] === layerName) next[id] = "";
      });
      next[pieceId] = layerName;
      return next;
    });
  }

  async function exportPsd() {
    if (!breakdown || !mappedCount) return;
    setIsExporting(true);
    setBreakdownStatus("Building layered PSD…");
    try {
      const buffer = await createAvatarBreakdownPsd({
        result: breakdown,
        assignments,
        layerSpecs: V1_PSD_EDITOR_LAYER_SPEC,
      });
      const url = URL.createObjectURL(new Blob([buffer], { type: "image/vnd.adobe.photoshop" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFileName(documentName)}.psd`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
      setBreakdownStatus(`PSD exported with ${mappedCount}/14 mapped layers. Finish positioning in the V1 editor.`);
    } catch (error) {
      setBreakdownStatus(`Export failed. ${error?.message || "Could not build the PSD."}`);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Avatar Prompt Builder — Creator Buddy</title>
        <meta name="description" content="Create a grid-aligned Avatar V1 sheet, break it down, and export a PSD." />
      </Head>
      <div className="site-shell app-shell">
        <main className="app-main space-y-3 pb-6">
          <header className="flex items-center justify-between gap-3 px-1 pt-1">
            <div>
              <h1 className="text-base font-semibold tracking-tight">Avatar prompt builder</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">Style it, generate a grid-aligned sheet, then export a layered PSD.</p>
            </div>
            <Button variant="outline" size="sm" render={<Link href="/virtual-avatar/v1/editor" />}>
              Open editor
            </Button>
          </header>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>1. Style brief</CardTitle>
                <CardDescription>Start with the character, then add only the direction you need.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor="avatar-character">Character</Label>
                  <Textarea id="avatar-character" value={style.character} onChange={(event) => updateStyle("character", event.target.value)} placeholder="A cozy forest witch with round glasses and warm brown skin." required />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="avatar-art-style">Art style</Label>
                  <Input id="avatar-art-style" value={style.artStyle} onChange={(event) => updateStyle("artStyle", event.target.value)} placeholder="Soft anime, clean ink lines" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="avatar-palette">Palette</Label>
                  <Input id="avatar-palette" value={style.palette} onChange={(event) => updateStyle("palette", event.target.value)} placeholder="Moss green, cocoa, cream" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="avatar-wardrobe">Wardrobe / props</Label>
                  <Input id="avatar-wardrobe" value={style.wardrobe} onChange={(event) => updateStyle("wardrobe", event.target.value)} placeholder="Oversized cardigan, leaf pin" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="avatar-mood">Mood / lighting</Label>
                  <Input id="avatar-mood" value={style.mood} onChange={(event) => updateStyle("mood", event.target.value)} placeholder="Gentle, evenly front-lit" />
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor="avatar-notes">Extra direction <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Textarea id="avatar-notes" value={style.notes} onChange={(event) => updateStyle("notes", event.target.value)} placeholder="Anything unusually important: glasses shape, expression, silhouette, accessibility details…" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. LLM request</CardTitle>
                <CardDescription>Copy this into a text LLM. It returns one image-generation prompt.</CardDescription>
                <CardAction><Badge variant={llmPrompt ? "secondary" : "outline"}>{llmPrompt ? "Ready" : "Add character"}</Badge></CardAction>
              </CardHeader>
              <CardContent>
                <pre className="max-h-88 min-h-56 overflow-auto rounded-md border border-input bg-muted/30 p-3 font-mono text-[11px] leading-5 whitespace-pre-wrap text-foreground">
                  {llmPrompt || "Add a character description to build the request."}
                </pre>
              </CardContent>
              <CardFooter className="justify-end">
                <Button type="button" disabled={!llmPrompt} onClick={copyText}>{copied ? "Copied request" : "Copy LLM request"}</Button>
              </CardFooter>
            </Card>
          </section>

          {copyError && <p className="px-1 text-xs text-destructive" role="alert">{copyError}</p>}

          <Card>
            <CardHeader>
              <CardTitle>4×4 sheet contract</CardTitle>
              <CardDescription>The image has no visible grid lines. B3–C2 are the core stable mouth loop; C3–D3 are optional experimental vowels. A4 and D4 stay empty.</CardDescription>
              <CardAction><Badge variant="outline">14 layers</Badge></CardAction>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" aria-label="Avatar sheet grid">
                {GRID_CELLS.map((cell) => {
                  const component = cell.file ? COMPONENT_BY_FILE.get(cell.file) : null;
                  return (
                    <div key={cell.label} className="min-h-16 rounded-md border border-dashed border-border bg-muted/20 p-2">
                      <p className="text-[10px] font-medium text-muted-foreground">{cell.label}</p>
                      <p className="mt-1 text-xs font-medium">{component?.title || "Keep empty"}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Break down image</CardTitle>
              <CardDescription>Load the generated sheet. All processing stays in this browser.</CardDescription>
              <CardAction><Badge variant={breakdown ? "secondary" : "outline"}>{breakdown ? `${breakdown.pieces.length} found` : "Waiting"}</Badge></CardAction>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem]">
              <div className="grid content-start gap-1.5">
                <Label htmlFor="avatar-sheet-file">Image file</Label>
                <Input id="avatar-sheet-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => useImage(event.target.files?.[0])} />
                <p className="text-[11px] text-muted-foreground">{sourceName || "PNG, JPG, or WebP"}</p>
              </div>
              <div className="grid content-start gap-1.5">
                <Label htmlFor="avatar-sheet-paste">Or paste image</Label>
                <Textarea id="avatar-sheet-paste" value="" onChange={() => {}} onPaste={pasteImage} placeholder="Click here, then paste the copied image" className="min-h-20" />
                <p className="text-[11px] text-muted-foreground">Copy the image itself, not a URL.</p>
              </div>
              <div className="grid min-h-30 place-items-center overflow-hidden rounded-md border border-dashed border-border bg-muted/20">
                {sourceUrl
                  ? <img src={sourceUrl} alt="Selected avatar sheet" className="max-h-44 w-full object-contain" />
                  : <p className="px-3 text-center text-xs text-muted-foreground">Sheet preview</p>}
              </div>
            </CardContent>
            <CardFooter className="flex-wrap justify-between gap-3 border-t">
              <p className="text-xs text-muted-foreground">{breakdownStatus}</p>
              <Button type="button" disabled={!sourceFile || isBreakingDown} onClick={runBreakdown}>{isBreakingDown ? "Breaking down…" : "Break down image"}</Button>
            </CardFooter>
          </Card>

          {breakdown && (
            <Card>
              <CardHeader>
                <CardTitle>Layer mapping</CardTitle>
                <CardDescription>Verify the automatic grid order before exporting.</CardDescription>
                <CardAction><Badge variant="secondary">{mappedCount}/14 mapped</Badge></CardAction>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={(mappedCount / AVATAR_COMPONENTS.length) * 100}>
                  <ProgressLabel>Mapped layers</ProgressLabel>
                  <ProgressValue />
                </Progress>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {breakdown.pieces.map((piece, index) => (
                    <div key={piece.id} className="grid gap-2 rounded-md border border-border p-2">
                      <div className="grid aspect-square place-items-center overflow-hidden rounded bg-muted/30">
                        <img src={piece.url} alt={`Detected piece ${index + 1}`} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor={piece.id}>Piece {String(index + 1).padStart(2, "0")}</Label>
                        <NativeSelect id={piece.id} className="w-full" value={assignments[piece.id] || ""} onChange={(event) => assignPiece(piece.id, event.target.value)}>
                          <NativeSelectOption value="">Unassigned</NativeSelectOption>
                          {AVATAR_COMPONENTS.map((component) => <NativeSelectOption value={component.file} key={component.file}>{component.title}</NativeSelectOption>)}
                        </NativeSelect>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <Separator />
              <CardFooter className="justify-between gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="avatar-psd-name">PSD filename</Label>
                  <Input id="avatar-psd-name" value={documentName} onChange={(event) => setDocumentName(event.target.value)} className="w-64 max-w-full" />
                </div>
                <Button type="button" disabled={!mappedCount || isExporting} onClick={exportPsd}>{isExporting ? "Exporting…" : "Export layered PSD"}</Button>
              </CardFooter>
            </Card>
          )}
        </main>
      </div>
    </>
  );
}
