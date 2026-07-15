import Head from "next/head";
import { useCallback, useEffect, useRef, useState } from "react";
import PsdAvatarStage from "@/components/PsdAvatarStage";
import SiteHeader from "@/components/SiteHeader";
import StudioWorkspace from "@/components/StudioWorkspace";
import {
  AVATAR_V2_MOTION,
  MOUTH_SHAPES,
  REQUIRED_PSD_LAYERS,
  getLayerSpec,
  normalizePsdLayerName,
  pickVowelMouth,
} from "@/lib/avatar-v2";

const EMPTY_EXPRESSION = {
  mouth: "idle",
  blinkLeft: 0,
  blinkRight: 0,
  gazeX: 0,
  gazeY: 0,
  browLeft: 0,
  browRight: 0,
  x: 0,
  y: 0,
  roll: 0,
};

function clamp(value, range) {
  return Math.max(range.min, Math.min(range.max, value));
}

function scoreMap(categories = []) {
  return Object.fromEntries(categories.map(({ categoryName, score }) => [categoryName, score]));
}

function headMotion(matrix) {
  const m = matrix?.data || [];
  if (m.length < 16) return { x: 0, y: 0, roll: 0 };
  return {
    x: clamp(Math.asin(clamp(-m[2], { min: -1, max: 1 })) * AVATAR_V2_MOTION.horizontal.trackingScale, AVATAR_V2_MOTION.horizontal),
    y: clamp(Math.atan2(m[6], m[10]) * AVATAR_V2_MOTION.vertical.trackingScale, AVATAR_V2_MOTION.vertical),
    roll: clamp(Math.atan2(m[1], m[0]) * AVATAR_V2_MOTION.rotation.trackingScale, AVATAR_V2_MOTION.rotation),
  };
}

function flattenLayers(layers = [], result = []) {
  layers.forEach((layer) => {
    if (layer.children?.length) flattenLayers(layer.children, result);
    else result.push(layer);
  });
  return result;
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not read a PSD layer.")), "image/png");
  });
}

async function readAvatarPsd(file) {
  const { readPsd } = await import("ag-psd");
  const psd = readPsd(await file.arrayBuffer(), {
    skipCompositeImageData: true,
    skipThumbnail: true,
  });
  const seen = new Set();
  const unknown = [];
  const duplicates = [];
  const urls = [];
  const layers = [];

  try {
    for (const [order, layer] of flattenLayers(psd.children).entries()) {
      const name = normalizePsdLayerName(layer.name);
      if (!getLayerSpec(name)) {
        if (name) unknown.push(name);
        continue;
      }
      if (seen.has(name)) {
        duplicates.push(name);
        continue;
      }
      if (!layer.canvas) continue;

      const url = URL.createObjectURL(await canvasBlob(layer.canvas));
      urls.push(url);
      seen.add(name);
      layers.push({
        name,
        url,
        order,
        left: layer.left || 0,
        top: layer.top || 0,
        width: layer.canvas.width,
        height: layer.canvas.height,
      });
    }

    const missing = REQUIRED_PSD_LAYERS.filter((name) => !seen.has(name));
    layers.sort((left, right) => (getLayerSpec(left.name)?.z || left.order) - (getLayerSpec(right.name)?.z || right.order));
    return {
      name: file.name,
      width: psd.width,
      height: psd.height,
      layers,
      missing,
      unknown: [...new Set(unknown)],
      duplicates: [...new Set(duplicates)],
      urls,
    };
  } catch (error) {
    urls.forEach((url) => URL.revokeObjectURL(url));
    throw error;
  }
}

function revokeModel(model) {
  model?.urls?.forEach((url) => URL.revokeObjectURL(url));
}

export default function AvatarStudioV2() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const frameRef = useRef(null);
  const modelRef = useRef(null);
  const smoothRef = useRef(EMPTY_EXPRESSION);
  const mouthRef = useRef({ current: "idle", pending: "idle", count: 0 });
  const [model, setModel] = useState(null);
  const [expression, setExpression] = useState(EMPTY_EXPRESSION);
  const [status, setStatus] = useState("Load a PSD to begin");
  const [mode, setMode] = useState("manual");
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    landmarkerRef.current?.close();
    streamRef.current = null;
    landmarkerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setMode("manual");
    setStatus(modelRef.current ? "PSD ready · manual mode" : "Load a PSD to begin");
  }, []);

  useEffect(() => () => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    landmarkerRef.current?.close();
    revokeModel(modelRef.current);
  }, []);

  const readFace = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.readyState < 2) {
      frameRef.current = requestAnimationFrame(readFace);
      return;
    }

    const result = landmarker.detectForVideo(video, performance.now());
    if (result.faceBlendshapes?.length) {
      const scores = scoreMap(result.faceBlendshapes[0].categories);
      const motion = headMotion(result.facialTransformationMatrixes?.[0]);
      const gazeHorizontal = ((scores.eyeLookOutLeft || 0) + (scores.eyeLookInRight || 0) - (scores.eyeLookInLeft || 0) - (scores.eyeLookOutRight || 0)) / 2;
      const gazeVertical = ((scores.eyeLookDownLeft || 0) + (scores.eyeLookDownRight || 0) - (scores.eyeLookUpLeft || 0) - (scores.eyeLookUpRight || 0)) / 2;
      const candidateMouth = pickVowelMouth(scores);
      const mouth = mouthRef.current;

      if (candidateMouth === mouth.current) {
        mouth.pending = candidateMouth;
        mouth.count = 0;
      } else if (candidateMouth === mouth.pending) {
        mouth.count += 1;
        if (mouth.count >= AVATAR_V2_MOTION.mouthHoldFrames) {
          mouth.current = candidateMouth;
          mouth.count = 0;
        }
      } else {
        mouth.pending = candidateMouth;
        mouth.count = 1;
      }

      const target = {
        ...motion,
        mouth: mouth.current,
        blinkLeft: scores.eyeBlinkLeft || 0,
        blinkRight: scores.eyeBlinkRight || 0,
        gazeX: clamp(gazeHorizontal * AVATAR_V2_MOTION.gaze.scale, AVATAR_V2_MOTION.gaze),
        gazeY: clamp(gazeVertical * AVATAR_V2_MOTION.gaze.scale, AVATAR_V2_MOTION.gaze),
        browLeft: clamp(((scores.browDownLeft || 0) - (scores.browOuterUpLeft || 0) - (scores.browInnerUp || 0) * 0.5) * AVATAR_V2_MOTION.brow.scale, AVATAR_V2_MOTION.brow),
        browRight: clamp(((scores.browDownRight || 0) - (scores.browOuterUpRight || 0) - (scores.browInnerUp || 0) * 0.5) * AVATAR_V2_MOTION.brow.scale, AVATAR_V2_MOTION.brow),
      };
      const previous = smoothRef.current;
      const next = { mouth: target.mouth };
      Object.keys(EMPTY_EXPRESSION).filter((key) => key !== "mouth").forEach((key) => {
        next[key] = previous[key] + (target[key] - previous[key]) * AVATAR_V2_MOTION.smoothing;
      });
      smoothRef.current = next;
      setExpression(next);
      setStatus("Face found · PSD tracking live");
    } else {
      setStatus("Camera live · looking for a face");
    }
    frameRef.current = requestAnimationFrame(readFace);
  }, []);

  async function loadPsd(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsLoading(true);
    setStatus("Reading PSD layers…");
    try {
      const nextModel = await readAvatarPsd(file);
      revokeModel(modelRef.current);
      modelRef.current = nextModel;
      setModel(nextModel);
      localStorage.setItem("stream-bro-avatar-v2-last-file", file.name);
      setStatus(nextModel.missing.length ? `${nextModel.missing.length} required layers missing` : "PSD ready · manual mode");
    } catch (error) {
      setStatus(error?.message || "Could not read this PSD");
    } finally {
      setIsLoading(false);
    }
  }

  async function startCamera() {
    setIsStarting(true);
    setStatus("Loading private face tracker…");
    try {
      const [{ FaceLandmarker, FilesetResolver }, stream] = await Promise.all([
        import("@mediapipe/tasks-vision"),
        navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false,
        }),
      ]);
      streamRef.current = stream;
      const vision = await FilesetResolver.forVisionTasks("/mediapipe");
      landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "/models/face_landmarker.task" },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        minFaceDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setMode("camera");
      frameRef.current = requestAnimationFrame(readFace);
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setMode("manual");
      setStatus(error?.name === "NotAllowedError" ? "Camera blocked · manual mode works" : "Tracker unavailable · manual mode works");
    } finally {
      setIsStarting(false);
    }
  }

  function setManual(next) {
    if (mode === "camera") stopCamera();
    const value = { ...expression, ...next };
    smoothRef.current = value;
    if (next.mouth) mouthRef.current = { current: next.mouth, pending: next.mouth, count: 0 };
    setExpression(value);
  }

  return (
    <>
      <Head>
        <title>PSD Avatar Studio — Stream Bro</title>
        <meta name="description" content="Load one layered PSD and drive a smooth half-body avatar locally." />
      </Head>
      <div className="site-shell app-shell">
        <SiteHeader />
        <StudioWorkspace
          title="Avatar V2 · PSD"
          subtitle="Detailed layers · smooth tracking · A I U E O"
          actionHref="/editor/psd/avatar-v2"
          actionLabel="Open V2 PSD editor"
          status={status}
          live={mode === "camera"}
          meta={model ? `${model.layers.length} layers` : "No PSD"}
          stage={<PsdAvatarStage model={model} expression={expression} />}
          footer={<><span><b>{model ? REQUIRED_PSD_LAYERS.length - model.missing.length : 0}/{REQUIRED_PSD_LAYERS.length}</b> required layers</span><span>{expression.mouth.toUpperCase()} mouth</span></>}
          controls={<>
              <label className={`psd-upload ${isLoading ? "is-loading" : ""}`}>
                <span>{isLoading ? "Reading PSD…" : model ? "Replace PSD" : "Load avatar PSD"}</span>
                <small>Local only · PSD · RGB · 8-bit</small>
                <input type="file" accept=".psd,image/vnd.adobe.photoshop" onChange={loadPsd} disabled={isLoading} />
              </label>

              <div className="camera-card v2-camera">
                <video ref={videoRef} muted playsInline aria-label="Mirrored camera preview" />
                {mode !== "camera" && <div className="camera-empty"><span>◌</span><p>Camera is off</p></div>}
                <div className="camera-action-row">
                  {mode === "camera" ? (
                    <button className="button button-dark" onClick={stopCamera}>Stop camera</button>
                  ) : (
                    <button className="button button-dark" onClick={startCamera} disabled={isStarting || !model}>
                      {isStarting ? "Starting…" : "Start tracking"}
                    </button>
                  )}
                </div>
              </div>

              <div className="control-section">
                <div className="control-heading"><span>01</span><h2>Mouth</h2><small>{expression.mouth}</small></div>
                <div className="segmented six">
                  {MOUTH_SHAPES.map((shape) => (
                    <button key={shape} className={expression.mouth === shape ? "active" : ""} onClick={() => setManual({ mouth: shape })}>{shape}</button>
                  ))}
                </div>
              </div>

              <div className="control-section">
                <div className="control-heading"><span>02</span><h2>Eyes</h2><small>manual</small></div>
                <div className="segmented two">
                  <button className={expression.blinkLeft < 0.52 && expression.blinkRight < 0.52 ? "active" : ""} onClick={() => setManual({ blinkLeft: 0, blinkRight: 0 })}>Open</button>
                  <button className={expression.blinkLeft > 0.52 && expression.blinkRight > 0.52 ? "active" : ""} onClick={() => setManual({ blinkLeft: 1, blinkRight: 1 })}>Blink</button>
                </div>
              </div>
            </>}
        />
      </div>
    </>
  );
}
