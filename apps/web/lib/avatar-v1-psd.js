import { AVATAR_FILES } from "@/lib/avatar";

const DETAILS = {
  "body-base.png": "Base body, head, neck, and clothes",
  "hair-base.png": "Complete hair layer",
  "eye-state-open.png": "Both open eyes and eyebrows",
  "eye-state-closed.png": "Both closed eyes and eyebrows",
  "mouth-state-idle.png": "Resting closed mouth",
  "mouth-state-small.png": "Small speech mouth",
  "mouth-state-medium.png": "Medium speech mouth",
  "mouth-state-wide.png": "Wide speech mouth",
};

export const V1_PSD_LAYER_SPEC = AVATAR_FILES.map((name, index) => ({
  name,
  part: DETAILS[name],
  required: true,
  z: index * 10 + 10,
}));

export const V1_PSD_LAYER_NAMES = V1_PSD_LAYER_SPEC.map((layer) => layer.name);

export function normalizeV1PsdLayerName(value = "") {
  return value.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
}

export function getV1PsdLayerSpec(name) {
  return V1_PSD_LAYER_SPEC.find((layer) => layer.name === normalizeV1PsdLayerName(name));
}
