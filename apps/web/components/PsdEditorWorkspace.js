import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, Download, FileUp, Redo2, Save, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

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
  const importInputRef = useRef(null);

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(backHref);
  }

  return (
    <main className={`psd-editor-shell is-${mode}`}>
      <header className="flex h-14 min-w-0 items-center gap-2 border-b border-border bg-card px-3">
        <Button type="button" variant="ghost" size="sm" onClick={goBack} aria-label="Go back"><ArrowLeft />Back</Button>
        <Input value={documentName} onChange={onDocumentNameChange} aria-label="PSD file name" className="w-40" />
        <NativeSelect value={canvasSize} onChange={onCanvasSizeChange} className="w-28" aria-label="Canvas size">
          {![512, 1024, 2048].includes(Number(canvasSize)) && <NativeSelectOption value={canvasSize}>{canvasSize} × {canvasSize}</NativeSelectOption>}
          <NativeSelectOption value="512">512 × 512</NativeSelectOption>
          <NativeSelectOption value="1024">1024 × 1024</NativeSelectOption>
          <NativeSelectOption value="2048">2048 × 2048</NativeSelectOption>
        </NativeSelect>
        <input ref={importInputRef} className="sr-only" type="file" accept=".psd,image/vnd.adobe.photoshop" onChange={onImport} disabled={importing || exporting || savingAvatar} />
        <Button type="button" variant="outline" size="sm" onClick={() => importInputRef.current?.click()} disabled={importing || exporting || savingAvatar}><FileUp />{importing ? "Reading…" : "Import"}</Button>
        <div className="flex items-center gap-1 border-l border-border pl-2" aria-label="History">
          <Button type="button" variant="ghost" size="icon-sm" onClick={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl/Cmd + Z)"><Undo2 /></Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl/Cmd + Shift + Z)"><Redo2 /></Button>
        </div>
        <span className="min-w-0 flex-1" />
        <Button variant="outline" size="sm" render={<Link href={studioHref} />}>Open studio</Button>
        {onExportAvatar && <Button type="button" variant="outline" size="sm" onClick={onExportAvatar} disabled={exporting || importing || savingAvatar}><Save />{savingAvatar ? "Saving…" : "Save to OBS"}</Button>}
        <Button type="button" size="sm" onClick={onExport} disabled={exporting || importing || savingAvatar}><Download />{exporting ? "Building…" : "Export PSD"}</Button>
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
