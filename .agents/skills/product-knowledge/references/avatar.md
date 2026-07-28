# Avatar V1

## Goal

Load one simple PSD and create a fluid half-body avatar for OBS. Camera tracking drives body position, head rotation, blink, and video mouth states. Microphone mode replaces only mouth input with A/I/U/E/O detection. Processing stays in the browser.

## Product routes

- `/studio/avatar-v1`: the only V1 studio.
- `/editor/psd/avatar-v1`: the matching V1 PSD editor.
- `/overlay`: configure the public-pack transparent OBS overlay.
- `/overlay/avatar`: character-only OBS renderer driven by URL settings.
- Old `/avatar`, `/studio/avatar-v1-basic`, `/studio/avatar-v1-psd`, and `/studio/avatar-v1-psd-voice` requests redirect to `/studio/avatar-v1`.
- V2 remains available and unchanged.

## PSD contract

The V1 PSD has 14 required leaf layers. Names include `.png`.

| Part | Layer names |
| --- | --- |
| Body | `body-base.png` |
| Head | `head-base.png` |
| Hair | `hair-base.png` |
| Eyes | `eye-state-open.png`, `eye-state-closed.png` |
| Video mouth | `mouth-state-idle.png`, `mouth-state-small.png`, `mouth-state-medium.png`, `mouth-state-wide.png` |
| Microphone mouth | `mouth-state-a.png`, `mouth-state-i.png`, `mouth-state-u.png`, `mouth-state-e.png`, `mouth-state-o.png` |

- `body-base.png` contains only the half body, clothes, shoulders, and arms.
- `head-base.png` contains a floating head, face skin, and ears without neck, hair, eyes, or mouth.
- All layers share one square canvas and alignment. 512×512 is recommended, not enforced.
- Matching is case-insensitive. Spaces and underscores normalize to hyphens.
- Unknown layers are ignored. Missing required layers remain visible in the checklist.

## Motion

- Camera face-center movement is a simple upper-body movement proxy. It drives the body slowly and smoothly.
- Head yaw, pitch, and roll move independently with faster smoothing.
- Head, eye, and mouth layers inherit body motion.
- Hair inherits body and head motion, then adds slow lag and a small counter-rotation to suggest gravity.
- Body, head, and hair limits and smoothing live in `V1_AVATAR_MOTION` inside `apps/web/lib/avatar-v1-psd.js`.
- The body origin is calibrated when tracking starts and resets when tracking stops.

## Mouth input

- Video mode uses camera jaw-open bands: idle, small, medium, and wide.
- Microphone mode still uses the camera for body, head, and eyes. It uses local Web Audio formant matching only for idle and A/I/U/E/O.
- Voice sensitivity is adjustable. A short hold reduces rapid vowel flicker.
- Camera and microphone permission are requested only after Start tracking is pressed.
- Permission or model errors keep manual eyes and mouth controls available.

## PSD editor

- The V1 editor starts with all 14 exact layer names.
- No layer is active when the editor opens or finishes a PSD import. The user must select a layer from the left list before paste, upload, drag, resize, rotate, or drawing controls become active.
- Clicking canvas art never changes the selected layer. Only the selected layer receives pointer input.
- Dragging snaps the selected layer's X position to the horizontal canvas center within a small screen-space threshold. A vertical guide appears while snapped. Y movement stays free and has no center snap.
- Transform mode supports position, scale, rotation, visibility, fit, and clear.
- In the V1 editor, selected artwork has a Canva-style bounding box. Drag any corner to resize it proportionally around the opposite corner. Drag the rotate control at the top of the box to follow the pointer; hold Shift to snap rotation to 15° steps.
- Paint mode works on blank or loaded layers. The selected layer stays fully visible while other relevant layers remain as faint, non-interactive positioning guides.
- Pen, eraser, brush size, color, and clear controls are in the left tool panel. Guide opacity is controlled by the editor CSS variable `--paint-reference-opacity`.
- Starting to paint a loaded layer bakes its current position, scale, and rotation into a full-canvas raster.
- Each completed paint stroke is one undo step.
- It also supports paste, image selection, undo, redo, and layered PSD export.
- The V1 editor can save every filled layer directly as a public OBS avatar pack.
- Save to OBS opens a state-controlled modal where the user enters the pack name, then confirms the write. Cancel, backdrop click, and Escape always close it.
- Public-pack export bakes each layer's position, scale, and rotation into a full-canvas transparent PNG, updates `packs.json`, and removes stale known layers from the same pack.
- The saved pack becomes the selected model when the user opens Overlay setup.
- Import PSD maps matching leaf layers into the editor while keeping raster size and canvas position.
- Unknown imported layers are ignored. Missing layers remain empty.
- Alternate eye and mouth layers export hidden so exactly one state is shown by default.
- The editor is a fixed desktop workspace with no site navbar or page scroll. A compact top bar holds Back, file settings, PSD import, history, studio, and export actions.
- Tools and active-layer settings are on the left, the canvas is centered, and the internally scrolling layer stack is on the right.
- Layer rows provide artwork thumbnails, selection state, and direct visibility toggles. Undo and redo also support Ctrl/Cmd keyboard shortcuts.

## Prompt helper

- Avatar Prompt Builder accepts one short character context.
- It turns that context into a visible structured request that the user copies into a text LLM.
- The LLM is instructed to return only one exact image-generation prompt.
- The user sends the returned prompt to an external image tool, then brings the generated sheet back into the builder.
- The target image is one high-resolution portrait dress-up sheet with all 14 V1 parts separated and arranged in a fixed reading order.
- The body and head are separate pieces with a wide gap. The head floats and no neck or neck stump is drawn on the head or body.
- The sheet uses a flat white background for easy cutting. It has no labels, dividers, complete assembled avatar, or overlapping pieces.
- Image Breakdown accepts a selected image file or an image pasted from the system clipboard.
- Breakdown runs only in the browser. It removes edge-connected transparent or white background, detects separated artwork, and groups nearby fragments toward the 14-part contract.
- Detected pieces are auto-mapped to V1 layers in reading order. The user can inspect each transparent preview and change its one-to-one layer assignment.
- PSD export includes every required V1 layer name. Mapped artwork keeps its source scale and is centered so the user can position, resize, rotate, paint, and finish it in the V1 PSD editor.
- The page always shows the complete grouped V1 layer contract: Base, Eyes, Video mouth, and Voice.
- Character context and prepared context stay in local storage. Source images and detected artwork stay only in memory.

## Acceptance

- Home and navigation expose one V1 studio and one V1 editor.
- Old V1 studio URLs redirect to the new studio.
- Body, head, and hair move as separate smoothed groups.
- Exactly one eye state and one mouth state render.
- Video and microphone mouth modes both use the same 14-layer PSD.
- A valid imported or exported PSD keeps layer alignment.
- The stage remains suitable for OBS capture.
- The public-pack overlay uses the same V1 expression and body, head, and hair motion rules on a transparent OBS browser source.
