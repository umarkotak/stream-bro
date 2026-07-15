import Head from "next/head";
import { useCallback, useEffect, useRef, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import StudioWorkspace from "@/components/StudioWorkspace";
import V1PsdAvatarStage from "@/components/V1PsdAvatarStage";
import { AVATAR_MOTION_CONFIG } from "@/lib/avatar";
import { V1_PSD_LAYER_NAMES, getV1PsdLayerSpec, normalizeV1PsdLayerName } from "@/lib/avatar-v1-psd";
import { readNamedPsd, revokePsdModel } from "@/lib/psd-loader";

const INITIAL = { eyes: "open", mouth: "idle", x: 0, y: 0, roll: 0 };

function clamp(value, range) {
  return Math.max(range.min, Math.min(range.max, value));
}

function scoreMap(categories = []) {
  return Object.fromEntries(categories.map(({ categoryName, score }) => [categoryName, score]));
}

function getMotion(matrix) {
  const m = matrix?.data || [];
  if (m.length < 16) return { x: 0, y: 0, roll: 0 };
  return {
    x: clamp(Math.asin(clamp(-m[2], { min: -1, max: 1 })) * AVATAR_MOTION_CONFIG.horizontal.trackingScale, AVATAR_MOTION_CONFIG.horizontal),
    y: clamp(Math.atan2(m[6], m[10]) * AVATAR_MOTION_CONFIG.vertical.trackingScale, AVATAR_MOTION_CONFIG.vertical),
    roll: clamp(Math.atan2(m[1], m[0]) * AVATAR_MOTION_CONFIG.rotation.trackingScale, AVATAR_MOTION_CONFIG.rotation),
  };
}

export default function AvatarV1PsdStudio() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const frameRef = useRef(null);
  const modelRef = useRef(null);
  const smoothRef = useRef({ x: 0, y: 0, roll: 0 });
  const [model, setModel] = useState(null);
  const [expression, setExpression] = useState(INITIAL);
  const [status, setStatus] = useState("Load a V1 PSD");
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
    setStatus(modelRef.current ? "PSD ready · manual mode" : "Load a V1 PSD");
  }, []);

  useEffect(() => () => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    landmarkerRef.current?.close();
    revokePsdModel(modelRef.current);
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
      const blink = ((scores.eyeBlinkLeft || 0) + (scores.eyeBlinkRight || 0)) / 2;
      const jaw = scores.jawOpen || 0;
      const target = getMotion(result.facialTransformationMatrixes?.[0]);
      const current = smoothRef.current;
      const smooth = {
        x: current.x + (target.x - current.x) * AVATAR_MOTION_CONFIG.smoothing,
        y: current.y + (target.y - current.y) * AVATAR_MOTION_CONFIG.smoothing,
        roll: current.roll + (target.roll - current.roll) * AVATAR_MOTION_CONFIG.smoothing,
      };
      smoothRef.current = smooth;
      setExpression({
        eyes: blink > 0.48 ? "closed" : "open",
        mouth: jaw > 0.58 ? "wide" : jaw > 0.32 ? "medium" : jaw > 0.12 ? "small" : "idle",
        ...smooth,
      });
      setStatus("Face found · tracking live");
    } else setStatus("Camera live · looking for a face");
    frameRef.current = requestAnimationFrame(readFace);
  }, []);

  async function loadPsd(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsLoading(true);
    setStatus("Reading PSD…");
    try {
      const next = await readNamedPsd(file, {
        names: V1_PSD_LAYER_NAMES,
        normalize: normalizeV1PsdLayerName,
        getSpec: getV1PsdLayerSpec,
      });
      revokePsdModel(modelRef.current);
      modelRef.current = next;
      setModel(next);
      setStatus(next.missing.length ? `${next.missing.length} layers missing` : "PSD ready · manual mode");
    } catch (error) {
      setStatus(error?.message || "Could not read PSD");
    } finally {
      setIsLoading(false);
    }
  }

  async function startCamera() {
    setIsStarting(true);
    setStatus("Loading tracker…");
    try {
      const [{ FaceLandmarker, FilesetResolver }, stream] = await Promise.all([
        import("@mediapipe/tasks-vision"),
        navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: "user" }, audio: false }),
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
      setStatus(error?.name === "NotAllowedError" ? "Camera blocked · manual works" : "Tracker unavailable · manual works");
    } finally {
      setIsStarting(false);
    }
  }

  function setManual(next) {
    if (mode === "camera") stopCamera();
    setExpression((current) => ({ ...current, ...next }));
  }

  return (
    <>
      <Head><title>Avatar V1 PSD Studio — Stream Bro</title></Head>
      <div className="site-shell app-shell"><SiteHeader />
        <StudioWorkspace
          title="Avatar V1 · PSD"
          subtitle="8 PSD layers · simple tracking"
          actionHref="/editor/psd/avatar-v1"
          actionLabel="Open V1 PSD editor"
          status={status}
          live={mode === "camera"}
          meta={model ? `${model.layers.length}/8 layers` : "No PSD"}
          stage={<V1PsdAvatarStage model={model} expression={expression} />}
          footer={<><span><b>{model ? 8 - model.missing.length : 0}/8</b> required layers</span><span>{expression.eyes} · {expression.mouth}</span></>}
          controls={<>
              <label className={`psd-upload ${isLoading ? "is-loading" : ""}`}><span>{isLoading ? "Reading…" : model ? "Replace PSD" : "Load V1 PSD"}</span><small>Exact layer names include .png</small><input type="file" accept=".psd,image/vnd.adobe.photoshop" onChange={loadPsd} disabled={isLoading} /></label>
              <div className="camera-card"><video ref={videoRef} muted playsInline />{mode !== "camera" && <div className="camera-empty"><span>◌</span><p>Camera off</p></div>}<div className="camera-action-row">{mode === "camera" ? <button className="button button-dark" onClick={stopCamera}>Stop camera</button> : <button className="button button-dark" onClick={startCamera} disabled={!model || isStarting}>{isStarting ? "Starting…" : "Start tracking"}</button>}</div></div>
              <div className="compact-control-block"><label>Eyes <b>{expression.eyes}</b></label><div className="segmented two"><button className={expression.eyes === "open" ? "active" : ""} onClick={() => setManual({ eyes: "open" })}>Open</button><button className={expression.eyes === "closed" ? "active" : ""} onClick={() => setManual({ eyes: "closed" })}>Blink</button></div></div>
              <div className="compact-control-block"><label>Mouth <b>{expression.mouth}</b></label><div className="segmented four">{["idle", "small", "medium", "wide"].map((mouth) => <button key={mouth} className={expression.mouth === mouth ? "active" : ""} onClick={() => setManual({ mouth })}>{mouth}</button>)}</div></div>
              <div className="compact-layer-status">{V1_PSD_LAYER_NAMES.map((name) => <span className={model?.layers.some((layer) => layer.name === name) ? "is-found" : ""} key={name}>{name}</span>)}</div>
            </>}
        />
      </div>
    </>
  );
}
