import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { AVATAR_COMPONENTS, createAvatarSheetLlmPrompt } from "@/lib/avatar";
import { V1_PSD_EDITOR_LAYER_SPEC } from "@/lib/avatar-v1-psd";
import { breakdownAvatarSheet, createAvatarBreakdownPsd, revokeBreakdown } from "@/lib/avatar-sheet-breakdown";

const STORAGE_KEY = "stream-bro.avatar-helper.v3";
const OLD_STORAGE_KEY = "stream-bro.avatar-helper.v2";
const GROUPS = [
  { title: "Base", files: ["body-base.png", "head-base.png", "hair-base.png"] },
  { title: "Eyes", files: ["eye-state-open.png", "eye-state-closed.png"] },
  { title: "Video mouth", files: ["mouth-state-idle.png", "mouth-state-small.png", "mouth-state-medium.png", "mouth-state-wide.png"] },
  { title: "Voice", files: ["mouth-state-a.png", "mouth-state-i.png", "mouth-state-u.png", "mouth-state-e.png", "mouth-state-o.png"] },
];

function safeFileName(value) {
  return value.trim().replace(/\.psd$/i, "").replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "stream-bro-avatar-v1";
}

export default function AvatarHelper() {
  const sourceUrlRef = useRef("");
  const breakdownRef = useRef(null);
  const [context, setContext] = useState("");
  const [preparedContext, setPreparedContext] = useState("");
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [sourceFile, setSourceFile] = useState(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [breakdown, setBreakdown] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [breakdownStatus, setBreakdownStatus] = useState("Choose or paste a generated sprite sheet.");
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [documentName, setDocumentName] = useState("stream-bro-avatar-v1");

  const llmPrompt = useMemo(
    () => preparedContext ? createAvatarSheetLlmPrompt(preparedContext) : "",
    [preparedContext],
  );
  const mappedCount = useMemo(() => Object.values(assignments).filter(Boolean).length, [assignments]);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(STORAGE_KEY)
        || window.localStorage.getItem(OLD_STORAGE_KEY)
        || "null",
      );
      if (saved) {
        setContext(saved.context || "");
        setPreparedContext(saved.preparedContext || "");
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ context, preparedContext }));
  }, [context, hydrated, preparedContext]);

  useEffect(() => () => {
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    revokeBreakdown(breakdownRef.current);
  }, []);

  function buildRequest(event) {
    event.preventDefault();
    setPreparedContext(context.trim());
    setCopied("");
    setCopyError("");
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(llmPrompt);
      setCopyError("");
      setCopied("llm");
      window.setTimeout(() => setCopied(""), 1600);
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
    setBreakdownStatus("Image ready. Click Breakdown image.");
  }

  function pasteImage(event) {
    event.preventDefault();
    const item = [...(event.clipboardData?.items || [])].find((entry) => entry.type.startsWith("image/"));
    const file = item?.getAsFile();
    if (!file) {
      setBreakdownStatus("No image was found in the clipboard. Copy the image itself, then paste here.");
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
        ? "14 pieces found and mapped in reading order. Check every assignment."
        : `${next.pieces.length} pieces found. Map what is usable before export.`);
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
      setBreakdownStatus(`PSD exported with ${mappedCount}/14 mapped layers. Open it in the V1 editor to position each part.`);
    } catch (error) {
      setBreakdownStatus(`Export failed. ${error?.message || "Could not build the PSD."}`);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Avatar Sheet Prompt Builder — Stream Bro</title>
        <meta name="description" content="Create, break down, map, and export an Avatar V1 dress-up sheet." />
      </Head>
      <div className="site-shell app-shell">
        <SiteHeader />
        <main className="app-main avatar-prompt-main">
          <header className="app-page-bar avatar-prompt-title">
            <div>
              <h1>Avatar sheet · Prompt builder</h1>
              <span>Build the prompt, break down the image, then export a V1 PSD</span>
            </div>
            <Link href="/editor/psd/avatar-v1">Open V1 PSD editor ↗</Link>
          </header>

          <section className="prompt-workflow" aria-label="Avatar prompt workflow">
            <article className="prompt-step prompt-context-step">
              <header>
                <span>01</span>
                <div><h2>Describe the character</h2><p>Short and messy is fine. The LLM will structure it.</p></div>
              </header>
              <form onSubmit={buildRequest}>
                <label>
                  <span>Character context</span>
                  <textarea
                    value={context}
                    onChange={(event) => setContext(event.target.value)}
                    placeholder="A cozy forest witch with round glasses, moss-green clothes, warm brown skin, and a soft anime style."
                    required
                  />
                </label>
                <button className="button button-primary" type="submit">Build LLM request</button>
              </form>
              <div className="prompt-tip"><b>Keep it simple</b><span>Character, clothes, colors, mood, and art style are enough.</span></div>
            </article>

            <article className={`prompt-step prompt-output-step ${llmPrompt ? "is-ready" : ""}`}>
              <header>
                <span>02</span>
                <div><h2>Ask your LLM</h2><p>Paste this request into a text LLM, then generate its returned image prompt.</p></div>
              </header>
              <div className="prompt-text-box">
                {llmPrompt
                  ? <pre>{llmPrompt}</pre>
                  : <div className="prompt-placeholder"><b>Your structured request appears here</b><span>Start with the character context.</span></div>}
              </div>
              <button type="button" className="prompt-copy-button" disabled={!llmPrompt} onClick={copyText}>
                {copied === "llm" ? "Copied request" : "Copy LLM request"}
              </button>
            </article>
          </section>

          {copyError && <p className="helper-copy-error" role="alert">{copyError}</p>}

          <section className="image-breakdown">
            <header>
              <div><span>03</span><div><h2>Image breakdown</h2><p>Load the generated sheet. Processing stays in this browser.</p></div></div>
              <b>{breakdown ? `${breakdown.pieces.length} found` : "Waiting for image"}</b>
            </header>

            <div className="breakdown-input-grid">
              <label className="breakdown-file-input">
                <span>Select image file</span>
                <b>{sourceName || "Choose PNG, JPG, or WebP"}</b>
                <small>Click to browse your computer</small>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => useImage(event.target.files?.[0])} />
              </label>
              <label className="breakdown-paste-input">
                <span>Paste copied image</span>
                <textarea
                  value=""
                  onChange={() => {}}
                  onPaste={pasteImage}
                  placeholder="Click here, then press Ctrl+V or ⌘V"
                  aria-label="Paste an image from the clipboard"
                />
                <small>Copy the image itself, not its file path or URL</small>
              </label>
              <div className="breakdown-source-preview">
                {sourceUrl
                  ? <img src={sourceUrl} alt="Selected sprite sheet" />
                  : <div><b>No image loaded</b><span>White and transparent backgrounds are supported.</span></div>}
              </div>
              <div className="breakdown-run-panel">
                <p>{breakdownStatus}</p>
                <button type="button" className="button button-primary" disabled={!sourceFile || isBreakingDown} onClick={runBreakdown}>
                  {isBreakingDown ? "Breaking down…" : "Breakdown image"}
                </button>
              </div>
            </div>

            {breakdown && (
              <div className="breakdown-results">
                <header>
                  <div><h3>Detected pieces</h3><p>Check each preview and choose its V1 layer.</p></div>
                  <b>{mappedCount}/14 mapped</b>
                </header>
                <div className="breakdown-piece-grid">
                  {breakdown.pieces.map((piece, index) => (
                    <article key={piece.id}>
                      <div className="breakdown-piece-preview"><img src={piece.url} alt={`Detected piece ${index + 1}`} /></div>
                      <label>
                        <span>Piece {String(index + 1).padStart(2, "0")}</span>
                        <select value={assignments[piece.id] || ""} onChange={(event) => assignPiece(piece.id, event.target.value)}>
                          <option value="">Unassigned</option>
                          {AVATAR_COMPONENTS.map((component) => (
                            <option value={component.file} key={component.file}>{component.title} · {component.file}</option>
                          ))}
                        </select>
                      </label>
                    </article>
                  ))}
                </div>
                <footer className="breakdown-export">
                  <label><span>PSD filename</span><input value={documentName} onChange={(event) => setDocumentName(event.target.value)} /></label>
                  <div><span>Layers are centered at their source scale. Position and resize them in the V1 editor.</span><button type="button" className="button button-dark" disabled={!mappedCount || isExporting} onClick={exportPsd}>{isExporting ? "Exporting…" : "Export layered PSD"}</button></div>
                </footer>
              </div>
            )}
          </section>

          <section className="sheet-contract">
            <header>
              <div><span>Output contract</span><h2>One page. Every V1 part.</h2></div>
              <b>{AVATAR_COMPONENTS.length} / {AVATAR_COMPONENTS.length} layers</b>
            </header>
            <div className="sheet-contract-grid">
              {GROUPS.map((group) => (
                <section key={group.title}>
                  <h3>{group.title}<span>{group.files.length}</span></h3>
                  <ol>
                    {group.files.map((file) => {
                      const component = AVATAR_COMPONENTS.find((item) => item.file === file);
                      return <li key={file}><i aria-hidden="true" /><span><b>{component.title}</b><code>{file}</code></span></li>;
                    })}
                  </ol>
                </section>
              ))}
            </div>
            <footer>
              <span>Separated pieces</span><i />
              <span>Floating head · no neck</span><i />
              <span>Flat white background</span><i />
              <span>No labels in image</span><i />
              <span>Ready to cut into layers</span>
            </footer>
          </section>
        </main>
      </div>
    </>
  );
}
