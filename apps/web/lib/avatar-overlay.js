import { V1_EMPTY_EXPRESSION } from "@/lib/avatar-v1-psd";
import { mouthModeUsesVowels, normalizeMouthMode } from "@/lib/avatar-mouth";

export const OVERLAY_LAYER_FILES = [
  "body-base.png",
  "head-base.png",
  "hair-base.png",
  "eye-state-open.png",
  "eye-state-closed.png",
  "mouth-state-idle.png",
  "mouth-state-small.png",
  "mouth-state-medium.png",
  "mouth-state-wide.png",
  "mouth-state-a.png",
  "mouth-state-i.png",
  "mouth-state-u.png",
  "mouth-state-e.png",
  "mouth-state-o.png",
];

const GENERIC_MOUTH_FILES = [
  "mouth-state-idle.png",
  "mouth-state-small.png",
  "mouth-state-medium.png",
  "mouth-state-wide.png",
];

export const DEFAULT_OVERLAY_CONFIG = Object.freeze({
  pack: "default",
  tracking: true,
  mouthMode: "camera",
  scale: 100,
  x: 50,
  y: 52,
});

export const EMPTY_OVERLAY_EXPRESSION = V1_EMPTY_EXPRESSION;

const LEGACY_PACK_IDS = {
  "stream-bro-avatar-v1": "creator-buddy-avatar-v1",
};

export function clampOverlayNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

export function normalizeOverlayConfig(value = {}) {
  const requestedPack = LEGACY_PACK_IDS[value.pack] || value.pack;
  const pack = /^[a-z0-9-]{1,48}$/.test(requestedPack || "") ? requestedPack : DEFAULT_OVERLAY_CONFIG.pack;
  return {
    pack,
    tracking: value.tracking === true || value.tracking === "1",
    mouthMode: normalizeMouthMode(value.mouthMode || value.mouthSource),
    scale: clampOverlayNumber(value.scale, 40, 180, DEFAULT_OVERLAY_CONFIG.scale),
    x: clampOverlayNumber(value.x, 0, 100, DEFAULT_OVERLAY_CONFIG.x),
    y: clampOverlayNumber(value.y, 0, 100, DEFAULT_OVERLAY_CONFIG.y),
  };
}

export function overlayConfigFromQuery(query = {}) {
  return normalizeOverlayConfig({
    pack: Array.isArray(query.pack) ? query.pack[0] : query.pack,
    tracking: (Array.isArray(query.tracking) ? query.tracking[0] : query.tracking) !== "0",
    mouthMode: Array.isArray(query.mouth) ? query.mouth[0] : query.mouth,
    scale: Array.isArray(query.scale) ? query.scale[0] : query.scale,
    x: Array.isArray(query.x) ? query.x[0] : query.x,
    y: Array.isArray(query.y) ? query.y[0] : query.y,
  });
}

export function buildOverlayPath(config, revision = Date.now()) {
  const normalized = normalizeOverlayConfig(config);
  const params = new URLSearchParams({
    pack: normalized.pack,
    tracking: normalized.tracking ? "1" : "0",
    mouth: normalized.mouthMode,
    scale: String(normalized.scale),
    x: String(normalized.x),
    y: String(normalized.y),
    v: String(revision),
  });
  return `/virtual-avatar/v1/live/avatar?${params.toString()}`;
}

export function packSupportsVowels(files = []) {
  return ["mouth-state-a.png", "mouth-state-i.png", "mouth-state-u.png", "mouth-state-e.png", "mouth-state-o.png"]
    .every((file) => files.includes(file));
}

export function packSupportsMouthMode(files = [], mouthMode) {
  const supportsGenericMouth = GENERIC_MOUTH_FILES.every((file) => files.includes(file));
  return supportsGenericMouth && (!mouthModeUsesVowels(mouthMode) || packSupportsVowels(files));
}

export async function fetchOverlayPacks() {
  const revision = Date.now();
  const sources = [
    `/api/avatar-assets?overlay=${revision}`,
    `/avatar/packs.json?overlay=${revision}`,
  ];

  for (const source of sources) {
    try {
      const response = await fetch(source, { cache: "no-store" });
      if (!response.ok) continue;
      const result = await response.json();
      if (Array.isArray(result.packs) && result.packs.length) return result.packs;
    } catch {}
  }

  throw new Error("Could not load public avatar models");
}
