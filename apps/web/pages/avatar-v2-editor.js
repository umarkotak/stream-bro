import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import PsdEditorWorkspace from "@/components/PsdEditorWorkspace";
import { PSD_LAYER_SPEC } from "@/lib/avatar-v2";
import { useEditorHistory } from "@/lib/use-editor-history";

const DEFAULT_SIZE = 1024;

function makeLayers(names, size = DEFAULT_SIZE) {
  return names.map((name) => ({
    name,
    image: null,
    url: "",
    naturalWidth: 0,
    naturalHeight: 0,
    x: size / 2,
    y: size / 2,
    scale: 1,
    visible: true,
  }));
}

function isAlternate(name) {
  return (name.startsWith("mouth-") && name !== "mouth-idle") || name.startsWith("eye-lid-closed-");
}

function previewVisible(name, selectedName) {
  if (name.startsWith("mouth-")) {
    return selectedName.startsWith("mouth-") ? name === selectedName : name === "mouth-idle";
  }
  if (name === "eye-lid-closed-left") return selectedName === name;
  if (name === "eye-lid-closed-right") return selectedName === name;
  if (selectedName === "eye-lid-closed-left" && (name === "eye-white-left" || name === "eye-ball-left")) return false;
  if (selectedName === "eye-lid-closed-right" && (name === "eye-white-right" || name === "eye-ball-right")) return false;
  return true;
}

function safeFileName(value) {
  return value.trim().replace(/\.psd$/i, "").replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "stream-bro-avatar";
}

function drawLayer(context, layer) {
  if (!layer.image || !layer.visible) return;
  const width = Math.max(1, Math.round(layer.naturalWidth * layer.scale));
  const height = Math.max(1, Math.round(layer.naturalHeight * layer.scale));
  context.drawImage(layer.image, Math.round(layer.x - width / 2), Math.round(layer.y - height / 2), width, height);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode this image"));
    image.src = url;
  });
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function PsdTemplateEditor({
  layerSpecs = PSD_LAYER_SPEC.filter((layer) => layer.required),
  version = "V2",
  studioHref = "/studio/avatar-v2",
  defaultDocumentName = "stream-bro-avatar-v2",
  alternate = isAlternate,
  preview = previewVisible,
}) {
  const layerNames = layerSpecs.map((layer) => layer.name);
  const getSpec = (name) => layerSpecs.find((layer) => layer.name === name);
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const layersRef = useRef([]);
  const urlsRef = useRef(new Set());
  const [canvasSize, setCanvasSize] = useState(DEFAULT_SIZE);
  const history = useEditorHistory(makeLayers(layerNames));
  const layers = history.value;
  const [selectedName, setSelectedName] = useState(layerNames[0]);
  const [documentName, setDocumentName] = useState(defaultDocumentName);
  const [status, setStatus] = useState("Select a layer, then paste or choose a PNG");
  const [isExporting, setIsExporting] = useState(false);

  layersRef.current = layers;
  const selected = layers.find((layer) => layer.name === selectedName);
  const filledCount = layers.filter((layer) => layer.image).length;

  useEffect(() => () => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const insertBlob = useCallback(async (blob) => {
    if (!blob?.type?.startsWith("image/")) {
      setStatus("Clipboard does not contain an image");
      return;
    }

    const url = URL.createObjectURL(blob);
    urlsRef.current.add(url);
    try {
      const image = await loadImage(url);
      history.commit((current) => current.map((layer) => {
        if (layer.name !== selectedName) return layer;
        const scale = Math.min(canvasSize / image.naturalWidth, canvasSize / image.naturalHeight, 1);
        return {
          ...layer,
          image,
          url,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          x: canvasSize / 2,
          y: canvasSize / 2,
          scale,
          visible: true,
        };
      }));
      setStatus(`${selectedName} image added · drag to position`);
    } catch {
      urlsRef.current.delete(url);
      URL.revokeObjectURL(url);
      setStatus("Could not read this image");
    }
  }, [canvasSize, selectedName]);

  useEffect(() => {
    function pasteImage(event) {
      const item = [...(event.clipboardData?.items || [])].find((entry) => entry.type.startsWith("image/"));
      if (!item) return;
      event.preventDefault();
      insertBlob(item.getAsFile());
    }
    window.addEventListener("paste", pasteImage);
    return () => window.removeEventListener("paste", pasteImage);
  }, [insertBlob]);

  async function readClipboard() {
    try {
      const clipboard = await navigator.clipboard.read();
      for (const item of clipboard) {
        const type = item.types.find((value) => value.startsWith("image/"));
        if (type) {
          await insertBlob(await item.getType(type));
          return;
        }
      }
      setStatus("Clipboard does not contain an image");
    } catch {
      setStatus("Press Ctrl+V or Cmd+V to paste the image");
    }
  }

  function updateLayer(name, patch) {
    history.commit((current) => current.map((layer) => layer.name === name ? { ...layer, ...patch } : layer));
  }

  function removeSelected() {
    if (!selected?.image) return;
    updateLayer(selectedName, { image: null, url: "", naturalWidth: 0, naturalHeight: 0, scale: 1 });
    setStatus(`${selectedName} cleared`);
  }

  function fitSelected() {
    if (!selected?.image) return;
    updateLayer(selectedName, {
      x: canvasSize / 2,
      y: canvasSize / 2,
      scale: Math.min(canvasSize / selected.naturalWidth, canvasSize / selected.naturalHeight, 1),
    });
  }

  function changeCanvasSize(event) {
    const nextSize = Number(event.target.value);
    const ratio = nextSize / canvasSize;
    history.reset(layers.map((layer) => ({
      ...layer,
      x: layer.x * ratio,
      y: layer.y * ratio,
      scale: layer.scale * ratio,
    })));
    setCanvasSize(nextSize);
  }

  function startDrag(event, layer) {
    event.preventDefault();
    setSelectedName(layer.name);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: layer.x, y: layer.y, name: layer.name, before: layersRef.current };
  }

  function moveDrag(event) {
    const drag = dragRef.current;
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!drag || !bounds || drag.pointerId !== event.pointerId) return;
    history.replace((current) => current.map((layer) => layer.name === drag.name ? {
      ...layer,
      x: Math.round(Math.max(-canvasSize, Math.min(canvasSize * 2, drag.x + ((event.clientX - drag.startX) / bounds.width) * canvasSize))),
      y: Math.round(Math.max(-canvasSize, Math.min(canvasSize * 2, drag.y + ((event.clientY - drag.startY) / bounds.height) * canvasSize))),
    } : layer));
  }

  function stopDrag(event) {
    if (dragRef.current?.pointerId === event.pointerId) {
      history.checkpoint(dragRef.current.before);
      dragRef.current = null;
    }
  }

  async function exportPsd() {
    setIsExporting(true);
    setStatus("Building layered PSD…");
    try {
      const { writePsd } = await import("ag-psd");
      const composite = document.createElement("canvas");
      composite.width = canvasSize;
      composite.height = canvasSize;
      const compositeContext = composite.getContext("2d");
      if (!compositeContext) throw new Error("Canvas is not available in this browser");
      [...layers]
        .sort((left, right) => (getSpec(left.name)?.z || 0) - (getSpec(right.name)?.z || 0))
        .filter((layer) => !alternate(layer.name))
        .forEach((layer) => drawLayer(compositeContext, layer));

      const children = [...layers]
        .sort((left, right) => (getSpec(right.name)?.z || 0) - (getSpec(left.name)?.z || 0))
        .map((layer) => {
          const item = { name: layer.name, hidden: !layer.visible || alternate(layer.name) };
          if (!layer.image) return item;
          const width = Math.max(1, Math.round(layer.naturalWidth * layer.scale));
          const height = Math.max(1, Math.round(layer.naturalHeight * layer.scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          if (!context) throw new Error(`Could not create ${layer.name}`);
          context.drawImage(layer.image, 0, 0, width, height);
          return {
            ...item,
            left: Math.round(layer.x - width / 2),
            top: Math.round(layer.y - height / 2),
            canvas,
          };
        });

      const buffer = writePsd(
        { width: canvasSize, height: canvasSize, canvas: composite, children },
        { generateThumbnail: false, trimImageData: true, noBackground: true },
      );
      const url = URL.createObjectURL(new Blob([buffer], { type: "image/vnd.adobe.photoshop" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFileName(documentName)}.psd`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      setStatus(`PSD exported · ${filledCount}/${layers.length} layers have art`);
    } catch (error) {
      setStatus(`Export failed · ${error?.message || "Could not build PSD"}`);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Avatar {version} PSD Editor — Stream Bro</title>
        <meta name="description" content="Paste avatar parts into required layers, position them, and export a Stream Bro PSD." />
      </Head>
      <div className="site-shell app-shell">
        <SiteHeader />
        <PsdEditorWorkspace
          version={version}
          studioHref={studioHref}
          documentName={documentName}
          onDocumentNameChange={(event) => setDocumentName(event.target.value)}
          canvasSize={canvasSize}
          onCanvasSizeChange={changeCanvasSize}
          filledCount={filledCount}
          layerCount={layers.length}
          exporting={isExporting}
          onExport={exportPsd}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={history.undo}
          onRedo={history.redo}
          status={status}
          selectedName={selectedName}
          layerList={<div className="editor-layers" aria-label="PSD layers">
              <header><b>Required layers</b><small>Front → Back</small></header>
              {[...layers].sort((left, right) => (getSpec(right.name)?.z || 0) - (getSpec(left.name)?.z || 0)).map((layer) => (
                <button className={`${selectedName === layer.name ? "is-active" : ""} ${layer.image ? "is-filled" : ""}`} key={layer.name} onClick={() => setSelectedName(layer.name)}>
                  <i>{layer.visible ? "◉" : "○"}</i><span>{layer.name}</span><b>{layer.image ? "ready" : "empty"}</b>
                </button>
              ))}
            </div>}
          canvas={
              <div className="editor-canvas" ref={stageRef} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
                <div className="stage-grid" />
                {[...layers].sort((left, right) => (getSpec(left.name)?.z || 0) - (getSpec(right.name)?.z || 0)).map((layer) => {
                  if (!layer.image || !layer.visible || !preview(layer.name, selectedName)) return null;
                  return (
                    <img
                      className={selectedName === layer.name ? "is-selected" : ""}
                      key={layer.name}
                      src={layer.url}
                      alt=""
                      draggable="false"
                      onPointerDown={(event) => startDrag(event, layer)}
                      style={{
                        left: `${(layer.x / canvasSize) * 100}%`,
                        top: `${(layer.y / canvasSize) * 100}%`,
                        width: `${((layer.naturalWidth * layer.scale) / canvasSize) * 100}%`,
                        zIndex: getSpec(layer.name)?.z || 1,
                      }}
                    />
                  );
                })}
                {!filledCount && <div className="editor-canvas-empty"><b>Paste your first image</b><span>Ctrl+V or Cmd+V</span></div>}
                <span className="stage-size">{canvasSize} × {canvasSize}</span>
              </div>
          }
          inspector={<div className="editor-inspector">
              <div className="inspector-title"><span>Selected layer</span><h2>{selectedName}</h2><p>{getSpec(selectedName)?.part}</p></div>
              <div className="editor-import-actions">
                <button onClick={readClipboard}>Paste image</button>
                <label>Choose PNG<input type="file" accept="image/png,image/webp,image/jpeg" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) insertBlob(file); }} /></label>
              </div>
              <div className="inspector-fields">
                <label>X<input type="number" value={Math.round(selected?.x || 0)} onChange={(event) => updateLayer(selectedName, { x: finiteNumber(event.target.value, selected?.x || 0) })} disabled={!selected?.image} /></label>
                <label>Y<input type="number" value={Math.round(selected?.y || 0)} onChange={(event) => updateLayer(selectedName, { y: finiteNumber(event.target.value, selected?.y || 0) })} disabled={!selected?.image} /></label>
                <label className="scale-field">Scale <output>{Math.round((selected?.scale || 1) * 100)}%</output><input type="range" min="0.05" max="8" step="0.01" value={selected?.scale || 1} onChange={(event) => updateLayer(selectedName, { scale: finiteNumber(event.target.value, selected?.scale || 1) })} disabled={!selected?.image} /></label>
              </div>
              <div className="editor-small-actions">
                <button onClick={fitSelected} disabled={!selected?.image}>Fit + center</button>
                <button onClick={() => updateLayer(selectedName, { visible: !selected?.visible })} disabled={!selected?.image}>{selected?.visible ? "Hide" : "Show"}</button>
                <button onClick={removeSelected} disabled={!selected?.image}>Clear</button>
              </div>
              <p className="editor-note">Tip: transparent PNGs work best. You can drag the selected image directly on the canvas.</p>
              <Link className="text-link" href={studioHref}>Open PSD Studio after export ↗</Link>
            </div>}
        />
      </div>
    </>
  );
}

export default function AvatarV2Editor() {
  return <PsdTemplateEditor />;
}
