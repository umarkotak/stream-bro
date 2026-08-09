export const VIDEO_MOUTH_STATES = Object.freeze(["idle", "small", "medium", "wide"]);

export function cameraMouthFromJaw(jawOpen = 0, shown = "idle") {
  const jaw = Math.max(0, Number(jawOpen) || 0);
  if (shown === "idle" && jaw < 0.14) return "idle";
  if (shown === "small" && jaw < 0.08) return "idle";
  if (shown === "medium" && jaw < 0.24) return "small";
  if (shown === "wide" && jaw < 0.5) return "medium";
  if (jaw >= 0.6) return "wide";
  if (jaw >= 0.34) return "medium";
  if (jaw >= 0.14) return "small";
  return "idle";
}

export function createMouthStateTracker({ stableFrames = 3, idleFrames = 2 } = {}) {
  const state = { shown: "idle", candidate: "idle", frames: 0 };
  return {
    get shown() {
      return state.shown;
    },
    reset() {
      state.shown = "idle";
      state.candidate = "idle";
      state.frames = 0;
    },
    update(next) {
      const target = next || "idle";
      if (target === state.shown) {
        state.candidate = target;
        state.frames = 0;
        return state.shown;
      }
      if (target === state.candidate) state.frames += 1;
      else {
        state.candidate = target;
        state.frames = 1;
      }
      const requiredFrames = target === "idle" ? idleFrames : stableFrames;
      if (state.frames >= requiredFrames) {
        state.shown = target;
        state.frames = 0;
      }
      return state.shown;
    },
  };
}
