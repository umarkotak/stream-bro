import Link from "next/link";

export default function PsdEditorWorkspace({
  version,
  studioHref,
  documentName,
  onDocumentNameChange,
  canvasSize,
  onCanvasSizeChange,
  filledCount,
  layerCount,
  importing,
  onImport,
  exporting,
  onExport,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  layerList,
  status,
  selectedName,
  canvas,
  inspector,
}) {
  return (
    <main className="app-main editor-shell">
      <header className="app-page-bar">
        <div><h1>Avatar {version} · PSD Editor</h1><span>Import, paste, position, and export exact layers</span></div>
        <Link href={studioHref}>Open matching studio ↗</Link>
      </header>
      <div className="editor-command-bar">
        <label><span>File name</span><input value={documentName} onChange={onDocumentNameChange} /></label>
        <label><span>Canvas</span><select value={canvasSize} onChange={onCanvasSizeChange}>{![512, 1024, 2048].includes(Number(canvasSize)) && <option value={canvasSize}>{canvasSize} × {canvasSize}</option>}<option value="512">512 × 512</option><option value="1024">1024 × 1024</option><option value="2048">2048 × 2048</option></select></label>
        <label className="editor-import-psd"><span>Existing file</span><b>{importing ? "Reading…" : "Import PSD"}</b><input type="file" accept=".psd,image/vnd.adobe.photoshop" onChange={onImport} disabled={importing || exporting} /></label>
        <div className="history-actions"><button onClick={onUndo} disabled={!canUndo}>Undo</button><button onClick={onRedo} disabled={!canRedo}>Redo</button></div>
        <span className="editor-count">{filledCount}/{layerCount} layers</span>
        <button className="editor-export" onClick={onExport} disabled={exporting || importing}>{exporting ? "Building…" : "Export PSD ↗"}</button>
      </div>
      <div className="editor-layout">
        <aside className="editor-layer-column">{layerList}</aside>
        <section className="editor-canvas-column">
          <div className="workspace-bar"><span>{status}</span><small>{selectedName}</small></div>
          <div className="editor-canvas-slot">{canvas}</div>
        </section>
        <aside className="editor-inspector-column">{inspector}</aside>
      </div>
    </main>
  );
}
