const DETAILS = {
  "body-base.png": "Half body, shoulders, clothes, and arms without the head",
  "head-base.png": "Floating head, face skin, and ears without neck, hair, eyes, or mouth",
  "hair-base.png": "Complete hair layer above the head and face",
  "eye-state-open.png": "Both open eyes and eyebrows",
  "eye-state-closed.png": "Both closed eyes and eyebrows",
  "mouth-state-idle.png": "Resting closed mouth",
  "mouth-state-small.png": "Small camera speech mouth",
  "mouth-state-medium.png": "Medium camera speech mouth",
  "mouth-state-wide.png": "Wide camera speech mouth",
  "mouth-state-a.png": "A vowel mouth",
  "mouth-state-i.png": "I vowel mouth",
  "mouth-state-u.png": "U vowel mouth",
  "mouth-state-e.png": "E vowel mouth",
  "mouth-state-o.png": "O vowel mouth",
};

const LAYERS = [
  ["body-base.png", 10],
  ["head-base.png", 20],
  ["eye-state-open.png", 30],
  ["eye-state-closed.png", 40],
  ["mouth-state-idle.png", 50],
  ["mouth-state-small.png", 60],
  ["mouth-state-medium.png", 70],
  ["mouth-state-wide.png", 80],
  ["mouth-state-a.png", 90],
  ["mouth-state-i.png", 100],
  ["mouth-state-u.png", 110],
  ["mouth-state-e.png", 120],
  ["mouth-state-o.png", 130],
  ["hair-base.png", 140],
];

export const V1_PSD_LAYER_SPEC = LAYERS.map(([name, z]) => ({ name, part: DETAILS[name], required: true, z }));
export const V1_PSD_LAYER_NAMES = V1_PSD_LAYER_SPEC.map((layer) => layer.name);
export const V1_PSD_EDITOR_LAYER_SPEC = V1_PSD_LAYER_SPEC;
export const V1_PSD_ALL_LAYER_NAMES = V1_PSD_LAYER_NAMES;

export const V1_EMPTY_EXPRESSION = Object.freeze({
  eyes: "open",
  mouth: "idle",
  bodyX: 0,
  bodyY: 0,
  bodyRoll: 0,
  headX: 0,
  headY: 0,
  headRoll: 0,
  hairX: 0,
  hairY: 0,
  hairRoll: 0,
});

export const V1_AVATAR_MOTION = Object.freeze({
  body: { x: { min: -38, max: 38 }, y: { min: -28, max: 28 }, roll: { min: -5, max: 5 }, xScale: 190, yScale: 150, rollScale: 0.16, smoothing: 0.075 },
  head: { x: { min: -15, max: 15 }, y: { min: -12, max: 12 }, roll: { min: -20, max: 20 }, xScale: 18, yScale: 14, smoothing: 0.18 },
  hair: { xScale: -0.07, yScale: 0.08, gravity: -0.14, smoothing: 0.065 },
});

export function getV1MotionTransforms(expression = V1_EMPTY_EXPRESSION) {
  const motion = (x = 0, y = 0, roll = 0) => `translate3d(${x}px, ${y}px, 0) rotate(${roll}deg)`;
  return {
    body: motion(expression.bodyX, expression.bodyY, expression.bodyRoll),
    head: motion(
      (expression.bodyX || 0) + (expression.headX || 0),
      (expression.bodyY || 0) + (expression.headY || 0),
      (expression.bodyRoll || 0) + (expression.headRoll || 0),
    ),
    hair: motion(
      (expression.bodyX || 0) + (expression.headX || 0) + (expression.hairX || 0),
      (expression.bodyY || 0) + (expression.headY || 0) + (expression.hairY || 0),
      (expression.bodyRoll || 0) + (expression.headRoll || 0) + (expression.hairRoll || 0),
    ),
  };
}

export function normalizeV1PsdLayerName(value = "") {
  return value.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
}

export function getV1PsdLayerSpec(name) {
  return V1_PSD_LAYER_SPEC.find((layer) => layer.name === normalizeV1PsdLayerName(name));
}
