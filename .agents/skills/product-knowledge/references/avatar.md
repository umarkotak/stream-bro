# Avatar V1

## Goal

Load one simple PSD and create a fluid half-body avatar for OBS. Camera tracking drives body position, head rotation, blink, and video mouth states. Microphone mode replaces only mouth input with A/I/U/E/O detection. Processing stays in the browser.

## Product routes

- `/studio/avatar-v1`: the only V1 studio.
- `/editor/psd/avatar-v1`: the matching V1 PSD editor.
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
- `head-base.png` contains the head, face skin, ears, and neck without hair, eyes, or mouth.
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
- No layer is active when the editor opens or finishes a PSD import. The user must select a layer from the left list before paste, upload, drag, or resize controls become active.
- Clicking canvas art never changes the selected layer. Only the selected layer receives pointer input.
- Dragging snaps the selected layer's X position to the horizontal canvas center within a small screen-space threshold. A vertical guide appears while snapped. Y movement stays free and has no center snap.
- It supports paste, image selection, position, scale, visibility, fit, clear, undo, redo, and layered PSD export.
- Import PSD maps matching leaf layers into the editor while keeping raster size and canvas position.
- Unknown imported layers are ignored. Missing layers remain empty.
- Alternate eye and mouth layers export hidden so exactly one state is shown by default.

## Prompt helper

- Avatar Prompt Helper first creates one master prompt for a complete neutral character.
- The user generates that master image externally, then attaches it as the fixed reference for each derivative layer prompt.
- The helper never shows full prompt text. It exposes copy buttons for the master and selected derivative layers.
- The user can select any subset of the 14 V1 layers, grouped as Base, Eyes, Video mouth, and Voice A/I/U/E/O.
- Derivative prompts lock design, canvas, scale, and coordinates to the attached master while asking for only one named layer.
- White or transparent backgrounds are supported; white remains the default for wider image-model support.
- Character context, prepared context, background, and selected layers stay in local storage.

## Acceptance

- Home and navigation expose one V1 studio and one V1 editor.
- Old V1 studio URLs redirect to the new studio.
- Body, head, and hair move as separate smoothed groups.
- Exactly one eye state and one mouth state render.
- Video and microphone mouth modes both use the same 14-layer PSD.
- A valid imported or exported PSD keeps layer alignment.
- The stage remains suitable for OBS capture.
