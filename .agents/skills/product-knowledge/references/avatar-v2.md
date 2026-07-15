# PSD Avatar V2

## Goal

Load one local half-body PSD and drive its parts from webcam face tracking. V1 PNG-pack behavior stays unchanged.

## Product routes

- `/studio/avatar-v2`: robust PSD tracking studio.
- `/editor/psd/avatar-v2`: robust PSD editor.
- Old `/avatar-v2` and `/avatar-v2-editor` requests redirect to these routes.

## File contract

- Use a transparent PSD. Square and 2048×2048 are recommended for source art.
- Use RGB, 8 bits per channel, and final raster layers.
- PSD groups are allowed. Matching uses leaf layer names.
- Names are case-insensitive. Spaces and underscores normalize to hyphens.
- Required names must be unique.
- The public user copy is `apps/web/public/avatar-v2-psd-spec.txt`.
- The full required and optional layer list is defined once in `apps/web/lib/avatar-v2.js`.

## Runtime

- `/studio/avatar-v2` loads the PSD in the browser with `ag-psd`. The PSD is not uploaded.
- The browser converts recognized PSD layer canvases into temporary object URLs and revokes old URLs when a PSD is replaced or the page closes.
- Unknown and duplicate layer names do not render. Missing required layers are shown in the layer checklist.
- Body and neck use reduced head motion. Face parts follow full head motion. Hair adds light follow-through.
- Eye balls follow gaze. Each eye blinks independently. Brows move independently.
- Exactly one mouth layer is visible: idle, A, I, U, E, or O.
- Mouth choice uses jaw, funnel, pucker, smile, stretch, and press blendshapes. A short hold removes rapid state flicker.
- All numeric motion limits and smoothing values live in `AVATAR_V2_MOTION`.
- Manual mouth and blink controls remain available when camera tracking is off or unavailable.

## PSD Template Editor

- `/editor/psd/avatar-v2` is the local entry point for building a compatible PSD without Photoshop setup work.
- It can import an existing layered PSD and map matching leaf names into the editor. Position and raster size are kept; unknown layers are ignored and missing layers remain empty.
- A non-square imported PSD is placed on a square canvas using its larger dimension without blocking the import.
- It starts with every required V2 layer name. Optional layers are not added by the simple editor.
- Select one layer, paste a clipboard image or choose a PNG/JPEG/WebP, then drag it on the square canvas.
- X, Y, scale, visibility, fit, center, and clear controls apply to the selected layer.
- Paste, clear, fit, visibility, position, scale, and completed drag moves support undo and redo.
- A drag creates one history step instead of one step per pointer movement.
- Changing canvas size rescales every layer and safely resets incompatible history.
- Canvas choices are 512, 1024, and 2048 square pixels. The default is 1024.
- Full-canvas images keep exact scale when their size matches the editor canvas.
- The preview shows one mouth state at a time. Selecting a closed-eye layer hides that side's open eye parts.
- Export creates a real RGB layered PSD in the browser. Alternate mouth and closed-eye layers start hidden.
- Image import uses browser load events instead of `Image.decode()`, which keeps paste and upload compatible across more browsers.
- Export forces normal transparent layers, trims empty layer bounds, skips fragile thumbnail generation, and attaches the download link before clicking it.
- Export includes empty named layers, but V2 Studio reports an empty required layer as missing until art is added.
- Editor images live only in memory. Leaving the page clears the draft.

## Interface rule

- Home, studios, and PSD editors use a compact full-width desktop shell.
- All three studios use the same two-column `StudioWorkspace` layout.
- Both PSD editors use the same three-column `PsdEditorWorkspace` layout.
- Keep page titles small. Give the stage or editor canvas most of the viewport.
- Main navigation groups four studios, two editors, and the prompt helper.
- Mobile-specific layout work is not required for this version.

## PSD parser limits

- Use PSD, not PSB.
- Final raster layers are the stable contract. Do not rely on editable text, vectors, smart-object behavior, or unsupported Photoshop effects.
- Runtime testing is manual. Production build is the required automated check.

## Acceptance

- Home and main navigation link to PSD Avatar Studio.
- Home and main navigation link to PSD Template Editor.
- A valid PSD shows all recognized layers without an upload.
- Missing names remain clear and do not block the layers that exist.
- Tracking is smooth and keeps manual fallback controls.
- Blink, eye gaze, brows, head, body follow, hair follow-through, and A/I/U/E/O mouth states are handled.
- The editor exports the exact required layer names and keeps placed art aligned.
