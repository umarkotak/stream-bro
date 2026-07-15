import Head from "next/head";
import { useCallback, useEffect, useRef, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import AvatarStage from "@/components/AvatarStage";
import StudioWorkspace from "@/components/StudioWorkspace";
import { AVATAR_FILES, AVATAR_MOTION_CONFIG } from "@/lib/avatar";

const INITIAL_EXPRESSION = { eyes: "open", mouth: "idle", x: 0, y: 0, roll: 0 };

function scoreMap(categories = []) {
  return Object.fromEntries(categories.map(({ categoryName, score }) => [categoryName, score]));
}

function clamp(value, range) {
  return Math.max(range.min, Math.min(range.max, value));
}

function getHeadMotion(matrix) {
  const m = matrix?.data || [];
  if (m.length < 16) return { x: 0, y: 0, roll: 0 };
  return {
    x: clamp(Math.asin(Math.max(-1, Math.min(1, -m[2]))) * AVATAR_MOTION_CONFIG.horizontal.trackingScale, AVATAR_MOTION_CONFIG.horizontal),
    y: clamp(Math.atan2(m[6], m[10]) * AVATAR_MOTION_CONFIG.vertical.trackingScale, AVATAR_MOTION_CONFIG.vertical),
    roll: clamp(Math.atan2(m[1], m[0]) * AVATAR_MOTION_CONFIG.rotation.trackingScale, AVATAR_MOTION_CONFIG.rotation),
  };
}

export default function AvatarStudio() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const frameRef = useRef(null);
  const smoothRef = useRef({ x: 0, y: 0, roll: 0 });
  const [mode, setMode] = useState("manual");
  const [status, setStatus] = useState("Manual controls ready");
  const [isStarting, setIsStarting] = useState(false);
  const [expression, setExpression] = useState(INITIAL_EXPRESSION);
  const [scanKey, setScanKey] = useState(null);
  const [avatarPack, setAvatarPack] = useState("default");
  const [avatarPacks, setAvatarPacks] = useState([{ id: "default", files: [] }]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    landmarkerRef.current?.close();
    streamRef.current = null;
    landmarkerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setMode("manual");
    setStatus("Manual controls ready");
  }, []);

  useEffect(() => () => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    landmarkerRef.current?.close();
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/api/avatar-assets?fresh=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((result) => {
        if (active && result.packs?.length) {
          setAvatarPacks(result.packs);
          setScanKey(`default-${Date.now()}`);
        }
      })
      .catch(() => {});
    return () => { active = false; };
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
      const target = getHeadMotion(result.facialTransformationMatrixes?.[0]);
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
    } else {
      setStatus("Camera live · looking for a face");
    }
    frameRef.current = requestAnimationFrame(readFace);
  }, []);

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
      setStatus("Camera live · looking for a face");
      frameRef.current = requestAnimationFrame(readFace);
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const blocked = error?.name === "NotAllowedError";
      setMode("manual");
      setStatus(blocked ? "Camera blocked · manual controls still work" : "Tracker unavailable · manual controls still work");
    } finally {
      setIsStarting(false);
    }
  }

  function setManual(next) {
    if (mode === "camera") stopCamera();
    setExpression((current) => ({ ...current, ...next }));
  }

  const selectedPack = avatarPacks.find((pack) => pack.id === avatarPack);
  const availableFiles = selectedPack?.files?.filter((file) => AVATAR_FILES.includes(file)) || [];
  const availableCount = availableFiles.length;

  async function scanAssets() {
    try {
      const response = await fetch(`/api/avatar-assets?fresh=${Date.now()}`, { cache: "no-store" });
      if (response.ok) {
        const result = await response.json();
        if (result.packs?.length) setAvatarPacks(result.packs);
      }
    } catch {}
    setScanKey(`${avatarPack}-${Date.now()}`);
  }

  function selectAvatarPack(event) {
    const nextPack = event.target.value;
    setAvatarPack(nextPack);
    setScanKey(`${nextPack}-${Date.now()}`);
  }

  return (
    <>
      <Head>
        <title>Avatar Studio — Stream Bro</title>
        <meta name="description" content="Drive a layered 2D streaming avatar with your face." />
      </Head>
      <div className="site-shell app-shell">
        <SiteHeader />
        <StudioWorkspace
          title="Avatar V1 · Basic"
          subtitle="8 PNG layers · simple tracking"
          actionHref="/studio/avatar-v1-psd"
          actionLabel="Open V1 PSD studio"
          status={status}
          live={mode === "camera"}
          meta={<button className="quiet-button" onClick={scanAssets}>↻ Scan assets</button>}
          stage={<AvatarStage key={`${avatarPack}:${scanKey}`} pack={avatarPack} expression={expression} scanKey={scanKey} availableFiles={availableFiles} />}
          footer={<><span><b>{availableCount}/8</b> custom layers found</span><span>Placeholders stay until PNGs arrive</span></>}
          controls={<>
              <div className="pack-control">
                <label htmlFor="avatar-pack">Avatar pack</label>
                <select id="avatar-pack" value={avatarPack} onChange={selectAvatarPack}>
                  {avatarPacks.map((pack) => <option value={pack.id} key={pack.id}>{pack.id} · {pack.files.length}/8</option>)}
                </select>
                <a href="/avatar-helper">Create or update a pack ↗</a>
              </div>
              <div className="camera-card">
                <video ref={videoRef} muted playsInline aria-label="Mirrored camera preview" />
                {mode !== "camera" && <div className="camera-empty"><span>◌</span><p>Camera is off</p></div>}
                <div className="camera-action-row">
                  {mode === "camera" ? (
                    <button className="button button-dark" onClick={stopCamera}>Stop camera</button>
                  ) : (
                    <button className="button button-dark" onClick={startCamera} disabled={isStarting}>
                      {isStarting ? "Starting…" : "Start face tracking"}
                    </button>
                  )}
                </div>
              </div>

              <div className="control-section">
                <div className="control-heading"><span>01</span><h2>Eyes</h2><small>{expression.eyes}</small></div>
                <div className="segmented two">
                  {[
                    ["Open", "open"], ["Blink", "closed"],
                  ].map(([label, value]) => (
                    <button key={value} className={expression.eyes === value ? "active" : ""} onClick={() => setManual({ eyes: value })}>{label}</button>
                  ))}
                </div>
              </div>

              <div className="control-section">
                <div className="control-heading"><span>02</span><h2>Mouth</h2><small>{expression.mouth}</small></div>
                <div className="segmented four">
                  {["idle", "small", "medium", "wide"].map((value) => (
                    <button key={value} className={expression.mouth === value ? "active" : ""} onClick={() => setManual({ mouth: value })}>{value}</button>
                  ))}
                </div>
              </div>

              <div className="control-section">
                <div className="control-heading"><span>03</span><h2>Movement</h2><small>manual</small></div>
                <label className="range-row">Side to side <output>{Math.round(expression.x)}</output>
                  <input type="range" min={AVATAR_MOTION_CONFIG.horizontal.min} max={AVATAR_MOTION_CONFIG.horizontal.max} value={expression.x} onChange={(event) => setManual({ x: Number(event.target.value) })} />
                </label>
                <label className="range-row">Up and down <output>{Math.round(expression.y)}</output>
                  <input type="range" min={AVATAR_MOTION_CONFIG.vertical.min} max={AVATAR_MOTION_CONFIG.vertical.max} value={expression.y} onChange={(event) => setManual({ y: Number(event.target.value) })} />
                </label>
                <label className="range-row">Tilt <output>{Math.round(expression.roll)}°</output>
                  <input type="range" min={AVATAR_MOTION_CONFIG.rotation.min} max={AVATAR_MOTION_CONFIG.rotation.max} value={expression.roll} onChange={(event) => setManual({ roll: Number(event.target.value) })} />
                </label>
              </div>

              <button className="reset-button" onClick={() => setManual(INITIAL_EXPRESSION)}>Reset pose</button>
            </>}
        />
      </div>
    </>
  );
}
