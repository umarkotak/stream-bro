# Roadmap and user TODO

## Now

- [x] Product home with feature navigation.
- [x] Layered 512×512 avatar stage with safe placeholders.
- [x] Manual blink, mouth, and movement controls.
- [x] Webcam face landmark tracking with local model files.
- [x] Avatar Prompt Helper with direct PNG saving.
- [x] Avatar pack selection during camera use.
- [x] PSD Avatar Studio V2 with one-file local loading and a fixed layer contract.
- [x] Smooth head, body, hair, independent blink, gaze, brow, and A/I/U/E/O visual mouth tracking.
- [x] Local PSD Template Editor with paste, upload, positioning, scale, preview, and layered PSD export.
- [x] Route studios by product level: V1 Basic, V1 PSD, and V2 PSD.
- [x] Route PSD editors by matching V1 and V2 contracts.
- [x] Compact full-width desktop application shell.
- [x] Hybrid V1 PSD studio with camera eyes/head tracking and selectable video or microphone mouth input.
- [x] One 13-layer V1 editor PSD shared by camera and voice studios.
- [x] Existing PSD import in the shared V1 and V2 editor.
- [ ] OBS-ready transparent output route.

## User asset TODO

Create transparent 512×512 PNGs with identical alignment, then place them in `apps/web/public/avatar/default/`:

- [ ] `body-base.png`
- [ ] `hair-base.png`
- [ ] `eye-state-open.png`
- [ ] `eye-state-closed.png`
- [ ] `mouth-state-idle.png`
- [ ] `mouth-state-small.png`
- [ ] `mouth-state-medium.png`
- [ ] `mouth-state-wide.png`

For the shared V1 editor PSD, also paste art into these editor layers:

- [ ] `mouth-state-a.png`
- [ ] `mouth-state-i.png`
- [ ] `mouth-state-u.png`
- [ ] `mouth-state-e.png`
- [ ] `mouth-state-o.png`

The PNG studio detects the first eight names from the public avatar folder. The PSD studios read all layer art from the exported V1 PSD.

## Open decisions

- Choose the first art style and avatar name.
- Decide whether v1 tracking must work fully offline.
- Choose OBS integration: browser-source URL, virtual camera, or both.
- Decide whether V2 should reuse or improve the V1 audio vowel classifier.
