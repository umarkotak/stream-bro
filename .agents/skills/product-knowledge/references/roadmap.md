# Roadmap and user TODO

## Now

- [x] Product home with feature navigation.
- [x] Layered 512×512 avatar stage with safe placeholders.
- [x] Manual blink, mouth, and movement controls.
- [x] Webcam face landmark tracking with local model files.
- [x] Avatar Prompt Helper with direct PNG saving.
- [x] Avatar pack selection during camera use.
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
- Decide whether mouth states use simple openness or full phoneme shapes.
