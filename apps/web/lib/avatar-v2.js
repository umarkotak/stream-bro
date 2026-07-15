export const PSD_LAYER_SPEC = [
  { name: "accessory-back", part: "Optional accessory behind the avatar", required: false, z: 5 },
  { name: "hair-back", part: "Hair behind the head and body", required: true, z: 10 },
  { name: "body", part: "Half-body clothes, shoulders, chest, and arms", required: true, z: 20 },
  { name: "neck", part: "Neck skin above the body", required: true, z: 30 },
  { name: "ear-left", part: "Character's left ear", required: false, z: 35 },
  { name: "ear-right", part: "Character's right ear", required: false, z: 35 },
  { name: "head", part: "Face skin and head base", required: true, z: 40 },
  { name: "blush", part: "Optional blush or face tint", required: false, z: 45 },
  { name: "nose", part: "Optional nose art", required: false, z: 50 },
  { name: "eye-white-left", part: "Character's left eye white and open eye line", required: true, z: 60 },
  { name: "eye-white-right", part: "Character's right eye white and open eye line", required: true, z: 60 },
  { name: "eye-ball-left", part: "Character's left iris, pupil, and highlight", required: true, z: 65 },
  { name: "eye-ball-right", part: "Character's right iris, pupil, and highlight", required: true, z: 65 },
  { name: "eye-lid-closed-left", part: "Character's fully closed left eye", required: true, z: 70 },
  { name: "eye-lid-closed-right", part: "Character's fully closed right eye", required: true, z: 70 },
  { name: "eyebrow-left", part: "Character's left eyebrow", required: true, z: 75 },
  { name: "eyebrow-right", part: "Character's right eyebrow", required: true, z: 75 },
  { name: "mouth-idle", part: "Relaxed closed mouth", required: true, z: 80 },
  { name: "mouth-a", part: "A vowel: wide vertical opening", required: true, z: 80 },
  { name: "mouth-i", part: "I vowel: wide horizontal smile shape", required: true, z: 80 },
  { name: "mouth-u", part: "U vowel: small rounded and pushed shape", required: true, z: 80 },
  { name: "mouth-e", part: "E vowel: medium horizontal opening", required: true, z: 80 },
  { name: "mouth-o", part: "O vowel: large rounded opening", required: true, z: 80 },
  { name: "hair-front", part: "Bangs and hair above the face", required: true, z: 90 },
  { name: "accessory-front", part: "Optional glasses or foreground accessory", required: false, z: 100 },
];

export const REQUIRED_PSD_LAYERS = PSD_LAYER_SPEC.filter((layer) => layer.required).map((layer) => layer.name);
export const MOUTH_SHAPES = ["idle", "a", "i", "u", "e", "o"];

export const AVATAR_V2_MOTION = Object.freeze({
  horizontal: { min: -44, max: 44, trackingScale: 48 },
  vertical: { min: -34, max: 34, trackingScale: 38 },
  rotation: { min: -22, max: 22, trackingScale: 26 },
  gaze: { min: -10, max: 10, scale: 11 },
  brow: { min: -7, max: 5, scale: 8 },
  smoothing: 0.16,
  mouthHoldFrames: 3,
});

export function normalizePsdLayerName(value = "") {
  return value.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
}

export function getLayerSpec(name) {
  return PSD_LAYER_SPEC.find((layer) => layer.name === normalizePsdLayerName(name));
}

export function pickVowelMouth(scores = {}) {
  const jaw = scores.jawOpen || 0;
  const funnel = scores.mouthFunnel || 0;
  const pucker = scores.mouthPucker || 0;
  const smile = ((scores.mouthSmileLeft || 0) + (scores.mouthSmileRight || 0)) / 2;
  const stretch = ((scores.mouthStretchLeft || 0) + (scores.mouthStretchRight || 0)) / 2;
  const press = ((scores.mouthPressLeft || 0) + (scores.mouthPressRight || 0)) / 2;

  if (jaw < 0.08 && funnel < 0.12 && pucker < 0.12 && smile < 0.18 && stretch < 0.16) return "idle";

  const shapes = {
    a: jaw * 1.2 - funnel * 0.2 - pucker * 0.15,
    i: smile * 0.8 + stretch * 0.65 - jaw * 0.25,
    u: pucker * 1.05 + funnel * 0.55 - jaw * 0.2,
    e: smile * 0.55 + stretch * 0.5 + jaw * 0.42,
    o: funnel * 0.95 + pucker * 0.35 + jaw * 0.62,
  };

  const [shape, value] = Object.entries(shapes).sort((left, right) => right[1] - left[1])[0];
  return value > 0.12 && press < 0.75 ? shape : "idle";
}
