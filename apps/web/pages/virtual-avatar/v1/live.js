import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Radio, RefreshCw } from "lucide-react";
import PublicAvatarOverlay from "@/components/PublicAvatarOverlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_OVERLAY_CONFIG,
  EMPTY_OVERLAY_EXPRESSION,
  buildOverlayPath,
  fetchOverlayPacks,
  normalizeOverlayConfig,
  packSupportsMouthMode,
} from "@/lib/avatar-overlay";
import { MOUTH_ANIMATION_MODES } from "@/lib/avatar-mouth";

const STORAGE_KEY = "creator-buddy-overlay-config-v1";
const LEGACY_STORAGE_KEY = "stream-bro-overlay-config-v1";

export default function OverlaySetup() {
  const [config, setConfig] = useState(DEFAULT_OVERLAY_CONFIG);
  const [packs, setPacks] = useState([]);
  const [packState, setPackState] = useState("loading");
  const [revision, setRevision] = useState("1");
  const [origin, setOrigin] = useState("");
  const [ready, setReady] = useState(false);
  const [copyState, setCopyState] = useState("Copy URL");

  useEffect(() => {
    setOrigin(window.location.origin);
    setRevision(String(Date.now()));
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || "{}");
      setConfig(normalizeOverlayConfig({ ...DEFAULT_OVERLAY_CONFIG, ...saved }));
    } catch {}
    setReady(true);
  }, []);

  const loadPacks = useCallback(async () => {
    setPackState("loading");
    try {
      const nextPacks = await fetchOverlayPacks();
      setPacks(nextPacks);
      setConfig((current) => {
        const selected = nextPacks.find((pack) => pack.id === current.pack) || nextPacks[0];
        const mouthMode = packSupportsMouthMode(selected.files, current.mouthMode) ? current.mouthMode : "volume";
        return { ...current, pack: selected.id, mouthMode };
      });
      setRevision(String(Date.now()));
      setPackState("ready");
    } catch {
      setPacks([]);
      setPackState("error");
    }
  }, []);

  useEffect(() => { loadPacks(); }, [loadPacks]);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); }, [config, ready]);

  const selectedPack = packs.find((pack) => pack.id === config.pack);
  const canUseOverlay = packState === "ready" && Boolean(selectedPack);
  const overlayPath = useMemo(() => buildOverlayPath(config, revision), [config, revision]);
  const overlayUrl = origin ? `${origin}${overlayPath}` : overlayPath;

  function update(patch) {
    setConfig((current) => normalizeOverlayConfig({ ...current, ...patch }));
    setCopyState("Copy URL");
  }

  function selectPack(packId) {
    const pack = packs.find((item) => item.id === packId);
    update({
      pack: packId,
      mouthMode: packSupportsMouthMode(pack?.files, config.mouthMode) ? config.mouthMode : "volume",
    });
    setRevision(String(Date.now()));
  }

  function resetPlacement() {
    update({ scale: DEFAULT_OVERLAY_CONFIG.scale, x: DEFAULT_OVERLAY_CONFIG.x, y: DEFAULT_OVERLAY_CONFIG.y });
  }

  async function copyUrl() {
    if (!canUseOverlay) return;
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopyState("Copied URL");
    } catch {
      setCopyState("Select URL below");
    }
  }

  return (
    <>
      <Head>
        <title>Avatar Live — Creator Buddy</title>
        <meta name="description" content="Configure and copy a Creator Buddy avatar overlay URL for OBS." />
      </Head>
      <main className="grid h-svh min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden bg-background p-3">
        <header className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 shadow-xs">
          <div className="flex min-w-0 items-center gap-2">
            <Radio className="size-4 text-primary" />
            <div className="min-w-0"><h1 className="text-sm font-medium">Avatar Live</h1><p className="truncate text-xs text-muted-foreground">Place a public avatar, then copy one OBS browser-source URL.</p></div>
          </div>
          <Badge variant={packState === "ready" ? "secondary" : packState === "error" ? "destructive" : "outline"}>{packState === "ready" ? `${packs.length} pack${packs.length === 1 ? "" : "s"}` : packState === "error" ? "Unavailable" : "Loading"}</Badge>
        </header>

        <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="min-h-0">
            <CardHeader className="border-b">
              <CardTitle>Output preview</CardTitle>
              <CardDescription>Transparent 16:9 output. The renderer has no visible interface.</CardDescription>
              <CardAction><Badge variant="outline">1920 × 1080</Badge></CardAction>
            </CardHeader>
            <CardContent className="grid min-h-0 flex-1 place-items-center bg-muted/40">
              <div
                className="relative w-full max-w-6xl overflow-hidden rounded-md border border-border"
                style={{
                  backgroundColor: "#f2f2ed",
                  backgroundImage: "linear-gradient(45deg, rgba(0, 0, 0, .07) 25%, transparent 25%), linear-gradient(-45deg, rgba(0, 0, 0, .07) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0, 0, 0, .07) 75%), linear-gradient(-45deg, transparent 75%, rgba(0, 0, 0, .07) 75%)",
                  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0",
                  backgroundSize: "20px 20px",
                }}>
                <div className="aspect-video">
                  {canUseOverlay ? <PublicAvatarOverlay pack={config.pack} files={selectedPack.files} expression={EMPTY_OVERLAY_EXPRESSION} scale={config.scale} x={config.x} y={config.y} revision={revision} /> : (
                    <div className="grid h-full place-content-center justify-items-center gap-2 p-6 text-center"><p className="text-sm font-medium">{packState === "error" ? "Models are unavailable" : "Preparing preview"}</p><p className="text-xs text-muted-foreground">{packState === "error" ? "Check the public avatar manifest, then retry." : "Loading public avatar packs."}</p>{packState === "error" && <Button variant="outline" size="sm" onClick={loadPacks}><RefreshCw />Retry</Button>}</div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between border-t text-xs text-muted-foreground"><span>{selectedPack?.id || "No pack selected"}</span><span>Checkerboard = transparent</span></CardFooter>
          </Card>

          <aside className="min-h-0 overflow-y-auto pr-1">
            <div className="grid gap-3 pb-3">
              <Card size="sm">
                <CardHeader><CardTitle>1. Avatar pack</CardTitle><CardDescription>Public packs make the copied URL portable.</CardDescription></CardHeader>
                <CardContent className="grid gap-2">
                  <Label htmlFor="overlay-pack">Avatar</Label>
                  <Select value={selectedPack?.id || ""} onValueChange={selectPack} disabled={!canUseOverlay}>
                    <SelectTrigger id="overlay-pack"><SelectValue placeholder={packState === "loading" ? "Loading packs…" : "No pack"} /></SelectTrigger>
                    <SelectContent>{packs.map((pack) => <SelectItem value={pack.id} key={pack.id}>{pack.id}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{selectedPack ? `${selectedPack.files.length}/14 public layer files available.` : "PSD files stay in the editor; public PNG layers power OBS."}</p>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader><CardTitle>2. Animation</CardTitle><CardDescription>The same controller runs in Studio and OBS.</CardDescription></CardHeader>
                <CardContent className="grid gap-4">
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5">
                    <div><Label htmlFor="overlay-tracking">Start tracking in OBS</Label><p className="mt-1 text-xs text-muted-foreground">Camera controls body, head, eyes, and mouth.</p></div>
                    <Switch id="overlay-tracking" checked={config.tracking} onCheckedChange={(tracking) => update({ tracking })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="overlay-mouth-mode">Mouth animation</Label>
                    <Select value={config.mouthMode} onValueChange={(mouthMode) => update({ mouthMode })} disabled={!canUseOverlay}>
                      <SelectTrigger id="overlay-mouth-mode"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(MOUTH_ANIMATION_MODES).map(([value, option]) => <SelectItem value={value} key={value} disabled={!packSupportsMouthMode(selectedPack?.files, value)}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-xs leading-4 text-muted-foreground">{MOUTH_ANIMATION_MODES[config.mouthMode].description}</p>
                  </div>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader><CardTitle>3. Placement</CardTitle><CardDescription>Saved directly into the overlay URL.</CardDescription></CardHeader>
                <CardContent className="grid gap-4">
                  {[{ key: "scale", label: "Scale", min: 40, max: 180, suffix: "%" }, { key: "x", label: "Horizontal", min: 0, max: 100, suffix: "%" }, { key: "y", label: "Vertical", min: 0, max: 100, suffix: "%" }].map(({ key, label, min, max, suffix }) => (
                    <div className="grid gap-2" key={key}><Label>{label}<span className="ml-auto text-muted-foreground">{config[key]}{suffix}</span></Label><Slider min={min} max={max} value={config[key]} onValueChange={(value) => update({ [key]: value })} aria-label={label} /></div>
                  ))}
                  <Button variant="outline" size="sm" onClick={resetPlacement}>Reset placement</Button>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader><CardTitle>4. OBS URL</CardTitle><CardDescription>Use this in an OBS Browser Source.</CardDescription></CardHeader>
                <CardContent className="grid gap-3">
                  <Textarea value={canUseOverlay ? overlayUrl : ""} readOnly onFocus={(event) => event.currentTarget.select()} placeholder="A URL appears after a pack loads." className="min-h-24 font-mono text-[11px]" aria-label="Generated OBS overlay URL" />
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={copyUrl} disabled={!canUseOverlay}><Copy />{copyState}</Button>
                    {canUseOverlay ? <Button variant="outline" render={<Link href={overlayPath} target="_blank" rel="noreferrer" />}><ExternalLink />Open</Button> : <Button variant="outline" disabled>Open</Button>}
                  </div>
                  <Separator />
                  <ol className="grid list-decimal gap-1 pl-4 text-xs leading-4 text-muted-foreground"><li>Add an OBS Browser Source.</li><li>Paste the URL and use 1920 × 1080.</li><li>Allow media access when OBS asks.</li></ol>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
