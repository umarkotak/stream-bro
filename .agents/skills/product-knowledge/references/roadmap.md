# Roadmap and user TODO

## Now

- [x] Creator Buddy product home with shadcn sidebar navigation.
- [x] One consolidated `/virtual-avatar/v1/studio` route.
- [x] One matching `/virtual-avatar/v1/editor` route with PSD import and export.
- [x] Separate body, head, and hair V1 motion groups.
- [x] Slow body movement inferred from camera face position.
- [x] Independent head yaw, pitch, and tilt.
- [x] Subtle hair lag and gravity response.
- [x] Camera-only mouth input with stable idle, small, medium, and wide states.
- [x] Master-reference prompt flow with selectable V1 derivative layers.
- [x] Selection-first PSD editing with horizontal-center snap and free Y movement.
- [x] Selected-layer rotation and direct pen/eraser drawing in both PSD editors.
- [x] Fixed desktop PSD workspace with left tools, center canvas, and right layer stack.
- [x] Compact full-width desktop application shell.
- [x] OBS-ready `/virtual-avatar/v1/live` setup and output routes.
- [x] Fixed shadcn studio toolbar with breadcrumb navigation and in-stage camera picture-in-picture.
- [x] Flexible shadcn Avatar Prompt Builder with an explicit 4×4 sheet contract and grid-ordered layer breakdown.
- [x] Shared frame-aligned camera mouth controller for Studio and OBS.

## User asset TODO

Create aligned square art, then paste it into `/virtual-avatar/v1/editor` or import a compatible PSD:

- [ ] `body-base.png` — body and clothes only
- [ ] `head-base.png` — floating head, face skin, and ears only
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
