import Link from "next/link";
import { useRouter } from "next/router";

export default function PsdEditorWorkspace({
  backHref = "/",
  studioHref,
  documentName,
  onDocumentNameChange,
  canvasSize,
  onCanvasSizeChange,
  importing,
  onImport,
  exporting,
  onExport,
  savingAvatar = false,
  onExportAvatar,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  layerList,
  status,
  selectedName,
  canvas,
  tools,
  mode,
}) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(backHref);
  }

  return (
    <main className={`psd-editor-shell is-${mode}`}>
      <header className="psd-editor-topbar">
        <button type="button" className="psd-editor-back" onClick={goBack} aria-label="Go back">
          <span aria-hidden="true">←</span>
          <b>Back</b>
        </button>

        <label className="psd-editor-file">
          <span>File</span>
          <input value={documentName} onChange={onDocumentNameChange} aria-label="PSD file name" />
        </label>

        <label className="psd-editor-size">
          <span>Canvas</span>
          <select value={canvasSize} onChange={onCanvasSizeChange} aria-label="Canvas size">
            {![512, 1024, 2048].includes(Number(canvasSize)) && <option value={canvasSize}>{canvasSize} × {canvasSize}</option>}
            <option value="512">512 × 512</option>
            <option value="1024">1024 × 1024</option>
            <option value="2048">2048 × 2048</option>
          </select>
        </label>

        <label className="psd-editor-import">
          <span>{importing ? "Reading…" : "Import PSD"}</span>
          <input type="file" accept=".psd,image/vnd.adobe.photoshop" onChange={onImport} disabled={importing || exporting || savingAvatar} />
        </label>

        <div className="psd-editor-history" aria-label="History">
          <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl/Cmd + Z)">↶ <span>Undo</span></button>
          <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl/Cmd + Shift + Z)">↷ <span>Redo</span></button>
        </div>

        <div className="psd-editor-top-actions">
          <Link href={studioHref}>Open studio</Link>
          {onExportAvatar && (
            <button type="button" className="is-avatar-export" onClick={onExportAvatar} disabled={exporting || importing || savingAvatar}>
              {savingAvatar ? "Saving…" : "Save to OBS"}
            </button>
          )}
          <button type="button" onClick={onExport} disabled={exporting || importing || savingAvatar}>{exporting ? "Building…" : "Export PSD"}</button>
        </div>
      </header>

      <div className="psd-editor-workspace">
        <aside className="psd-editor-tools" aria-label="Editor tools">{tools}</aside>

        <section className="psd-editor-stage">
          <div className="psd-editor-status">
            <span>{status}</span>
            <small>{selectedName}</small>
          </div>
          <div className="psd-editor-canvas-area">{canvas}</div>
          <footer className="psd-editor-stage-footer">
            <span>{canvasSize} × {canvasSize}px</span>
            <span>{mode === "paint" ? "Paint mode · other layers are guides" : "Transform mode · X snaps to center"}</span>
          </footer>
        </section>

        <aside className="psd-editor-layers" aria-label="PSD layers">{layerList}</aside>
      </div>
    </main>
  );
}
