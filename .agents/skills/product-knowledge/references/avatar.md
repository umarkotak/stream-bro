# Layered avatar

## Goal

Render a square transparent layered avatar for OBS. Camera tracking changes face layers and movement. Microphone tracking can select A/I/U/E/O mouth layers. All detection stays in the browser.

## Product routes

- `/studio/avatar-v1-basic`: original eight-file PNG studio.
- `/studio/avatar-v1-psd`: the same simple avatar stored in one PSD.
- `/studio/avatar-v1-psd-voice`: hybrid V1 PSD studio. Camera always tracks eyes and head; mouth input can use video or microphone.
- `/editor/psd/avatar-v1`: shared V1 PSD editor for both camera and voice studios.
- Old `/avatar` requests redirect to `/studio/avatar-v1-basic`.
- All avatar studios render through `components/StudioWorkspace.js` so stage, status, footer, and control geometry stay identical.

## MVP asset contract

Each avatar pack uses eight transparent PNG files in `apps/web/public/avatar/<pack>/`. `default` is the first pack. Images should be square; 512×512 is recommended. Every file should share the same canvas origin, but upload dimensions are not enforced.

| Stack | File | Use |
| --- | --- | --- |
| 1 | `body-base.png` | Base body and head |
| 2 | `hair-base.png` | Hair above the body |
| 3 | `eye-state-open.png` | Normal eyes |
| 3 | `eye-state-closed.png` | Blink |
| 4 | `mouth-state-idle.png` | Closed/resting mouth |
| 4 | `mouth-state-small.png` | Quiet speech |
| 4 | `mouth-state-medium.png` | Normal speech |
| 4 | `mouth-state-wide.png` | Loud/open speech |

Minimum: 8 images. Recommended next assets: half-closed eyes, rounded O mouth, smile mouth, and optional foreground accessories.

## V1 PSD contract

- The PSD uses the same eight names as the PNG files, including the `.png` suffix.
- Each name is a leaf PSD layer: `body-base.png`, `hair-base.png`, both eye states, and all four mouth states.
- One editor PSD has 13 layers: the original eight plus `mouth-state-a.png`, `mouth-state-i.png`, `mouth-state-u.png`, `mouth-state-e.png`, and `mouth-state-o.png`.
- The camera V1 PSD studio reads the original eight layers. The hybrid voice studio reads all 13 layers so its Video option can use small/medium/wide and its Microphone option can use A/I/U/E/O.
- V1 PSD tracking keeps the same blink, mouth-open bands, head movement, smoothing, and manual fallback as V1 Basic.
- `/studio/avatar-v1-psd-voice` always uses camera tracking for blink and head movement. Its mouth source is selectable before tracking starts.
- Video mouth mode uses camera jaw-open bands. Microphone mouth mode requests camera and microphone together, then uses local Web Audio formant matching. It does not send audio or perform speech recognition.
- Voice sensitivity is adjustable. A short stability hold reduces rapid vowel flicker, and silence selects the idle mouth.
- `/editor/psd/avatar-v1` shares the stable editor engine with V2 and creates all 13 V1 layers.
- Both PSD editors can import an existing PSD. Matching leaf layers keep their canvas position and size; unknown layers are ignored and missing contract layers stay empty.
- Both PSD editors render through `components/PsdEditorWorkspace.js` and share `useEditorHistory`.
- The V1 editor previews one eye state and one mouth state at a time. Alternate layers export hidden.

## Runtime behavior

- Stack layers at the same size and origin.
- Show built-in placeholders when a PNG is absent.
- Fetch each declared PNG once per pack load with `cache: "no-store"`.
- Turn fetched PNGs into temporary object URLs so the browser cannot reuse a stale image response.
- Show the full saved pack count from the manifest, not only the currently active eye and mouth states.
- Use the pack manifest as the single source for every found/needed label and layer request.
- Reload image URLs with a new cache-busting key whenever an avatar pack is selected or refreshed.
- Return the pack manifest API with no-store caching.
- Load every eye and mouth state when a pack is selected, then switch visibility without mounting new images during tracking.
- Keep image load state inside one keyed stage instance per pack refresh. Do not share it with the page.
- Render all loaded state images once. Use direct inline `display` values so exactly one eye and one mouth state is visible.
- Do not depend on hidden image load events. Fetch the file, decode it, then update the full layer set together.
- Hide each placeholder directly from the active file's load result. Do not use CSS relational selectors for renderer state.
- Configure all movement in `apps/web/lib/avatar.js` through `AVATAR_MOTION_CONFIG`.
- Current movement limits: horizontal ±32 px, vertical ±24 px, and rotation ±18°.
- Use the Scan assets button after adding files; replace placeholders without code changes.
- Select any discovered avatar pack in Avatar Studio before or during camera tracking.
- Use Avatar Prompt Helper to turn one character brief into eight alignment-safe prompts.
- Allow the helper to save validated PNG files directly into the chosen public avatar pack without dimension checks.
- Let prompt generation use a white or transparent background. Default to white for wider image-model support.
- Persist the helper draft, generated state, selected pack, background choice, and upload progress in local storage.
- Blink when both eye-blink scores pass the calibrated threshold.
- Choose mouth state from jaw-open score bands.
- Map head yaw, pitch, and roll to small, smoothed avatar movement. Limit motion to avoid nausea and edge clipping.
- Provide manual eye, mouth, and movement controls when camera or tracking is unavailable.
- Mirror the camera preview, but keep avatar motion natural to the user.
- Expose a clean square stage that can be captured in OBS.

## Acceptance

- Home page links to Avatar Studio.
- Home page and navigation link to Avatar Prompt Helper.
- Studio works with placeholders before art exists.
- Camera permission is requested only after a user action.
- Microphone permission is requested only when Microphone mouth mode is selected and tracking starts.
- Permission or model errors keep manual controls usable.
- Custom files load by the fixed contract with no code edit.
- Saved packs appear in Avatar Studio selection.
- Layout works on phone and desktop and includes reduced-motion support.

## Later extension

Represent layers as ordered configuration entries with state groups. New layers must not require rewriting the renderer. Add calibration persistence, transparent OBS output, and mouth phoneme mapping after the MVP.
