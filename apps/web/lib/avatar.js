export const AVATAR_FILES = [
  "body-base.png",
  "hair-base.png",
  "eye-state-open.png",
  "eye-state-closed.png",
  "mouth-state-idle.png",
  "mouth-state-small.png",
  "mouth-state-medium.png",
  "mouth-state-wide.png",
];

// Tune avatar movement here. Pixel values control translation; degrees control rotation.
export const AVATAR_MOTION_CONFIG = Object.freeze({
  horizontal: { min: -32, max: 32, trackingScale: 40 },
  vertical: { min: -24, max: 24, trackingScale: 28 },
  rotation: { min: -18, max: 18, trackingScale: 22 },
  smoothing: 0.22,
});

export const AVATAR_COMPONENTS = [
  {
    file: "body-base.png",
    title: "Body base",
    layer: "Draw only the character's head skin, ears, neck, shoulders, torso, and clothing. Leave out all hair, eyebrows, eyes, and mouth.",
  },
  {
    file: "hair-base.png",
    title: "Hair",
    layer: "Draw only the complete hair layer. Do not draw the face, skin, body, eyes, eyebrows, mouth, or any other avatar part.",
  },
  {
    file: "eye-state-open.png",
    title: "Eyes open",
    layer: "Draw only both open eyes and eyebrows in the normal relaxed expression. Do not draw any other avatar part.",
  },
  {
    file: "eye-state-closed.png",
    title: "Eyes closed",
    layer: "Draw only both fully closed blinking eyes and matching eyebrows. Keep the same positions and size as the open-eye layer. Do not draw any other avatar part.",
  },
  {
    file: "mouth-state-idle.png",
    title: "Mouth idle",
    layer: "Draw only a relaxed closed mouth. Do not draw any other avatar part.",
  },
  {
    file: "mouth-state-small.png",
    title: "Mouth small",
    layer: "Draw only a slightly open mouth for quiet speech. Do not draw any other avatar part.",
  },
  {
    file: "mouth-state-medium.png",
    title: "Mouth medium",
    layer: "Draw only a medium-open mouth for normal speech. Do not draw any other avatar part.",
  },
  {
    file: "mouth-state-wide.png",
    title: "Mouth wide",
    layer: "Draw only a wide-open mouth for loud speech. Do not draw any other avatar part.",
  },
];

export function normalizePackName(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function createAvatarPrompt(component, context, pack, background = "white") {
  const backgroundRule = background === "transparent"
    ? "Use a real transparent background with clean alpha edges. No background, checkerboard, or matte color."
    : "Use a perfectly flat pure white (#FFFFFF) background with no shadow, texture, gradient, border, or scenery.";
  const backgroundResult = background === "transparent"
    ? "Return only the requested layer as a transparent PNG."
    : "Return only the requested layer on a pure white background.";

  return `Create one production-ready 2D avatar layer for Stream Bro.

CHARACTER BRIEF
${context.trim()}

LAYER TO CREATE
${component.title} (${component.file})
${component.layer}

LOCKED AVATAR BLUEPRINT
- Output exactly one 512 by 512 pixel PNG.
- ${backgroundRule}
- Straight-on bust portrait. Character faces the camera. No head tilt or perspective angle.
- Canvas center is x=256. Keep all visible art inside the canvas with a 24 px safe margin.
- Head box: x=140 to 372, y=70 to 350. Eye centers: x=210 and x=302, y=220. Mouth center: x=256, y=286. Shoulders begin near y=350.
- Preserve the same proportions, line weight, colors, lighting, and art style across all eight files in avatar pack "${pack}".
- No glow, text, labels, border, watermark, or extra objects.
- Do not move, crop, resize, or rotate the character between layers.

WORKFLOW
If the image tool supports reference images, attach body-base.png after creating it and use it only as an alignment reference for every later layer. Do not redraw reference content.

FINAL CHECK
The file must overlay perfectly at 0,0 with the other 512 by 512 layers. ${backgroundResult}`;
}
