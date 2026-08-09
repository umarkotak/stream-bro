import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CircleStop, FileUp, Mic, PencilRuler, Radio, Video } from "lucide-react";
import StudioWorkspace from "@/components/StudioWorkspace";
import V1PsdAvatarStage from "@/components/V1PsdAvatarStage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUDIO_VOWEL_CONFIG, readAudioVowel } from "@/lib/audio-vowel";
import {
  V1_AVATAR_MOTION,
  V1_EMPTY_EXPRESSION as EMPTY_EXPRESSION,
  V1_PSD_ALL_LAYER_NAMES,
  getV1PsdLayerSpec,
  normalizeV1PsdLayerName,
} from "@/lib/avatar-v1-psd";
import { readNamedPsd, revokePsdModel } from "@/lib/psd-loader";

const VIDEO_MOUTHS = ["idle", "small", "medium", "wide"];
const VOICE_MOUTHS = ["idle", "a", "i", "u", "e", "o"];

function clamp(value, range) {
  return Math.max(range.min, Math.min(range.max, value));
}

function scoreMap(categories = []) {
  return Object.fromEntries(categories.map(({ categoryName, score }) => [categoryName, score]));
}

function headRotation(matrix) {
  const m = matrix?.data || [];
  if (m.length < 16) return { yaw: 0, pitch: 0, roll: 0 };
  return {
    yaw: Math.asin(clamp(-m[2], { min: -1, max: 1 })),
    pitch: Math.atan2(m[6], m[10]),
    roll: Math.atan2(m[1], m[0]) * (180 / Math.PI),
  };
}

function faceCenter(landmarks = []) {
  const points = [10, 152, 234, 454].map((index) => landmarks[index]).filter(Boolean);
  if (!points.length) return null;
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function videoMouth(scores) {
  const jaw = scores.jawOpen || 0;
  return jaw > 0.58 ? "wide" : jaw > 0.32 ? "medium" : jaw > 0.12 ? "small" : "idle";
}

function smoothValue(previous, target, amount) {
  return previous + (target - previous) * amount;
}

export default function AvatarV1Studio() {
  const videoRef = useRef(null);
  const psdInputRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const frameRef = useRef(null);
  const timeDataRef = useRef(null);
  const spectrumRef = useRef(null);
  const modelRef = useRef(null);
  const gateRef = useRef(AUDIO_VOWEL_CONFIG.defaultGate);
  const mouthSourceRef = useRef("video");
  const bodyOriginRef = useRef(null);
  const statsTimeRef = useRef(0);
  const smoothRef = useRef(EMPTY_EXPRESSION);
  const mouthTrackRef = useRef({ shown: "idle", candidate: "idle", frames: 0 });
  const [model, setModel] = useState(null);
  const [expression, setExpression] = useState(EMPTY_EXPRESSION);
  const [status, setStatus] = useState("Load an avatar PSD");
  const [mode, setMode] = useState("manual");
  const [mouthSource, setMouthSource] = useState("video");
  const [gate, setGate] = useState(AUDIO_VOWEL_CONFIG.defaultGate);
  const [audioStats, setAudioStats] = useState({ level: 0, f1: 0, f2: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => { gateRef.current = gate; }, [gate]);

  const releaseTracking = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    landmarkerRef.current?.close();
    audioContextRef.current?.close().catch(() => {});
    if (videoRef.current) videoRef.current.srcObject = null;
    frameRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    landmarkerRef.current = null;
    analyserRef.current = null;
    audioContextRef.current = null;
    timeDataRef.current = null;
    spectrumRef.current = null;
  }, []);

  const stopTracking = useCallback(() => {
    releaseTracking();
    bodyOriginRef.current = null;
    mouthTrackRef.current = { shown: "idle", candidate: "idle", frames: 0 };
    smoothRef.current = EMPTY_EXPRESSION;
    setMode("manual");
    setAudioStats({ level: 0, f1: 0, f2: 0 });
    setExpression(EMPTY_EXPRESSION);
    setStatus(modelRef.current ? "PSD ready · manual mode" : "Load an avatar PSD");
  }, [releaseTracking]);

  useEffect(() => () => {
    releaseTracking();
    revokePsdModel(modelRef.current);
  }, [releaseTracking]);

  const readVoiceMouth = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser || !timeDataRef.current || !spectrumRef.current) return "idle";
    const next = readAudioVowel(analyser, timeDataRef.current, spectrumRef.current, gateRef.current);
    const tracker = mouthTrackRef.current;
    if (next.mouth === tracker.shown) {
      tracker.candidate = next.mouth;
      tracker.frames = 0;
    } else if (next.mouth === tracker.candidate) {
      tracker.frames += 1;
      if (tracker.frames >= AUDIO_VOWEL_CONFIG.stableFrames) {
        tracker.shown = next.mouth;
        tracker.frames = 0;
      }
    } else {
      tracker.candidate = next.mouth;
      tracker.frames = 1;
    }
    const now = performance.now();
    if (now - statsTimeRef.current > 80) {
      statsTimeRef.current = now;
      setAudioStats({ level: next.level, f1: next.f1, f2: next.f2 });
    }
    return tracker.shown;
  }, []);

  const readTracking = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.readyState < 2) {
      frameRef.current = requestAnimationFrame(readTracking);
      return;
    }

    const audioMouth = mouthSourceRef.current === "voice" ? readVoiceMouth() : "idle";
    const result = landmarker.detectForVideo(video, performance.now());
    if (result.faceBlendshapes?.length) {
      const scores = scoreMap(result.faceBlendshapes[0].categories);
      const rotation = headRotation(result.facialTransformationMatrixes?.[0]);
      const center = faceCenter(result.faceLandmarks?.[0]);
      if (center && !bodyOriginRef.current) bodyOriginRef.current = center;
      const origin = bodyOriginRef.current || center || { x: 0.5, y: 0.5 };
      const bodyRoll = clamp(rotation.roll * V1_AVATAR_MOTION.body.rollScale, V1_AVATAR_MOTION.body.roll);
      const target = {
        bodyX: clamp((center?.x - origin.x || 0) * V1_AVATAR_MOTION.body.xScale, V1_AVATAR_MOTION.body.x),
        bodyY: clamp((center?.y - origin.y || 0) * V1_AVATAR_MOTION.body.yScale, V1_AVATAR_MOTION.body.y),
        bodyRoll,
        headX: clamp(rotation.yaw * V1_AVATAR_MOTION.head.xScale, V1_AVATAR_MOTION.head.x),
        headY: clamp(rotation.pitch * V1_AVATAR_MOTION.head.yScale, V1_AVATAR_MOTION.head.y),
        headRoll: clamp(rotation.roll - bodyRoll, V1_AVATAR_MOTION.head.roll),
      };
      target.hairX = target.headX * V1_AVATAR_MOTION.hair.xScale;
      target.hairY = Math.abs(target.headRoll) * V1_AVATAR_MOTION.hair.yScale;
      target.hairRoll = (target.bodyRoll + target.headRoll) * V1_AVATAR_MOTION.hair.gravity;

      const previous = smoothRef.current;
      const next = {
        eyes: ((scores.eyeBlinkLeft || 0) + (scores.eyeBlinkRight || 0)) / 2 > 0.48 ? "closed" : "open",
        mouth: mouthSourceRef.current === "voice" ? audioMouth : videoMouth(scores),
      };
      ["bodyX", "bodyY", "bodyRoll"].forEach((key) => { next[key] = smoothValue(previous[key], target[key], V1_AVATAR_MOTION.body.smoothing); });
      ["headX", "headY", "headRoll"].forEach((key) => { next[key] = smoothValue(previous[key], target[key], V1_AVATAR_MOTION.head.smoothing); });
      ["hairX", "hairY", "hairRoll"].forEach((key) => { next[key] = smoothValue(previous[key], target[key], V1_AVATAR_MOTION.hair.smoothing); });
      smoothRef.current = next;
      setExpression(next);
      setStatus(`Tracking live · ${mouthSourceRef.current === "voice" ? "microphone" : "video"} mouth`);
    } else {
      if (mouthSourceRef.current === "voice") setExpression((current) => ({ ...current, mouth: audioMouth }));
      setStatus("Camera live · looking for a face");
    }
    frameRef.current = requestAnimationFrame(readTracking);
  }, [readVoiceMouth]);

  async function loadPsd(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsLoading(true);
    setStatus("Reading PSD…");
    try {
      const next = await readNamedPsd(file, {
        names: V1_PSD_ALL_LAYER_NAMES,
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

  async function startTracking() {
    setIsStarting(true);
    setStatus("Loading camera tracker…");
    mouthSourceRef.current = mouthSource;
    bodyOriginRef.current = null;
    try {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: "user" },
        audio: mouthSource === "voice" ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
      });
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

      if (mouthSource === "voice") {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) throw new Error("Web Audio is unavailable");
        const context = new AudioContextClass();
        audioContextRef.current = context;
        await context.resume();
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = AUDIO_VOWEL_CONFIG.fftSize;
        analyser.smoothingTimeConstant = AUDIO_VOWEL_CONFIG.smoothingTimeConstant;
        analyser.minDecibels = AUDIO_VOWEL_CONFIG.minDecibels;
        analyser.maxDecibels = AUDIO_VOWEL_CONFIG.maxDecibels;
        source.connect(analyser);
        sourceRef.current = source;
        analyserRef.current = analyser;
        timeDataRef.current = new Float32Array(analyser.fftSize);
        spectrumRef.current = new Float32Array(analyser.frequencyBinCount);
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setMode("tracking");
      frameRef.current = requestAnimationFrame(readTracking);
    } catch (error) {
      releaseTracking();
      setMode("manual");
      const blockedInput = mouthSource === "voice" ? "Camera or microphone" : "Camera";
      setStatus(error?.name === "NotAllowedError" ? `${blockedInput} blocked · manual works` : "Tracker unavailable · manual works");
    } finally {
      setIsStarting(false);
    }
  }

  function selectMouthSource(nextSource) {
    if (mode === "tracking") stopTracking();
    mouthSourceRef.current = nextSource;
    mouthTrackRef.current = { shown: "idle", candidate: "idle", frames: 0 };
    setMouthSource(nextSource);
    setExpression((current) => ({ ...current, mouth: "idle" }));
  }

  function setManual(next) {
    if (mode === "tracking") stopTracking();
    setExpression((current) => ({ ...current, ...next }));
  }

  const foundCount = model ? V1_PSD_ALL_LAYER_NAMES.length - model.missing.length : 0;
  const meter = Math.min(100, (audioStats.level / Math.max(gate * 5, 0.001)) * 100);
  const manualMouths = mouthSource === "voice" ? VOICE_MOUTHS : VIDEO_MOUTHS;

  return (
    <>
      <Head><title>Avatar Studio — Creator Buddy</title></Head>
      <StudioWorkspace
        status={status}
        live={mode === "tracking"}
        meta={model ? `${foundCount}/14 layers ready` : "No PSD loaded"}
        stage={<V1PsdAvatarStage model={model} expression={expression} />}
        footer={<><span>{expression.eyes} eyes</span><span>{expression.mouth.toUpperCase()} mouth</span><span>{mouthSource} input</span></>}
        toolbar={<>
          <input ref={psdInputRef} className="sr-only" type="file" accept=".psd,image/vnd.adobe.photoshop" onChange={loadPsd} disabled={isLoading} />
          <Button type="button" variant="outline" size="sm" onClick={() => psdInputRef.current?.click()} disabled={isLoading}>
            <FileUp />
            {isLoading ? "Reading PSD…" : model ? "Replace PSD" : "Load PSD"}
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <span className="flex-1" />
          <Button variant="outline" size="sm" render={<Link href="/virtual-avatar/v1/editor" />}><PencilRuler />Editor</Button>
          <Button variant="outline" size="sm" render={<Link href="/virtual-avatar/v1/live" />}><Radio />Live</Button>
          {mode === "tracking" ? (
            <Button variant="destructive" size="sm" onClick={stopTracking}><CircleStop />Stop</Button>
          ) : (
            <Button size="sm" onClick={startTracking} disabled={!model || isStarting}><Camera />{isStarting ? "Starting…" : "Start tracking"}</Button>
          )}
        </>}
        inspector={<>
          <header className="avatar-studio-panel-header"><div><h2>Controls</h2><p>Manual avatar settings</p></div><Badge variant="outline">{mouthSource}</Badge></header>
          <ScrollArea className="avatar-studio-panel-scroll">
            <div className="avatar-studio-panel-content">
              <section className="avatar-studio-control-group">
                <span>Input source</span>
                <Select value={mouthSource} onValueChange={(value) => value && selectMouthSource(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="video">Camera mouth</SelectItem><SelectItem value="voice">Microphone mouth</SelectItem></SelectContent>
                </Select>
              </section>
              {mouthSource === "voice" && <section className="avatar-studio-control-group">
                <span>Voice sensitivity <b>{gate.toFixed(3)}</b></span>
                <Slider min={0.006} max={0.06} step={0.002} value={gate} onValueChange={setGate} aria-label="Voice sensitivity" />
              </section>}
              <section className="avatar-studio-control-group">
                <span>Eyes</span>
                <Select value={expression.eyes} onValueChange={(value) => value && setManual({ eyes: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="closed">Blink</SelectItem></SelectContent>
                </Select>
              </section>
              <section className="avatar-studio-control-group">
                <span>Mouth</span>
                <Select value={expression.mouth} onValueChange={(value) => value && setManual({ mouth: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{manualMouths.map((mouth) => <SelectItem value={mouth} key={mouth}>{mouth.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </section>
            </div>
          </ScrollArea>
        </>}
        layers={<>
          <header className="avatar-studio-panel-header"><div><h2>Layers</h2><p>{foundCount}/14 ready</p></div></header>
          <ScrollArea className="avatar-studio-panel-scroll">
            <ul className="avatar-studio-layer-list">
              {V1_PSD_ALL_LAYER_NAMES.map((name) => {
                const found = model?.layers.some((layer) => layer.name === name);
                return <li className={found ? "is-ready" : ""} key={name}><i /><span>{name}</span><small>{found ? "Ready" : "Missing"}</small></li>;
              })}
            </ul>
          </ScrollArea>
        </>}
        camera={<>
          <header><span><Video />Camera</span><Badge variant={mode === "tracking" ? "default" : "outline"}>{mode === "tracking" ? "On" : "Off"}</Badge></header>
          <div className="avatar-studio-camera-feed">
            <video ref={videoRef} muted playsInline />
            {mode !== "tracking" && <div className="avatar-studio-camera-empty"><Video /><span>Camera is off</span></div>}
          </div>
          {mouthSource === "voice" && <footer><Mic />{mode === "tracking" ? `${expression.mouth.toUpperCase()} · ${audioStats.f1 ? `${Math.round(audioStats.f1)} / ${Math.round(audioStats.f2)} Hz` : "Listening"}` : "Microphone idle"}<i style={{ width: `${meter}%` }} /></footer>}
        </>}
      />
    </>
  );
}
