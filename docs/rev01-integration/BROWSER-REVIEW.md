# Rev01 browser verification

24 October 2026. Integration evidence accepted; physical-device and human play acceptance remain the owner cards in MANUAL-CHECKS.md. All ticket source reviews and focused re-reviews ACCEPT.

## Evidence

- **30 required JPEGs:** three stages × card/play/boss/pause/result × 640×360 at 1x and 1280×720 at 2x. All 30 final files visually inspected. **38 supplemental JPEGs** cover nova/dense normal/calm on every stage, boss intact/cue/defeat/calm, seven bank poses, PHASE banners, settings/controls, player death/loss and title. Files are in `.test-output/integration/`; exact dimensions/SHA256/state are in `browser-captures-final.json`.
- Two native 640×360 PNGs (`stage1-play-native.png`, `stage1-boss-native.png`) were exported from the current GPU canvas and inspected, independently of JPEG compression. No screenshot was rebuilt, retouched or enlarged offline.
- Codex in-app browser, actual production GPU renderer ready, backing 640×360, observed DPR 1, measured CSS 640×360/1280×720 and k1/k2. Sparse nova atlas 2048×416 registered; normal nova visibly uses its tiles, calm uses its substitute. Adapter identity is unavailable through the public API.
- Captures use full-page browser screenshots of the complete emulated viewport. Viewport-only screenshots clipped wide pages to the side panel. Two early resize/compositor captures were replaced by fresh-navigation captures; the final 30 headers and complete compositions were checked. These are browser viewport checks, not physical Windows scaling evidence.
- Seeded/frozen presets run actual production scenes/renderers/assets and are labelled presentation-only. Their populations/HP/clocks are illustrative, not reachability evidence. Normal headless campaign 9/9 clears and ordinary browser smoke are separate.
- The built production site on loopback port 4173 passed title→launch→held fire→pause at 2x, backing 640×360, no error overlay, no console warnings/errors. Existing boss-review pages for stages 2/3 load without errors. Normal browser-campaign entered stage 1 and progressed through waves with score/hull updates and no errors; it was a smoke run, not a full rendered campaign clear.
- Manual routes for all three stages load ordinary rules. Stage 1 exercised move/held primary/Nova/pause, pointer SETTINGS, reduced motion toggle, BACK and RESUME; time stayed at 26.6167 through pause/settings and advanced on resume. Stage 2 calm and stage 3 normal launch/fire/pause smoke passed; stage 3 CONTROLS opened by pointer. Data: `browser-manual-checks.json`, `browser-page-smoke.json`, `production-browser.json`.
- Nonfatal overload/dropped-tick diagnostics occurred on long-lived tool-controlled pages and are retained in metadata. Fatal errors and console warnings/errors were absent in accepted captures/smokes. No performance, audible balance or uninterrupted real-time play claim follows from these checks.

Durable automated results and the complete 30-file matrix: `evidence/rev01-integration-2026-10-24/T5-automated.json` and `browser-summary.json`.

## Gate comparison

Every row below covers both 1x/2x files named `stageN-S-{1,2}x.jpg`. Gates 1–4 combat studies and gate 5 layout/font/menu studies were inspected alongside the running renderer captures. Later approved gate 4/5 states take precedence over older studies.

| Stage | View | Comparison and result |
| --- | --- | --- |
| 1 | card | Gate 5 Breakwater title-card and stageCard strip: same 240×60 art/position, numeral/name/sector marks. PASS |
| 1 | play | Gates 1/2 player/projectiles and gate 4 beam/effects; gate 5 HUD positions. Same native silhouettes and threat hierarchy, empty plasma bar as decided. PASS |
| 1 | boss | Gate 2 Gatebreaker states/turrets and gate 5 boss HUD: native hull, one down turret, flipped right part, exact bars/mark/GAP font. PASS |
| 1 | pause | Gate 5 Breakwater pause: same panel/item/footer geometry and dim treatment. PASS |
| 1 | result | Gate 5 sector result plate/panel/text: same kit/positions; actual frozen stage remains dim underneath. PASS |
| 2 | card | Gate 5 stageCard strip: correct 2/Furnace art, number/name/marks at identical native placement. PASS |
| 2 | play | Gate 3 dim Furnace setting, gate 4 minelayer/mine/pickup/lanes and gate 5 HUD: quiet centre, clear native roles/cores. PASS |
| 2 | boss | Gates 3/4 rotated chain and gate 5 boss layout: head/three sections, middle husk, couplings and damaged loop. Keeps the game's three sections; one illustrative gate 5 sheet depicts four. PASS |
| 2 | pause | Same gate 5 pause kit over the frozen Furnace stage; no enlarged text/slices. PASS |
| 2 | result | Gate 5 Furnace sector-secured plate/stats/items: same layout; expired defeat pose leaves a cleared battlefield. PASS |
| 3 | card | Gate 5 stageCard strip: correct 3/Citadel art/name/three marks. PASS |
| 3 | play | Gate 3 Citadel setting and gates 4/5 threat/HUD studies: quiet centre and readable projectile shapes/lanes. PASS |
| 3 | boss | Gate 3 Engine states/emitters, gate 4 surge and gate 5 HUD: native phase hull/down emitter/mark layout. PASS |
| 3 | pause | Same gate 5 pause kit/dim/footer over Citadel. PASS |
| 3 | result | Gate 5 Citadel victory: THE SKY IS YOURS plate, centred stats, native controls; actual stage underlay remains dim. PASS |

Supplement comparisons: the gate 2 seven-pose player strip versus extreme/neutral runtime poses confirms fixed core and attached exhaust/shot sockets; tests cover all seven. Gate 2 needle ring and gate 4 warning/lanes match the runtime shape/width hierarchy. Normal nova retains a coherent white/gold/orange front without visible tile seams and crosses HUD beneath lanes/bullets; gate 2 novaCalm and gate 4 calm cues give a much smaller quiet substitute. Dense calm shows the gold player bracket and low-hull pip shape instead of blinking. Gate 5 font sample/settings/controls/result plates match native glyph metrics and kit edges. No new required art was discovered.

Expected differences: runtime keeps its existing 17% background tint/starfield; raw gate backgrounds are brighter. Scores, progression, spawn positions and populations differ from illustrative sheets. Plasma stays unused/empty, even where gate studies demonstrate charged effects. The gate 5 footer can overlap the faint dimmed HUD hint; the same ghost text appears in the approved reference and remains an owner readability check.

## Remaining limits and existing issues

- Owner checks: physical 2x/3x Windows/DPR scaling, physical gamepad, audible mix, dense-combat accessibility and feel after 4/3 migration/approved sockets. Still screenshots do not establish animation/feel acceptance.
- A pause tap immediately during Nova hit-stop can be consumed. A finite actual-stage probe reproduced the same behavior in immutable main and this integration: early tap leaves playing, repeated tap after freeze pauses. No gameplay/input timing change was made. Evidence: `.test-output/integration/pause-hitstop-probe.json`.
- Existing art coverage: interceptor/Kiln head attacks retain code cues; damaged Gatebreaker core cue composites existing authored pixels; Kiln section fans retain their original head-relative origins. Title wordmark remains small at native font size; further redesign is excluded. These are recorded limitations, not requests to invent art.
- Historical read-only `art/rev01/tools/sample_colors.py` depends on deleted old raster/metadata inputs and cannot be rerun from this cleanup checkout. Rev01 source/export bytes remain intact. Plasma mechanics, tall mode and extra title redesign remain outside scope.
