# Roadmap and user TODO

## Now

- [x] Product home with feature navigation.
- [x] One consolidated `/studio/avatar-v1` route.
- [x] One matching `/editor/psd/avatar-v1` route with PSD import and export.
- [x] Separate body, head, and hair V1 motion groups.
- [x] Slow body movement inferred from camera face position.
- [x] Independent head yaw, pitch, and tilt.
- [x] Subtle hair lag and gravity response.
- [x] Video and microphone mouth input options.
- [x] Local A/I/U/E/O microphone mouth selection.
- [x] Master-reference prompt flow with selectable V1 derivative layers.
- [x] Selection-first PSD editing with horizontal-center snap and free Y movement.
- [x] Selected-layer rotation and direct pen/eraser drawing in both PSD editors.
- [x] Fixed desktop PSD workspace with left tools, center canvas, and right layer stack.
- [x] V2 studio and editor remain available.
- [x] Compact full-width desktop application shell.
- [x] OBS-ready transparent browser-source setup and output routes.

## User asset TODO

Create aligned square art, then paste it into `/editor/psd/avatar-v1` or import a compatible PSD:

- [ ] `body-base.png` — body and clothes only
- [ ] `head-base.png` — head, face skin, ears, and neck
- [ ] `hair-base.png`
- [ ] `eye-state-open.png`
- [ ] `eye-state-closed.png`
- [ ] `mouth-state-idle.png`
- [ ] `mouth-state-small.png`
- [ ] `mouth-state-medium.png`
- [ ] `mouth-state-wide.png`
- [ ] `mouth-state-a.png`
- [ ] `mouth-state-i.png`
- [ ] `mouth-state-u.png`
- [ ] `mouth-state-e.png`
- [ ] `mouth-state-o.png`

## Open decisions

- Choose the first art style and avatar name.
- Decide whether V1 later needs true pose landmarks instead of face-position body inference.
- Decide whether to add a virtual-camera output after the browser-source URL.
- Decide whether V2 should reuse or improve the V1 audio vowel classifier.
