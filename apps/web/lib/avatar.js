import { V1_PSD_ALL_LAYER_NAMES } from "@/lib/avatar-v1-psd";

export const AVATAR_FILES = V1_PSD_ALL_LAYER_NAMES;

export const AVATAR_COMPONENTS = [
  {
    file: "body-base.png",
    title: "Body base",
    layer: "Draw only the character's half body, shoulders, arms, torso, and clothing. Leave out the head, neck, hair, eyes, eyebrows, and mouth.",
  },
  {
    file: "head-base.png",
    title: "Head base",
    layer: "Draw only the head skin, face, ears, and neck. Leave out the body, hair, eyes, eyebrows, and mouth.",
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
  { file: "mouth-state-a.png", title: "Mouth A", layer: "Draw only an A vowel mouth with a wide vertical opening. Do not draw any other avatar part." },
  { file: "mouth-state-i.png", title: "Mouth I", layer: "Draw only an I vowel mouth with a wide horizontal shape. Do not draw any other avatar part." },
  { file: "mouth-state-u.png", title: "Mouth U", layer: "Draw only a small rounded U vowel mouth. Do not draw any other avatar part." },
  { file: "mouth-state-e.png", title: "Mouth E", layer: "Draw only a medium horizontal E vowel mouth. Do not draw any other avatar part." },
  { file: "mouth-state-o.png", title: "Mouth O", layer: "Draw only a large rounded O vowel mouth. Do not draw any other avatar part." },
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

function backgroundRules(background) {
  const backgroundRule = background === "transparent"
    ? "Use a real transparent background with clean alpha edges. No background, checkerboard, or matte color."
    : "Use a perfectly flat pure white (#FFFFFF) background with no shadow, texture, gradient, border, or scenery.";
  const backgroundResult = background === "transparent"
    ? "Return a transparent PNG."
    : "Return the image on a pure white background.";
  return { backgroundRule, backgroundResult };
}

export function createAvatarMasterPrompt(context, background = "white") {
  const { backgroundRule, backgroundResult } = backgroundRules(background);
  return `Create the master reference image for a layered 2D streaming avatar.

CHARACTER BRIEF
${context.trim()}

MASTER CHARACTER
- Draw one complete, polished half-body character facing straight at the camera.
- Neutral pose, level shoulders, no head tilt, no perspective angle.
- Eyes fully open. Eyebrows relaxed. Mouth closed and relaxed.
- Include the final body, clothes, head, face, hair, eyes, eyebrows, and idle mouth.
- Use one square canvas. 512 by 512 pixels is recommended.
- Keep the full avatar inside a safe margin. Center the head, neck, and body.
- ${backgroundRule}
- No text, labels, border, watermark, props, extra views, layer sheet, or alternate expressions.

This image will be attached as the fixed visual reference for every separate avatar layer. Make the design clear, consistent, and easy to separate. ${backgroundResult}`;
}

export function createAvatarLayerPrompt(component, context, background = "white") {
  const { backgroundRule, backgroundResult } = backgroundRules(background);

  return `Create one separate production-ready layer for a 2D streaming avatar.

REFERENCE REQUIRED
Use the attached master character image as the only design and alignment reference. Keep its exact character identity, proportions, pose, colors, clothes, line work, lighting, canvas, scale, and position. Do not redesign or recenter anything.

LAYER TO CREATE
${component.title} (${component.file})
${component.layer}

LAYER RULES
- Output one square PNG using the exact same canvas size as the attached master image.
- ${backgroundRule}
- Keep the requested art at the exact coordinates it occupies in the master image.
- Remove every unrequested avatar part. Do not redraw hidden parts.
- No glow, text, labels, border, watermark, or extra objects.
- Do not move, crop, resize, rotate, restyle, or improve the character.

CHARACTER REMINDER
${context.trim()}

FINAL CHECK
The result must overlay the attached master perfectly at coordinate 0,0. ${backgroundResult}`;
}
