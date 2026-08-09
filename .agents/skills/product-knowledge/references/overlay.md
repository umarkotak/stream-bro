# OBS Avatar Overlay

## Goal

Create one copyable URL for an OBS Browser Source. The output page contains only the avatar on a solid `#00ff00` green background for chroma keying. Camera and optional microphone processing stay local inside the browser source.

## Routes

- `/virtual-avatar/v1/live`: setup page. This is the user entry point.
- `/virtual-avatar/v1/live/avatar?...`: character-only transparent renderer for OBS.
- Opening the renderer without a model query returns the user to setup.
- Home and main navigation expose Overlay.

## Model contract

- Overlay models are public avatar packs from `apps/web/public/avatar/<pack-id>`.
- Pack IDs and available files come from `apps/web/public/avatar/packs.json` through `/api/avatar-assets`.
- The V1 PSD editor can create or replace a public pack through `/api/avatar-assets`.
- Public files are required because a copied URL cannot carry a local PSD or share another browser's in-memory file.
- The renderer supports the V1 base, hair, eye, video-mouth, and A/I/U/E/O filenames. `head-base.png` is optional for legacy packs whose `body-base.png` already includes the head.
- Missing files do not show placeholders or error UI in OBS.
- A version query is added when the URL is generated so newly selected assets load without stale image cache.

## Setup

- The setup uses a fixed desktop workspace with the preview on the left and scrolling controls on the right.
- Model loading shows loading, ready, and error states with a retry action.
- Model loading tries the no-cache API first, then falls back to the static `packs.json` manifest.
- Model selection lists public packs.
- Tracking can be on or off.
- Camera mouth tracking is always available.
- Mouth animation has three shared modes: Camera motion (default), Microphone level (stable speech movement using the four core mouth layers), and Microphone vowels (experimental and available only with all five vowel layers).
- Scale, horizontal position, and vertical position are encoded in the URL.
- Setup is saved in local storage.
- The page provides Copy overlay URL and Open overlay actions.
- Recommended OBS Browser Source size is 1920×1080.

## Renderer

- The page has no navigation, controls, text, or checkerboard.
- HTML, body, and the Next root use a solid `#00ff00` green background. Avatar renderer surfaces stay transparent so the green shows behind the model.
- The public pack loads directly from stable asset URLs.
- Tracking uses the same expression shape, motion limits, smoothing, face-center calibration, blink threshold, and mouth bands as `/virtual-avatar/v1/studio`.
- Body, head, and hair render as the same separate V1 motion groups. Hair uses the same subtle lag and gravity response.
- Legacy packs without `head-base.png` keep their layers aligned with body-only motion.
- Microphone mode keeps camera head and blink tracking but uses local formant matching for A/I/U/E/O.
- If media access or the tracker fails, the avatar stays visible in its idle pose.
- All media tracks, animation frames, the face landmarker, and audio nodes close when the source unloads.

## URL contract

- `pack`: public avatar pack ID.
- `tracking`: `1` for automatic local tracking, `0` for idle pose.
- `mouth`: `camera`, `volume`, or `vowel`. Legacy `video` and `voice` values normalize to `camera` and `volume`.
- `scale`: 40–180 percent.
- `x`: horizontal anchor, 0–100 percent.
- `y`: vertical anchor, 0–100 percent.
- `v`: asset cache revision.

## Acceptance

- Setup generates a full copyable URL.
- A valid renderer URL shows only the selected character.
- The output background remains solid `#00ff00` green in OBS for chroma keying.
- Position and scale match setup.
- Camera and supported microphone modes animate locally.
- A blocked camera leaves a clean idle avatar instead of setup or error UI.
