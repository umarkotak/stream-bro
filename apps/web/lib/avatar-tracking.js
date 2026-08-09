import { useCallback, useEffect, useRef, useState } from "react";
import {
  cameraMouthFromJaw,
  createMouthStateTracker,
  mouthModeUsesMicrophone,
  normalizeMouthMode,
  volumeMouthFromLevel,
} from "@/lib/avatar-mouth";
import { AUDIO_VOWEL_CONFIG, readAudioLevel, readAudioVowel } from "@/lib/audio-vowel";
import { V1_AVATAR_MOTION, V1_EMPTY_EXPRESSION } from "@/lib/avatar-v1-psd";

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

function smoothValue(previous, target, amount) {
  return previous + (target - previous) * amount;
}

export function useAvatarTracking({ enabled, mouthMode = "camera", gate = AUDIO_VOWEL_CONFIG.defaultGate }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const analyserRef = useRef(null);
  const frameRef = useRef(null);
  const timeDataRef = useRef(null);
  const spectrumRef = useRef(null);
  const bodyOriginRef = useRef(null);
  const smoothRef = useRef(V1_EMPTY_EXPRESSION);
  const mouthTrackerRef = useRef(createMouthStateTracker({ stableFrames: 3, idleFrames: 2 }));
  const jawRef = useRef(0);
  const gateRef = useRef(gate);
  const activeRef = useRef(false);
  const [expression, setExpression] = useState(V1_EMPTY_EXPRESSION);
  const [status, setStatus] = useState(enabled ? "starting" : "static");
  const [audioStats, setAudioStats] = useState({ level: 0, f1: 0, f2: 0 });

  useEffect(() => { gateRef.current = gate; }, [gate]);

  const release = useCallback(() => {
    activeRef.current = false;
    cancelAnimationFrame(frameRef.current);
    audioSourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    landmarkerRef.current?.close();
    audioContextRef.current?.close().catch(() => {});
    if (videoRef.current) videoRef.current.srcObject = null;
    frameRef.current = null;
    audioSourceRef.current = null;
    streamRef.current = null;
    landmarkerRef.current = null;
    analyserRef.current = null;
    audioContextRef.current = null;
    timeDataRef.current = null;
    spectrumRef.current = null;
  }, []);

  const readMouth = useCallback((mode) => {
    const normalizedMode = normalizeMouthMode(mode);
    const tracker = mouthTrackerRef.current;
    if (normalizedMode === "camera") return tracker.shown;
    const analyser = analyserRef.current;
    if (!analyser || !timeDataRef.current || !spectrumRef.current) return tracker.update("idle");

    const next = normalizedMode === "vowel"
      ? readAudioVowel(analyser, timeDataRef.current, spectrumRef.current, gateRef.current)
      : readAudioLevel(analyser, timeDataRef.current, gateRef.current);
    const mouth = normalizedMode === "vowel"
      ? next.mouth
      : volumeMouthFromLevel(next.level, gateRef.current, tracker.shown);
    setAudioStats({ level: next.level, f1: next.f1 || 0, f2: next.f2 || 0 });
    return tracker.update(mouth);
  }, []);

  const readFrame = useCallback(() => {
    if (!activeRef.current) return;
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.readyState < 2) {
      frameRef.current = requestAnimationFrame(readFrame);
      return;
    }

    const result = landmarker.detectForVideo(video, performance.now());
    if (result.faceBlendshapes?.length) {
      const scores = scoreMap(result.faceBlendshapes[0].categories);
      const mode = normalizeMouthMode(mouthMode);
      if (mode === "camera") {
        jawRef.current = smoothValue(jawRef.current, scores.jawOpen || 0, 0.24);
        readMouth(mode);
        mouthTrackerRef.current.update(cameraMouthFromJaw(jawRef.current, mouthTrackerRef.current.shown));
      }
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
        mouth: mode === "camera"
          ? mouthTrackerRef.current.shown
          : readMouth(mode),
      };
      ["bodyX", "bodyY", "bodyRoll"].forEach((key) => { next[key] = smoothValue(previous[key], target[key], V1_AVATAR_MOTION.body.smoothing); });
      ["headX", "headY", "headRoll"].forEach((key) => { next[key] = smoothValue(previous[key], target[key], V1_AVATAR_MOTION.head.smoothing); });
      ["hairX", "hairY", "hairRoll"].forEach((key) => { next[key] = smoothValue(previous[key], target[key], V1_AVATAR_MOTION.hair.smoothing); });
      smoothRef.current = next;
      setExpression(next);
      setStatus("tracking");
    } else {
      if (normalizeMouthMode(mouthMode) !== "camera") {
        const next = { ...smoothRef.current, mouth: readMouth(mouthMode) };
        smoothRef.current = next;
        setExpression(next);
      }
      setStatus("searching");
    }
    frameRef.current = requestAnimationFrame(readFrame);
  }, [mouthMode, readMouth]);

  useEffect(() => {
    if (!enabled) {
      release();
      bodyOriginRef.current = null;
      jawRef.current = 0;
      mouthTrackerRef.current.reset();
      smoothRef.current = V1_EMPTY_EXPRESSION;
      setExpression(V1_EMPTY_EXPRESSION);
      setAudioStats({ level: 0, f1: 0, f2: 0 });
      setStatus("static");
      return undefined;
    }

    let cancelled = false;
    const normalizedMode = normalizeMouthMode(mouthMode);
    async function start() {
      setStatus("starting");
      bodyOriginRef.current = null;
      jawRef.current = 0;
      mouthTrackerRef.current.reset();
      try {
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: "user" },
          audio: mouthModeUsesMicrophone(normalizedMode) ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const vision = await FilesetResolver.forVisionTasks("/mediapipe");
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "/models/face_landmarker.task" },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          minFaceDetectionConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });
        if (cancelled) {
          landmarker.close();
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        landmarkerRef.current = landmarker;

        if (mouthModeUsesMicrophone(normalizedMode)) {
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
          audioSourceRef.current = source;
          analyserRef.current = analyser;
          timeDataRef.current = new Float32Array(analyser.fftSize);
          spectrumRef.current = new Float32Array(analyser.frequencyBinCount);
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        activeRef.current = true;
        setStatus("searching");
        frameRef.current = requestAnimationFrame(readFrame);
      } catch {
        release();
        setStatus("blocked");
      }
    }

    start();
    return () => {
      cancelled = true;
      release();
    };
  }, [enabled, mouthMode, readFrame, release]);

  return { videoRef, expression, status, audioStats };
}
