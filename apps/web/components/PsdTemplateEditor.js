import Head from "next/head";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PsdEditorWorkspace from "@/components/PsdEditorWorkspace";
import { readNamedPsd, revokePsdModel } from "@/lib/psd-loader";
import { useEditorHistory } from "@/lib/use-editor-history";

const DEFAULT_SIZE = 1024;
const CENTER_SNAP_SCREEN_PX = 10;
const MIN_LAYER_SCALE = 0.05;
const MAX_LAYER_SCALE = 8;
const DEFAULT_LAYER_SPECS = [];

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
    rotation: 0,
    visible: true,
  }));
}

function safeFileName(value) {
  return value.trim().replace(/\.psd$/i, "").replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "creator-buddy-avatar";
}

function safeAvatarPackName(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function drawLayerImage(context, layer) {
  const width = Math.max(1, Math.round(layer.naturalWidth * layer.scale));
  const height = Math.max(1, Math.round(layer.naturalHeight * layer.scale));
  context.save();
  context.translate(layer.x, layer.y);
  context.rotate((layer.rotation || 0) * (Math.PI / 180));
  context.drawImage(layer.image, -width / 2, -height / 2, width, height);
  context.restore();
}

function drawLayer(context, layer) {
  if (!layer.image || !layer.visible) return;
  drawLayerImage(context, layer);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode this image"));
    image.src = url;
  });
}

function canvasPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not save this drawing")), "image/png");
  });
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeLayerName(value = "") {
  return value.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizeDegrees(value) {
  return ((value + 180) % 360 + 360) % 360 - 180;
}

function normalizeRadians(value) {
  return Math.atan2(Math.sin(value), Math.cos(value));
}

function rotatePoint(x, y, radians) {
  return {
    x: x * Math.cos(radians) - y * Math.sin(radians),
    y: x * Math.sin(radians) + y * Math.cos(radians),
  };
}

export function PsdTemplateEditor({
  layerSpecs = DEFAULT_LAYER_SPECS,
  version = "Avatar",
  studioHref = "/virtual-avatar/v1/studio",
  defaultDocumentName = "creator-buddy-avatar",
  alternate = () => false,
  preview = () => true,
  publicAvatarExport: PublicAvatarExport = null,
  directTransformHandles = false,
}) {
  const layerNames = useMemo(() => layerSpecs.map((layer) => layer.name), [layerSpecs]);
  const specsByName = useMemo(() => new Map(layerSpecs.map((layer) => [layer.name, layer])), [layerSpecs]);
  const initialLayers = useMemo(() => makeLayers(layerNames), [layerNames]);
  const getSpec = (name) => specsByName.get(name);
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const transformRef = useRef(null);
  const paintCanvasRef = useRef(null);
  const paintRef = useRef(null);
  const paintCommitRef = useRef(false);
  const layersRef = useRef([]);
  const urlsRef = useRef(new Set());
  const undoRef = useRef(null);
  const redoRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState(DEFAULT_SIZE);
  const history = useEditorHistory(initialLayers);
  undoRef.current = history.undo;
  redoRef.current = history.redo;
  const layers = history.value;
  const [selectedName, setSelectedName] = useState("");
  const [documentName, setDocumentName] = useState(defaultDocumentName);
  const [status, setStatus] = useState("Select a layer, then paste or choose a PNG");
  const [isSnappedX, setIsSnappedX] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [paintTool, setPaintTool] = useState("pen");
  const [brushSize, setBrushSize] = useState(16);
  const [brushColor, setBrushColor] = useState("#181915");
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isAvatarExportOpen, setIsAvatarExportOpen] = useState(false);
  const [avatarPackName, setAvatarPackName] = useState(() => safeAvatarPackName(defaultDocumentName) || "my-avatar");
  const [avatarExportProgress, setAvatarExportProgress] = useState("");
  const [savedAvatarPack, setSavedAvatarPack] = useState("");

  layersRef.current = layers;
  const selected = layers.find((layer) => layer.name === selectedName);
  const filledCount = layers.filter((layer) => layer.image).length;
  const backToFrontLayers = useMemo(
    () => [...layers].sort((left, right) => (specsByName.get(left.name)?.z || 0) - (specsByName.get(right.name)?.z || 0)),
    [layers, specsByName],
  );
  const frontToBackLayers = useMemo(() => [...backToFrontLayers].reverse(), [backToFrontLayers]);

  useEffect(() => () => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    const canvas = paintCanvasRef.current;
    if (!drawMode || !canvas || !selectedName) return;
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvasSize, canvasSize);
    if (selected?.image) drawLayerImage(context, selected);
  }, [canvasSize, drawMode, selected?.image, selected?.rotation, selected?.scale, selected?.x, selected?.y, selectedName]);

  const insertBlob = useCallback(async (blob) => {
    if (!selectedName) {
      setStatus("Select a layer first");
      return;
    }
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
          rotation: 0,
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

  useEffect(() => {
    function handleEditorShortcut(event) {
      const tagName = event.target?.tagName?.toLowerCase();
      if (["input", "select", "textarea"].includes(tagName)) return;

      if (event.key === "Escape" && drawMode) {
        event.preventDefault();
        setDrawMode(false);
        setStatus(`${selectedName} · transform mode`);
        return;
      }

      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redoRef.current?.();
        else undoRef.current?.();
      } else if (key === "y") {
        event.preventDefault();
        redoRef.current?.();
      }
    }

    window.addEventListener("keydown", handleEditorShortcut);
    return () => window.removeEventListener("keydown", handleEditorShortcut);
  }, [drawMode, selectedName]);

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

  function removeSelected(keepDrawMode = false) {
    if (!selected?.image) return;
    if (!keepDrawMode) setDrawMode(false);
    updateLayer(selectedName, { image: null, url: "", naturalWidth: 0, naturalHeight: 0, scale: 1, rotation: 0 });
    setStatus(`${selectedName} cleared${keepDrawMode ? " · blank canvas ready" : ""}`);
  }

  function fitSelected() {
    if (!selected?.image) return;
    updateLayer(selectedName, {
      x: canvasSize / 2,
      scale: Math.min(canvasSize / selected.naturalWidth, canvasSize / selected.naturalHeight, 1),
    });
  }

  function changeCanvasSize(value) {
    setDrawMode(false);
    const nextSize = Number(value?.target?.value ?? value);
    const ratio = nextSize / canvasSize;
    history.reset(layers.map((layer) => ({
      ...layer,
      x: layer.x * ratio,
      y: layer.y * ratio,
      scale: layer.scale * ratio,
    })));
    setCanvasSize(nextSize);
  }

  async function importPsd(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsImporting(true);
    setStatus("Reading layered PSD…");
    let imported = null;
    try {
      imported = await readNamedPsd(file, {
        names: layerNames,
        normalize: normalizeLayerName,
        getSpec,
      });
      const images = new Map();
      await Promise.all(imported.layers.map(async (layer) => {
        images.set(layer.name, await loadImage(layer.url));
      }));
      const importedByName = new Map(imported.layers.map((layer) => [layer.name, layer]));
      const nextSize = Math.max(imported.width, imported.height);
      const nextLayers = makeLayers(layerNames, nextSize).map((layer) => {
        const source = importedByName.get(layer.name);
        if (!source) return layer;
        return {
          ...layer,
          image: images.get(layer.name),
          url: source.url,
          naturalWidth: source.width,
          naturalHeight: source.height,
          x: source.left + source.width / 2,
          y: source.top + source.height / 2,
          scale: 1,
          rotation: 0,
          visible: true,
        };
      });

      const oldUrls = [...urlsRef.current];
      urlsRef.current = new Set(imported.urls);
      history.reset(nextLayers);
      setCanvasSize(nextSize);
      setDocumentName(file.name.replace(/\.psd$/i, "") || defaultDocumentName);
      setSelectedName("");
      setDrawMode(false);
      oldUrls.forEach((url) => URL.revokeObjectURL(url));
      const paddingNote = imported.width === imported.height ? "" : ` · padded to ${nextSize} × ${nextSize}`;
      setStatus(`PSD imported · ${imported.layers.length}/${layerNames.length} named layers${paddingNote}`);
      imported = null;
    } catch (error) {
      setStatus(`Import failed · ${error?.message || "Could not read PSD"}`);
    } finally {
      if (imported) revokePsdModel(imported);
      setIsImporting(false);
    }
  }

  function startDrag(event, layer) {
    if (layer.name !== selectedName) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsSnappedX(false);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: layer.x, y: layer.y, name: layer.name, before: layersRef.current, snappedX: false };
  }

  function stagePoint(event) {
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!bounds?.width || !bounds?.height) return null;
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvasSize,
      y: ((event.clientY - bounds.top) / bounds.height) * canvasSize,
    };
  }

  function startDirectTransform(event, layer, type, corner = null) {
    if (event.button !== 0 || layer.name !== selectedName) return;
    const point = stagePoint(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsSnappedX(false);

    if (type === "rotate") {
      transformRef.current = {
        type,
        pointerId: event.pointerId,
        name: layer.name,
        before: layersRef.current,
        lastAngle: Math.atan2(point.y - layer.y, point.x - layer.x),
        rotation: layer.rotation || 0,
      };
      setStatus(`${layer.name} · drag to rotate`);
      return;
    }

    const width = layer.naturalWidth * layer.scale;
    const height = layer.naturalHeight * layer.scale;
    const radians = (layer.rotation || 0) * (Math.PI / 180);
    const anchorOffset = rotatePoint((-corner.x * width) / 2, (-corner.y * height) / 2, radians);
    transformRef.current = {
      type,
      pointerId: event.pointerId,
      name: layer.name,
      before: layersRef.current,
      x: layer.x,
      y: layer.y,
      scale: layer.scale,
      width,
      height,
      radians,
      corner,
      anchor: {
        x: layer.x + anchorOffset.x,
        y: layer.y + anchorOffset.y,
      },
    };
    setStatus(`${layer.name} · drag a corner to resize`);
  }

  function keyboardDirectTransform(event, layer, type) {
    const direction = ["ArrowRight", "ArrowUp"].includes(event.key)
      ? 1
      : ["ArrowLeft", "ArrowDown"].includes(event.key) ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    if (type === "rotate") {
      const step = event.shiftKey ? 15 : 1;
      updateLayer(layer.name, { rotation: normalizeDegrees((layer.rotation || 0) + direction * step) });
      return;
    }
    const step = event.shiftKey ? 0.1 : 0.01;
    updateLayer(layer.name, { scale: clamp(layer.scale + direction * step, MIN_LAYER_SCALE, MAX_LAYER_SCALE) });
  }

  function selectLayer(name) {
    setIsSnappedX(false);
    setDrawMode(false);
    setSelectedName(name);
    const layer = layersRef.current.find((item) => item.name === name);
    setStatus(layer?.image ? `${name} selected · transform or paint` : `${name} selected · paste or paint from blank`);
  }

  function canvasPoint(event) {
    const canvas = paintCanvasRef.current;
    const bounds = canvas?.getBoundingClientRect();
    if (!canvas || !bounds || !bounds.width || !bounds.height) return null;
    return {
      x: Math.max(0, Math.min(canvas.width, ((event.clientX - bounds.left) / bounds.width) * canvas.width)),
      y: Math.max(0, Math.min(canvas.height, ((event.clientY - bounds.top) / bounds.height) * canvas.height)),
    };
  }

  function paintSegment(from, to) {
    const context = paintCanvasRef.current?.getContext("2d");
    if (!context) return;
    context.save();
    context.globalCompositeOperation = paintTool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = brushColor;
    context.lineWidth = brushSize;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    if (to.x === from.x && to.y === from.y) {
      context.arc(from.x, from.y, brushSize / 2, 0, Math.PI * 2);
      context.fillStyle = brushColor;
      context.fill();
    } else {
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }
    context.restore();
  }

  function startPaint(event) {
    if (!drawMode || !selectedName || paintCommitRef.current || event.button !== 0) return;
    const point = canvasPoint(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    paintRef.current = { pointerId: event.pointerId, point };
    paintSegment(point, point);
  }

  function movePaint(event) {
    const paint = paintRef.current;
    if (!paint || paint.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const samples = event.nativeEvent.getCoalescedEvents?.() || [event.nativeEvent];
    samples.forEach((sample) => {
      const point = canvasPoint(sample);
      if (!point) return;
      paintSegment(paint.point, point);
      paint.point = point;
    });
  }

  async function stopPaint(event) {
    const paint = paintRef.current;
    const canvas = paintCanvasRef.current;
    if (!paint || paint.pointerId !== event.pointerId || !canvas || paintCommitRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    paintRef.current = null;
    paintCommitRef.current = true;
    const layerName = selectedName;
    let url = "";
    setStatus(`${layerName} · saving stroke…`);
    try {
      url = URL.createObjectURL(await canvasPngBlob(canvas));
      urlsRef.current.add(url);
      const image = await loadImage(url);
      history.commit((current) => current.map((layer) => layer.name === layerName ? {
        ...layer,
        image,
        url,
        naturalWidth: canvasSize,
        naturalHeight: canvasSize,
        x: canvasSize / 2,
        y: canvasSize / 2,
        scale: 1,
        rotation: 0,
        visible: true,
      } : layer));
      setStatus(`${layerName} drawing updated · undo is available`);
    } catch (error) {
      if (url) {
        urlsRef.current.delete(url);
        URL.revokeObjectURL(url);
      }
      setStatus(error?.message || "Could not save this drawing");
    } finally {
      paintCommitRef.current = false;
    }
  }

  function setEditorMode(mode) {
    if (mode === "paint" && !selectedName) return;
    const next = mode === "paint";
    setDrawMode(next);
    setStatus(next ? `${selectedName} · paint on the canvas` : `${selectedName || "No layer"} · transform mode`);
  }

  function moveDrag(event) {
    const drag = dragRef.current;
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!drag || !bounds || drag.pointerId !== event.pointerId) return;
    const rawX = Math.max(-canvasSize, Math.min(canvasSize * 2, drag.x + ((event.clientX - drag.startX) / bounds.width) * canvasSize));
    const nextY = Math.max(-canvasSize, Math.min(canvasSize * 2, drag.y + ((event.clientY - drag.startY) / bounds.height) * canvasSize));
    const centerX = canvasSize / 2;
    const snapDistance = (CENTER_SNAP_SCREEN_PX / bounds.width) * canvasSize;
    const snappedX = Math.abs(rawX - centerX) <= snapDistance;
    if (drag.snappedX !== snappedX) {
      drag.snappedX = snappedX;
      setIsSnappedX(snappedX);
    }
    history.replace((current) => current.map((layer) => layer.name === drag.name ? {
      ...layer,
      x: Math.round(snappedX ? centerX : rawX),
      y: Math.round(nextY),
    } : layer));
  }

  function moveDirectTransform(event) {
    const interaction = transformRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    const point = stagePoint(event);
    if (!point) return;
    event.preventDefault();

    if (interaction.type === "rotate") {
      const layer = layersRef.current.find((item) => item.name === interaction.name);
      if (!layer) return;
      const angle = Math.atan2(point.y - layer.y, point.x - layer.x);
      const delta = normalizeRadians(angle - interaction.lastAngle) * (180 / Math.PI);
      interaction.lastAngle = angle;
      interaction.rotation = normalizeDegrees(interaction.rotation + delta);
      const rotation = event.shiftKey
        ? Math.round(interaction.rotation / 15) * 15
        : interaction.rotation;
      history.replace((current) => current.map((item) => item.name === interaction.name ? {
        ...item,
        rotation,
      } : item));
      return;
    }

    const pointerFromAnchor = {
      x: point.x - interaction.anchor.x,
      y: point.y - interaction.anchor.y,
    };
    const localPointer = rotatePoint(pointerFromAnchor.x, pointerFromAnchor.y, -interaction.radians);
    const baseX = interaction.corner.x * interaction.width;
    const baseY = interaction.corner.y * interaction.height;
    const scaleFactor = ((localPointer.x * baseX) + (localPointer.y * baseY)) / ((baseX * baseX) + (baseY * baseY));
    const scale = clamp(interaction.scale * scaleFactor, MIN_LAYER_SCALE, MAX_LAYER_SCALE);
    const appliedFactor = scale / interaction.scale;
    const centerOffset = rotatePoint(
      (interaction.corner.x * interaction.width * appliedFactor) / 2,
      (interaction.corner.y * interaction.height * appliedFactor) / 2,
      interaction.radians,
    );

    history.replace((current) => current.map((item) => item.name === interaction.name ? {
      ...item,
      x: interaction.anchor.x + centerOffset.x,
      y: interaction.anchor.y + centerOffset.y,
      scale,
    } : item));
  }

  function movePointerInteraction(event) {
    moveDrag(event);
    moveDirectTransform(event);
  }

  function stopPointerInteraction(event) {
    if (dragRef.current?.pointerId === event.pointerId) {
      history.checkpoint(dragRef.current.before);
      dragRef.current = null;
      setIsSnappedX(false);
    }
    if (transformRef.current?.pointerId === event.pointerId) {
      const interaction = transformRef.current;
      history.checkpoint(interaction.before);
      transformRef.current = null;
      const layer = layersRef.current.find((item) => item.name === interaction.name);
      if (layer) {
        setStatus(interaction.type === "rotate"
          ? `${layer.name} · rotation ${Math.round(layer.rotation || 0)}°`
          : `${layer.name} · scale ${Math.round(layer.scale * 100)}%`);
      }
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
          const radians = (layer.rotation || 0) * (Math.PI / 180);
          const outputWidth = Math.max(1, Math.ceil(Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians))));
          const outputHeight = Math.max(1, Math.ceil(Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians))));
          const canvas = document.createElement("canvas");
          canvas.width = outputWidth;
          canvas.height = outputHeight;
          const context = canvas.getContext("2d");
          if (!context) throw new Error(`Could not create ${layer.name}`);
          context.translate(outputWidth / 2, outputHeight / 2);
          context.rotate(radians);
          context.drawImage(layer.image, -width / 2, -height / 2, width, height);
          return {
            ...item,
            left: Math.round(layer.x - outputWidth / 2),
            top: Math.round(layer.y - outputHeight / 2),
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

  function resetAvatarExport() {
    setSavedAvatarPack("");
    setAvatarExportProgress("");
  }

  function openAvatarExport() {
    resetAvatarExport();
    setIsAvatarExportOpen(true);
  }

  async function saveAvatarPack() {
    const pack = safeAvatarPackName(avatarPackName);
    const exportLayers = layers.filter((layer) => layer.image);
    if (!pack) {
      setAvatarExportProgress("Enter a pack name.");
      return;
    }
    if (!exportLayers.length) {
      setAvatarExportProgress("Add art to at least one layer.");
      return;
    }

    setIsSavingAvatar(true);
    setSavedAvatarPack("");
    setStatus(`Saving ${pack} for OBS…`);
    try {
      for (let index = 0; index < exportLayers.length; index += 1) {
        const layer = exportLayers[index];
        setAvatarExportProgress(`Saving ${index + 1}/${exportLayers.length} · ${layer.name}`);
        const canvas = document.createElement("canvas");
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas is not available in this browser");
        drawLayerImage(context, layer);
        const dataUrl = await new Promise((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error(`Could not render ${layer.name}`));
              return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error(`Could not read ${layer.name}`));
            reader.readAsDataURL(blob);
          }, "image/png");
        });
        const response = await fetch("/api/avatar-assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pack, filename: layer.name, dataUrl }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || `Could not save ${layer.name}`);
      }

      const syncResponse = await fetch("/api/avatar-assets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack, files: exportLayers.map((layer) => layer.name) }),
      });
      const syncResult = await syncResponse.json().catch(() => ({}));
      if (!syncResponse.ok) throw new Error(syncResult.error || "Could not update the avatar pack");

      try {
        const storageKey = "creator-buddy-overlay-config-v1";
        const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
        localStorage.setItem(storageKey, JSON.stringify({ ...saved, pack }));
      } catch {}

      setSavedAvatarPack(pack);
      setAvatarExportProgress(`${exportLayers.length} PNG layers saved.`);
      setStatus(`${pack} saved to public/avatar · ready in OBS Overlay`);
    } catch (error) {
      setAvatarExportProgress(`Save failed · ${error?.message || "Could not save avatar"}`);
      setStatus(`OBS export failed · ${error?.message || "Could not save avatar"}`);
    } finally {
      setIsSavingAvatar(false);
    }
  }

  return (
    <>
      <Head>
        <title>{`Avatar ${version} PSD Editor — Creator Buddy`}</title>
        <meta name="description" content="Paste avatar parts into required layers, position them, and export a Creator Buddy PSD." />
      </Head>
      <PsdEditorWorkspace
        studioHref={studioHref}
        documentName={documentName}
        onDocumentNameChange={(event) => setDocumentName(event.target.value)}
        canvasSize={canvasSize}
        onCanvasSizeChange={changeCanvasSize}
        importing={isImporting}
        onImport={importPsd}
        exporting={isExporting}
        onExport={exportPsd}
        savingAvatar={isSavingAvatar}
        onExportAvatar={PublicAvatarExport ? openAvatarExport : undefined}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        status={status}
        selectedName={selectedName || "No layer selected"}
        mode={drawMode ? "paint" : "transform"}
        tools={
          <div className="editor-tools-panel">
            <div className="editor-active-layer">
              <span>Active layer</span>
              <h2>{selectedName || "None selected"}</h2>
              <p>{selectedName ? getSpec(selectedName)?.part : "Choose a layer on the right to begin."}</p>
              {selectedName && <small>{selected?.image ? "Artwork loaded" : "Blank layer · paint ready"}</small>}
            </div>

            <div className="editor-mode-switch" role="group" aria-label="Editor mode">
              <button className={!drawMode ? "is-active" : ""} onClick={() => setEditorMode("transform")}>Transform</button>
              <button className={drawMode ? "is-active" : ""} onClick={() => setEditorMode("paint")} disabled={!selectedName}>Paint</button>
            </div>

            {!selectedName ? (
              <div className="editor-tool-empty">
                <b>Pick a layer</b>
                <span>Layers are on the right. Select one before adding art or drawing.</span>
              </div>
            ) : (
              <>
                <section className="editor-tool-section">
                  <header><span>Layer artwork</span></header>
                  <div className="editor-import-actions">
                    <button onClick={readClipboard} disabled={drawMode}>Paste image</button>
                    <label className={drawMode ? "is-disabled" : ""}>Choose image<input type="file" accept="image/png,image/webp,image/jpeg" disabled={drawMode} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) insertBlob(file); }} /></label>
                  </div>
                  {drawMode && <small className="editor-inline-help">Switch to Transform to replace the layer image.</small>}
                </section>

                {drawMode ? (
                  <section className="editor-tool-section editor-paint-controls">
                    <header><span>Brush</span><b>No image needed</b></header>
                    <div className="editor-brush-switch" role="group" aria-label="Paint tool">
                      <button className={paintTool === "pen" ? "is-active" : ""} onClick={() => setPaintTool("pen")}>Pen</button>
                      <button className={paintTool === "eraser" ? "is-active" : ""} onClick={() => setPaintTool("eraser")}>Eraser</button>
                    </div>
                    <label className="editor-brush-size"><span>Size</span><output>{brushSize}px</output><input type="range" min="1" max="128" step="1" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} /></label>
                    <label className="editor-brush-color"><span>Color</span><input type="color" value={brushColor} onChange={(event) => setBrushColor(event.target.value)} disabled={paintTool === "eraser"} /></label>
                    <button className="editor-clear-action" onClick={() => removeSelected(true)} disabled={!selected?.image}>Clear layer</button>
                  </section>
                ) : (
                  <section className="editor-tool-section">
                    <header><span>Transform</span><b>Selected layer</b></header>
                    <div className="inspector-fields">
                      <label>X<input type="number" value={Math.round(selected?.x || 0)} onChange={(event) => updateLayer(selectedName, { x: finiteNumber(event.target.value, selected?.x || 0) })} disabled={!selected?.image} /></label>
                      <label>Y<input type="number" value={Math.round(selected?.y || 0)} onChange={(event) => updateLayer(selectedName, { y: finiteNumber(event.target.value, selected?.y || 0) })} disabled={!selected?.image} /></label>
                      <label className="scale-field">Scale <output>{Math.round((selected?.scale || 1) * 100)}%</output><input type="range" min="0.05" max="8" step="0.01" value={selected?.scale || 1} onChange={(event) => updateLayer(selectedName, { scale: finiteNumber(event.target.value, selected?.scale || 1) })} disabled={!selected?.image} /></label>
                      <label className="rotation-field">Rotation <output>{Math.round(selected?.rotation || 0)}°</output><input type="range" min="-180" max="180" step="1" value={selected?.rotation || 0} onChange={(event) => updateLayer(selectedName, { rotation: finiteNumber(event.target.value, selected?.rotation || 0) })} disabled={!selected?.image} /></label>
                    </div>
                    <div className="editor-small-actions">
                      <button onClick={fitSelected} disabled={!selected?.image}>Fit + center</button>
                      <button onClick={() => updateLayer(selectedName, { visible: !selected?.visible })} disabled={!selected?.image}>{selected?.visible ? "Hide" : "Show"}</button>
                      <button onClick={() => removeSelected(false)} disabled={!selected?.image}>Clear</button>
                    </div>
                  </section>
                )}
              </>
            )}

            <div className="editor-tool-tip">
              <b>{drawMode ? "Paint directly" : directTransformHandles ? "Move, resize, rotate" : "Move freely"}</b>
              <span>{drawMode
                ? "Other layers stay faint for positioning. Each stroke can be undone."
                : directTransformHandles
                  ? "Drag art to move. Pull a corner to resize. Drag the top control to rotate."
                  : "Drag the selected art. X snaps to center; Y stays free."}</span>
            </div>
          </div>
        }
        canvas={
          <div className="editor-canvas" ref={stageRef} onPointerMove={movePointerInteraction} onPointerUp={stopPointerInteraction} onPointerCancel={stopPointerInteraction}>
            <div className="stage-grid" />
            {isSnappedX && <div className="editor-center-guide" aria-hidden="true" />}
            {backToFrontLayers.map((layer) => {
              if (drawMode && layer.name === selectedName) return null;
              if (!layer.image || !layer.visible || !preview(layer.name, selectedName)) return null;
              return (
                <img
                  className={drawMode ? "is-paint-reference" : selectedName === layer.name ? "is-selected is-editable" : ""}
                  key={layer.name}
                  src={layer.url}
                  alt=""
                  draggable="false"
                  onPointerDown={selectedName === layer.name ? (event) => startDrag(event, layer) : undefined}
                  style={{
                    left: `${(layer.x / canvasSize) * 100}%`,
                    top: `${(layer.y / canvasSize) * 100}%`,
                    width: `${((layer.naturalWidth * layer.scale) / canvasSize) * 100}%`,
                    transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg)`,
                    zIndex: getSpec(layer.name)?.z || 1,
                  }}
                />
              );
            })}
            {directTransformHandles && !drawMode && selected?.image && selected.visible && (
              <div
                className="editor-transform-box"
                aria-label={`Transform ${selected.name}`}
                style={{
                  left: `${(selected.x / canvasSize) * 100}%`,
                  top: `${(selected.y / canvasSize) * 100}%`,
                  width: `${((selected.naturalWidth * selected.scale) / canvasSize) * 100}%`,
                  height: `${((selected.naturalHeight * selected.scale) / canvasSize) * 100}%`,
                  transform: `translate(-50%, -50%) rotate(${selected.rotation || 0}deg)`,
                }}
              >
                <span className="editor-rotate-stem" aria-hidden="true" />
                <button
                  type="button"
                  className="editor-rotate-handle"
                  aria-label={`Rotate ${selected.name}`}
                  title="Drag to rotate. Hold Shift to snap to 15°."
                  onPointerDown={(event) => startDirectTransform(event, selected, "rotate")}
                  onKeyDown={(event) => keyboardDirectTransform(event, selected, "rotate")}
                >
                  ↻
                </button>
                {[
                  ["nw", -1, -1],
                  ["ne", 1, -1],
                  ["se", 1, 1],
                  ["sw", -1, 1],
                ].map(([position, x, y]) => (
                  <button
                    type="button"
                    className={`editor-resize-handle is-${position}`}
                    aria-label={`Resize ${selected.name} from ${position.toUpperCase()} corner`}
                    title="Drag to resize"
                    key={position}
                    onPointerDown={(event) => startDirectTransform(event, selected, "resize", { x, y })}
                    onKeyDown={(event) => keyboardDirectTransform(event, selected, "resize")}
                  />
                ))}
              </div>
            )}
            {drawMode && selectedName && <canvas
              ref={paintCanvasRef}
              className={`editor-paint-canvas is-${paintTool}`}
              aria-label={`Draw directly on ${selectedName}`}
              onPointerDown={startPaint}
              onPointerMove={movePaint}
              onPointerUp={stopPaint}
              onPointerCancel={stopPaint}
              onLostPointerCapture={stopPaint}
              onContextMenu={(event) => event.preventDefault()}
            />}
            {!filledCount && !drawMode && <div className="editor-canvas-empty"><b>Your canvas is empty</b><span>Select a layer, then paste or paint</span></div>}
          </div>
        }
        layerList={
          <div className="editor-layers">
            <header><div><b>Layers</b><small>Front to back</small></div><span>Visibility</span></header>
            <div className="editor-layer-stack">
              {frontToBackLayers.map((layer) => (
                <div className={`editor-layer-row ${selectedName === layer.name ? "is-active" : ""} ${layer.image ? "is-filled" : ""}`} key={layer.name}>
                  <button className="editor-layer-visibility" onClick={() => updateLayer(layer.name, { visible: !layer.visible })} aria-label={`${layer.visible ? "Hide" : "Show"} ${layer.name}`}>{layer.visible ? "●" : "○"}</button>
                  <button className="editor-layer-select" onClick={() => selectLayer(layer.name)} aria-pressed={selectedName === layer.name}>
                    <span className="editor-layer-thumb">{layer.image ? <img src={layer.url} alt="" /> : <i />}</span>
                    <span className="editor-layer-name"><b>{layer.name}</b><small>{layer.image ? "Artwork" : "Empty"}</small></span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        }
      />
      {PublicAvatarExport && isAvatarExportOpen && (
        <PublicAvatarExport
          saving={isSavingAvatar}
          packName={avatarPackName}
          onPackNameChange={(value) => setAvatarPackName(safeAvatarPackName(value))}
          progress={avatarExportProgress}
          savedPack={savedAvatarPack}
          filledCount={filledCount}
          totalLayers={layers.length}
          onConfirm={saveAvatarPack}
          onReset={resetAvatarExport}
          onClose={() => setIsAvatarExportOpen(false)}
        />
      )}
    </>
  );
}
