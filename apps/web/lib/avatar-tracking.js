import { useCallback, useEffect, useRef, useState } from "react";
import { cameraMouthFromJaw, createMouthStateTracker } from "@/lib/avatar-mouth";
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

export function useAvatarTracking({ enabled }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const frameRef = useRef(null);
  const bodyOriginRef = useRef(null);
  const smoothRef = useRef(V1_EMPTY_EXPRESSION);
  const mouthTrackerRef = useRef(createMouthStateTracker());
  const jawRef = useRef(0);
  const activeRef = useRef(false);
  const [expression, setExpression] = useState(V1_EMPTY_EXPRESSION);
  const [status, setStatus] = useState(enabled ? "starting" : "static");

  const release = useCallback(() => {
    activeRef.current = false;
    const scheduled = frameRef.current;
    if (scheduled?.type === "video") videoRef.current?.cancelVideoFrameCallback?.(scheduled.id);
    else if (scheduled?.id) cancelAnimationFrame(scheduled.id);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    landmarkerRef.current?.close();
    if (videoRef.current) videoRef.current.srcObject = null;
    frameRef.current = null;
    streamRef.current = null;
    landmarkerRef.current = null;
  }, []);

  const readFrame = useCallback((timestamp) => {
    if (!activeRef.current) return;
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.readyState < 2) {
      frameRef.current = { type: "animation", id: requestAnimationFrame(readFrame) };
      return;
    }

    const result = landmarker.detectForVideo(video, timestamp || performance.now());
    if (result.faceBlendshapes?.length) {
      const scores = scoreMap(result.faceBlendshapes[0].categories);
      jawRef.current = smoothValue(jawRef.current, scores.jawOpen || 0, 0.24);
      const mouth = mouthTrackerRef.current.update(cameraMouthFromJaw(jawRef.current, mouthTrackerRef.current.shown));
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
      const next = { eyes: ((scores.eyeBlinkLeft || 0) + (scores.eyeBlinkRight || 0)) / 2 > 0.48 ? "closed" : "open", mouth };
      ["bodyX", "bodyY", "bodyRoll"].forEach((key) => { next[key] = smoothValue(previous[key], target[key], V1_AVATAR_MOTION.body.smoothing); });
      ["headX", "headY", "headRoll"].forEach((key) => { next[key] = smoothValue(previous[key], target[key], V1_AVATAR_MOTION.head.smoothing); });
      ["hairX", "hairY", "hairRoll"].forEach((key) => { next[key] = smoothValue(previous[key], target[key], V1_AVATAR_MOTION.hair.smoothing); });
      smoothRef.current = next;
      setExpression(next);
      setStatus("tracking");
    } else {
      setStatus("searching");
    }

    if (typeof video.requestVideoFrameCallback === "function") {
      frameRef.current = { type: "video", id: video.requestVideoFrameCallback(readFrame) };
    } else {
      frameRef.current = { type: "animation", id: requestAnimationFrame(readFrame) };
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      release();
      bodyOriginRef.current = null;
      jawRef.current = 0;
      mouthTrackerRef.current.reset();
      smoothRef.current = V1_EMPTY_EXPRESSION;
      setExpression(V1_EMPTY_EXPRESSION);
      setStatus("static");
      return undefined;
    }

    let cancelled = false;
    async function start() {
      setStatus("starting");
      bodyOriginRef.current = null;
      jawRef.current = 0;
      mouthTrackerRef.current.reset();
      try {
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false,
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
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        activeRef.current = true;
        setStatus("searching");
        if (typeof videoRef.current.requestVideoFrameCallback === "function") {
          frameRef.current = { type: "video", id: videoRef.current.requestVideoFrameCallback(readFrame) };
        } else {
          frameRef.current = { type: "animation", id: requestAnimationFrame(readFrame) };
        }
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
  }, [enabled, readFrame, release]);

  return { videoRef, expression, status };
}
