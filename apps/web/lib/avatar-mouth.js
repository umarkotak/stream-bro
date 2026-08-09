export const VIDEO_MOUTH_STATES = Object.freeze(["idle", "small", "medium", "wide"]);
export const VOWEL_MOUTH_STATES = Object.freeze(["idle", "a", "i", "u", "e", "o"]);

export const MOUTH_ANIMATION_MODES = Object.freeze({
  camera: {
    label: "Camera motion",
    description: "Most stable · tracks jaw opening",
    requiresMicrophone: false,
    requiresVowels: false,
  },
  volume: {
    label: "Microphone level",
    description: "Stable speech movement · maps voice volume to four mouth shapes",
    requiresMicrophone: true,
    requiresVowels: false,
  },
  vowel: {
    label: "Microphone vowels",
    description: "Experimental · estimates A, I, U, E, and O from your microphone",
    requiresMicrophone: true,
    requiresVowels: true,
  },
});

export function normalizeMouthMode(value) {
  if (value === "video") return "camera";
  if (value === "voice") return "volume";
  return MOUTH_ANIMATION_MODES[value] ? value : "camera";
}

export function mouthModeUsesMicrophone(mode) {
  return MOUTH_ANIMATION_MODES[normalizeMouthMode(mode)].requiresMicrophone;
}

export function mouthModeUsesVowels(mode) {
  return MOUTH_ANIMATION_MODES[normalizeMouthMode(mode)].requiresVowels;
}

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

export function volumeMouthFromLevel(level = 0, gate = 0.018, shown = "idle") {
  const normalized = Math.max(0, Number(level) || 0) / Math.max(Number(gate) || 0.018, 0.001);
  if (shown === "idle" && normalized < 1.15) return "idle";
  if (shown === "small" && normalized < 0.7) return "idle";
  if (shown === "medium" && normalized < 1.8) return "small";
  if (shown === "wide" && normalized < 3.8) return "medium";
  if (normalized >= 5.5) return "wide";
  if (normalized >= 2.8) return "medium";
  if (normalized >= 1.15) return "small";
  return "idle";
}

export function createMouthStateTracker({ stableFrames = 2, idleFrames = 1 } = {}) {
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
