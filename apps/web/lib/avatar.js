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
    layer: "Draw only the floating head skin, face, and ears. Do not draw a neck or neck stump. Leave out the body, hair, eyes, eyebrows, and mouth.",
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

export const AVATAR_SHEET_GRID = [
  ["body-base.png", "head-base.png", "hair-base.png", null],
  ["eye-state-open.png", "eye-state-closed.png", "mouth-state-idle.png", "mouth-state-small.png"],
  ["mouth-state-medium.png", "mouth-state-wide.png", "mouth-state-a.png", "mouth-state-i.png"],
  ["mouth-state-u.png", "mouth-state-e.png", "mouth-state-o.png", null],
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

export function createAvatarSheetLlmPrompt(context) {
  const layerContract = AVATAR_COMPONENTS
    .map((component, index) => `${String(index + 1).padStart(2, "0")}. ${component.file} — ${component.layer}`)
    .join("\n");

  return `You are an expert prompt writer for production-ready 2D character asset sheets.

Turn the short character context below into one exact image-generation prompt. The prompt must produce one single dress-up template image containing all 14 Creator Buddy avatar parts as separate, non-overlapping art pieces.

CHARACTER CONTEXT
${context.trim()}

REQUIRED OUTPUT
- Return only the final image prompt.
- Do not add a preface, explanation, markdown, quotation marks, or follow-up question.
- Expand the short context into a clear, coherent character design. Keep unspecified choices tasteful and consistent.
- Describe one polished 2D art style, one fixed color palette, and even front lighting.

IMAGE AND LAYOUT CONTRACT
- One high-resolution square asset sheet on a perfectly flat pure white (#FFFFFF) background.
- A clean dress-up / paper-doll template, not an assembled character, scene, turnaround, or pose sheet.
- Use an invisible, exact 4-column by 4-row grid. The grid is a placement rule only: do not draw cell lines, borders, labels, numbers, or guides.
- Place exactly one isolated asset entirely inside each occupied cell and leave the two empty cells completely pure white. Keep a generous white margin inside every cell so no asset touches, overlaps, or crosses a cell boundary.
- No text, arrows, swatches, shadows, glow, scenery, props, watermark, or signature.
- Every piece uses the same straight-on orthographic camera, neutral pose, scale logic, line work, rendering, colors, and lighting.
- Use this exact cell map: row 1 = body-base, head-base, hair-base, EMPTY; row 2 = eyes-open, eyes-closed, mouth-idle, mouth-small; row 3 = mouth-medium, mouth-wide, mouth-A, mouth-I; row 4 = mouth-U, mouth-E, mouth-O, EMPTY.
- The first three cells are the large base pieces. The eye and mouth cells contain only their small expression assets, centered within their own cells.
- Preserve bilateral symmetry and a level head. No perspective tilt or three-quarter view.
- The body is a front-facing half body with level shoulders and relaxed arms.
- The body and head must be two clearly separate pieces with a wide white gap between them.
- Show the head as a clean floating head. Do not draw a neck, neck skin, or neck stump on the head or body.
- The head, hair, eye pairs, and mouth shapes must be mutually compatible when centered over the body.
- Do not show a complete assembled avatar anywhere on the sheet.
- Each piece must contain only the named content. Do not repeat skin, face, hair, eyes, mouth, clothing, or outlines from another piece.
- Treat idle, small, medium, and wide as the primary stable mouth-animation sequence: keep their center point, width logic, line weight, lip details, and scale consistent while only the opening amount changes.
- Keep A, I, U, E, and O as reserved compatibility layers. Keep them compatible with the primary sequence, but never substitute them for idle, small, medium, or wide.

EXACT 14-PIECE LAYER CONTRACT, IN READING ORDER
${layerContract}

CONSISTENCY CHECK
- The open and closed eye pairs have identical size and placement relative to each other.
- All nine mouths belong to the same character and keep one consistent width, center point, lip style, teeth style, and tongue style while changing only the requested articulation.
- The hair fits the bare head silhouette.
- The floating head ends cleanly at the jaw and chin. The body may have a collar opening, but it must not contain a neck.
- The result must be easy to cut into 14 separate PNG layers by scanning the occupied cells in row order and assemble in a layered avatar editor.

Write the final prompt now.`;
}
