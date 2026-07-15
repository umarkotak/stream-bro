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

The app detects these names and replaces placeholders. No import or code change is needed.

## Open decisions

- Choose the first art style and avatar name.
- Decide whether v1 tracking must work fully offline.
- Choose OBS integration: browser-source URL, virtual camera, or both.
- Decide whether PSD Avatar V2 later adds audio phoneme detection beyond visual A/I/U/E/O mouth-shape tracking.
