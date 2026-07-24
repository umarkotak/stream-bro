import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PublicAvatarOverlay from "@/components/PublicAvatarOverlay";
import {
  DEFAULT_OVERLAY_CONFIG,
  EMPTY_OVERLAY_EXPRESSION,
  buildOverlayPath,
  fetchOverlayPacks,
  normalizeOverlayConfig,
  packSupportsVoice,
} from "@/lib/avatar-overlay";

const STORAGE_KEY = "stream-bro-overlay-config-v1";

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
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
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
        return {
          ...current,
          pack: selected.id,
          mouthSource: packSupportsVoice(selected.files) ? current.mouthSource : "video",
        };
      });
      setRevision(String(Date.now()));
      setPackState("ready");
    } catch {
      setPacks([]);
      setPackState("error");
    }
  }, []);

  useEffect(() => { loadPacks(); }, [loadPacks]);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config, ready]);

  const selectedPack = packs.find((pack) => pack.id === config.pack);
  const voiceReady = packSupportsVoice(selectedPack?.files);
  const canUseOverlay = packState === "ready" && Boolean(selectedPack);
  const overlayPath = useMemo(() => buildOverlayPath(config, revision), [config, revision]);
  const overlayUrl = origin ? `${origin}${overlayPath}` : overlayPath;

  function update(patch) {
    setConfig((current) => normalizeOverlayConfig({ ...current, ...patch }));
    setCopyState("Copy URL");
  }

  function selectPack(event) {
    const pack = packs.find((item) => item.id === event.target.value);
    update({
      pack: event.target.value,
      mouthSource: packSupportsVoice(pack?.files) ? config.mouthSource : "video",
    });
    setRevision(String(Date.now()));
  }

  function resetPlacement() {
    update({
      scale: DEFAULT_OVERLAY_CONFIG.scale,
      x: DEFAULT_OVERLAY_CONFIG.x,
      y: DEFAULT_OVERLAY_CONFIG.y,
    });
  }

  async function copyUrl() {
    if (!canUseOverlay) return;
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopyState("Copied");
    } catch {
      setCopyState("Select URL below");
    }
  }

  return (
    <>
      <Head>
        <title>OBS Overlay Setup — Stream Bro</title>
        <meta name="description" content="Configure and copy a transparent Stream Bro avatar overlay URL for OBS." />
      </Head>
      <main className="overlay-setup-shell">
        <header className="overlay-setup-bar">
          <Link href="/" className="overlay-back"><span>←</span><b>Back</b></Link>
          <div className="overlay-setup-title"><span>OBS Browser Source</span><b>Avatar Overlay</b></div>
          <p>Select a public model, place it, then copy one transparent URL into OBS.</p>
          <div className={`overlay-model-state is-${packState}`}><i />{packState === "ready" ? `${packs.length} model${packs.length === 1 ? "" : "s"}` : packState === "loading" ? "Loading models" : "Models unavailable"}</div>
        </header>

        <div className="overlay-setup-workspace">
          <section className="overlay-preview-panel">
            <header><div><b>Output preview</b><span>Transparent 16:9 canvas</span></div><small>{selectedPack?.id || "No model"}</small></header>
            <div className="overlay-preview-area">
              <div className="overlay-preview-frame">
                {canUseOverlay ? (
                  <PublicAvatarOverlay
                    pack={config.pack}
                    files={selectedPack.files}
                    expression={EMPTY_OVERLAY_EXPRESSION}
                    scale={config.scale}
                    x={config.x}
                    y={config.y}
                    revision={revision}
                  />
                ) : (
                  <div className="overlay-preview-empty">
                    <b>{packState === "loading" ? "Loading models…" : "No model available"}</b>
                    <span>{packState === "error" ? "Check public/avatar/packs.json, then retry." : "Preparing the preview."}</span>
                    {packState === "error" && <button onClick={loadPacks}>Retry</button>}
                  </div>
                )}
              </div>
            </div>
            <footer><span>Recommended OBS size: 1920 × 1080</span><span>Checkerboard means transparent</span></footer>
          </section>

          <aside className="overlay-config-controls">
            <section>
              <header><span>01</span><div><b>Model</b><small>Public avatar pack</small></div></header>
              <label className="overlay-select">
                <span>Avatar</span>
                <select value={selectedPack?.id || ""} onChange={selectPack} disabled={!canUseOverlay}>
                  {!canUseOverlay && <option value="">{packState === "loading" ? "Loading…" : "No models"}</option>}
                  {packs.map((pack) => <option value={pack.id} key={pack.id}>{pack.id}</option>)}
                </select>
              </label>
              <p>{selectedPack ? `${selectedPack.files.length} public layer files found.` : "Overlay models live in public/avatar."} Local PSD files cannot travel inside a copied URL.</p>
            </section>

            <section>
              <header><span>02</span><div><b>Tracking</b><small>Runs locally inside OBS</small></div></header>
              <label className="overlay-toggle"><span><b>Auto-start camera</b><small>Face, blink, mouth, movement, and tilt</small></span><input type="checkbox" checked={config.tracking} onChange={(event) => update({ tracking: event.target.checked })} /></label>
              <div className="overlay-mouth-source">
                <span>Mouth source</span>
                <div><button className={config.mouthSource === "video" ? "is-active" : ""} onClick={() => update({ mouthSource: "video" })}>Camera</button><button className={config.mouthSource === "voice" ? "is-active" : ""} onClick={() => update({ mouthSource: "voice" })} disabled={!voiceReady}>Microphone</button></div>
                {!voiceReady && <small>The selected model has no complete A I U E O layer set.</small>}
              </div>
            </section>

            <section>
              <header><span>03</span><div><b>Placement</b><small>Position inside the browser source</small></div></header>
              <label className="overlay-range"><span>Scale <output>{config.scale}%</output></span><input type="range" min="40" max="180" value={config.scale} onChange={(event) => update({ scale: Number(event.target.value) })} /></label>
              <label className="overlay-range"><span>Horizontal <output>{config.x}%</output></span><input type="range" min="0" max="100" value={config.x} onChange={(event) => update({ x: Number(event.target.value) })} /></label>
              <label className="overlay-range"><span>Vertical <output>{config.y}%</output></span><input type="range" min="0" max="100" value={config.y} onChange={(event) => update({ y: Number(event.target.value) })} /></label>
              <button className="overlay-reset" onClick={resetPlacement}>Reset placement</button>
            </section>

            <section className="overlay-url-section">
              <header><span>04</span><div><b>OBS URL</b><small>Keep Stream Bro running</small></div></header>
              <textarea value={canUseOverlay ? overlayUrl : ""} readOnly aria-label="Generated OBS overlay URL" onFocus={(event) => event.currentTarget.select()} placeholder="A URL appears after the model loads." />
              <div className="overlay-url-actions">
                <button onClick={copyUrl} disabled={!canUseOverlay}>{copyState}</button>
                {canUseOverlay ? <Link href={overlayPath} target="_blank" rel="noreferrer">Open overlay ↗</Link> : <span>Open overlay</span>}
              </div>
              <ol><li>Add an OBS Browser Source.</li><li>Paste the URL and set 1920 × 1080.</li><li>Allow camera or microphone access when OBS asks.</li></ol>
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}
