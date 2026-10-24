# T4 HUD, font, menus, screens — implementer report

State: implemented in the T4 worktree (`codex/starfall-rev01-t4`, base = local main `840fc0a` + reviewed T1 snapshot); no commits. **Not reviewed.** Opus/xhigh review follows. Not marked accepted.

Implementer: Claude Opus 5.5 (`claude-opus-5-5`), effort high, single agent, no subagents. Usage/cost is not readable in-session; the orchestrator records it.

## Results

| Check | Result | Log / evidence |
| --- | --- | --- |
| `npm.cmd test` | 76 / 76 pass (60 before T4 + 16 new in `rev01-presentation.test.ts`) | `.test-output/integration/T4/npm-test.log` |
| `npm.cmd run build` | pass (typecheck src + tests, vite build) | `.test-output/integration/T4/npm-build.log` |
| Mutation checks | start-banner suppression removed → 2 tests fail; hit test on release only → 1 test fails; both reverted, 76/76 again | `.test-output/integration/T4/mutation-banner-and-hit.log` |
| Campaign bot, seeds 17/41/83 (extra, not required) | 9 / 9 stages clear; per-stage seconds, hull, kills, boss start identical to the T1 table | `.test-output/integration/T4/campaign-bot.{log,json}` |
| Software render evidence | 10 sheets, 1x + 2x, from the real `drawHud` and menu-scene quads | `.test-output/integration/T4/evidence/*.png`, `evidence.json` |
| art/rev01 | not written (Write/Edit used only on src/tests/docs); 114 files hashed after work | `.test-output/integration/T4/art-hashes-after.txt` |

Main: HEAD = main = `840fc0a` was verified at the start. Later `git status`/`rev-parse` calls were auto-denied (no approval surface). No git command that writes was run.

Evidence is a **software rasterization** of the quad lists the game code produces: nearest sampling, tint multiply, src-over (`tests/helpers/software-frame.ts`). The backdrop is the stage's rev01 background cropped through its pivot and is drawn by the script. The title sheet skips its three legacy painting textures. This is **not** a browser/GPU capture. No browser was run: starting a server needs approval, which is unavailable here. The runtime captures are T5's.

## Changed files

- `src/services/font-assets.ts`: `fontImage()` = `derivedImageAsset("rev01-font-mask", REV01_URLS.font, maskPixels)`. Lazy, stable, still the only font claim. Exports `FONT_MASK_TEXTURE`.
- `src/ui/bitmap-text.ts`: 5x7 font from the strip frames, retextured to the mask id. `drawText`, `textWidth` (6n−1), `centredX`, `glyph`, `FONT`. Input is upper-cased; spaces and missing glyphs only advance. The 3x5 table is gone; a 4-glyph deprecated `text()` shim stays for the two foreign call sites (see Mismatches 1).
- `src/ui/presentation.ts` (new): palette lookups, `TEXT_COLOR` resolved from `presentation.textColors`, top-left native placement, `clipColumns`/`fillColumns` (bar rule), 1-texel slice repeat, 3-slice, 9-slice, `fillRect`, `playbackFrame`.
- `src/ui/menu-layout.ts` (new): panel/item/controls/result geometry from `presentation.screens`. `hitItem` (press and release in the same item rect), meter/toggle mapping, `resultFrame`. Drawing and hit testing share this one layout.
- `src/render/hud.ts`: the rev01 HUD (`drawHud`), the stage card with its own timer (`createStageCard`, `STAGE_CARD_SECONDS`) and banner selection by kind.
- `src/scenes/menu.ts`: native menu kit, `camera.pixelSnap = false`. The title's legacy painting goes through `pixelSnapped`. Settings use fixed labels with controls; result screens use resultPlate frames. Input and lifecycle logic are unchanged.
- `src/world/session.ts`: `BannerKind = "stage" | "sector" | "phase"`, `RunState.bannerKind`, `newRun` → `"stage"`. Nothing else.
- `tests/rev01-presentation.test.ts` (new, 16 tests). `tests/rev01-render-split.test.ts` (native assertions, below). `tests/helpers/software-frame.ts` and `tests/rev01-presentation-evidence.ts` (new, evidence script, not part of `npm test`; run `node --experimental-strip-types tests/rev01-presentation-evidence.ts <dir>`).
- `docs/rev01-integration/T4-REPORT.md` (this file). `DECISIONS.md`: T4 notes appended.

Not touched: shared registries (`rev01-assets.ts`, `rev01-claims.ts`, `config/layers.ts`), T2/T3 renderers, systems, bosses, stage.ts, art.

### Test migration (no weakening)

`rev01-render-split.test.ts`:
- Stage test: rev01 textures were rejected outright. Now the font mask and the registry HUD group (`REV01_CLAIMS.hud`) are allowed **only on HUD-category layers**. Any other texture must still be legacy.
- The legacy rounded-centre check still covers every non-native quad. Native HUD quads (rev01 HUD textures + `hudBand` rects) get a stricter check: top-left corner, width and height all whole pixels. There must be more than 50 such quads per stage.
- The test's banner now sets `bannerKind = "sector"` so it is still drawn.
- Menu test: adds that every screen-category texture is the font mask or the registry screen kit, that font and menuItem quads are present, and that all screen quads sit on whole pixels.
- `menu-lifecycle.test.ts` is unchanged and passes.

## Integration checklist (spec lists, every item)

`presentation.integration`:

| # | Item | Where |
| --- | --- | --- |
| 1 | HUD < nova < lanes < bullets < core; opaque bands | HUD draws only on the T1 `hud` slots (all below `nova`). Bands are opaque (alpha 1, rows 0–30 panel[0] + 31 panel[1]; 336 panel[1] + 337–359 panel[0]). Tests: geometry, layer order. |
| 2 | No charge field → chargeBar has no data | `chargeBar` "empty" at (200, 344) in every state, including reduced motion. No field or behaviour added (test asserts no `charge`/`plasma` key in `newRun()`). |
| 3 | No low-hull state; 7x5 rect pips | `LOW_HULL = 1`. hudPip full/empty; remaining pip(s) loop low-a/low-b (250/250 ms on `run.effectClock`); HULL label in danger. |
| 4 | Banners need a kind | `RunState.bannerKind`. `sector` → normal caps + heading; `phase` → alert caps + danger; `stage` → never drawn (card). Writers: patches P1–P5. |
| 5 | Gatebreaker enrages at hp/2 without bossPhase/banner; 0.5 mark is its cue | Mark drawn at 0.5 (ahead/passed by health). No banner or gameplay added. |
| 6 | Boss name x = 320 − floor((6n−1)/2); Kiln/Engine thresholds match marks | `centredX(name, 320)`, rows 13–19 heading. Marks from spec thresholds at 200 + round(240t) − 1, row 21, above the fill. |
| 7 | Bars: track, then fill columns [0, ceil(w·f)) | `fillColumns` + `clipColumns` (UV crop, 1 texel/pixel) for novaBar and bossBar. Tests check widths and UVs. |

`presentation.screens.integration`:

| # | Item | Where |
| --- | --- | --- |
| 1 | Click areas = item rects x 216..424, rows top..top+14, press and drag start | `menuLayout().items` used by the system (`hitItem`) and by drawing. Half-open pixel coverage [216, 425) × [top, top+15). Tests: corner pixels hit; 1 px / 0.01 px outside, right button, cross-item drags, press-out/release-in, press-in/release-out all miss. |
| 2 | menuY → itemsTop = panelTop + 32 | `menuLayout("panel" / "controls")`. Pause items from 154, settings from 145. Controls BACK at itemsTop + 92. |
| 3 | 1x page titles; result titles in resultPlate | Titles are 1x heading at panelTop + 10. resultPlate sector-secured / campaign-complete / signal-lost at (170, 60); no scaled text anywhere (tests assert every glyph quad is 5x7). |
| 4 | Controls hitbox line in heading ui[2] | Line 8 heading; others label. |
| 5 | Dim panel[0] at 0.85; opaque item plates | `fillRect` 640x360 panel[0] α 0.85 on `screenDim`; menuItem 3-slice opaque. |
| 6 | Disabled state unused | Not used (frames available; `TEXT_COLOR.disabled` defined). |
| 7 | Title outside the pass; its items need the new rects | Title items on menuItem rects at rows 241/260/279 (hit = drawn). Only font/kit migration; legacy painting unchanged. |

Other presentation keys:
- `settings.integration` + `sound`: fixed MUSIC / EFFECTS / SOUND / REDUCED MOTION / BACK. Labels at x 224; control right edge 416, vertically centred. Meter `level-round(v·4)`; SOUND on = !muted; REDUCED MOTION on = reducedMotion. Activation behaviour is unchanged.
- `stageStart`: card frame by stage id at (200, 120). `SECTOR 0n` (index + 1) and the name in the spec text slots. Own 2.6 s timer; start banner suppressed during and after the card.
- `reducedMotion.map`: pip-low and nova-ready statics. charge-ready is never selected because no charge state exists. HUD and screens are tested frame-identical over time.
- `lowHull`, `layout.plates`, `banner`, `scorePops`, `footer`, `result.panel`, `controls`: implemented as specified; positions are asserted in tests.

## Exact shared patches requested (orchestrator / T3 / T5)

Required before integrated acceptance. Until they land, the kind stays `"stage"` from `newRun`, so WARNING, boss-name, SECURED/VICTORY and PHASE banners are **not drawn**. That is intentional: no inference from colour or time.

```diff
# P1+P2 src/systems/combat-enemies.ts (orchestrator)
-      warning = true; run.banner = `WARNING / ${stage.boss.name}`; run.bannerTime = 4;
+      warning = true; run.banner = `WARNING / ${stage.boss.name}`; run.bannerTime = 4; run.bannerKind = "sector";
-      run.banner = stage.boss.name; run.bannerTime = 3; sound.boss();
+      run.banner = stage.boss.name; run.bannerTime = 3; run.bannerKind = "sector"; sound.boss();
# P3 src/systems/combat-collision.ts:70 (orchestrator)
-          run.phase = "clear"; run.bossHealth = 0; run.banner = stage.index === 2 ? "STARFALL / VICTORY" : `${stage.name} SECURED`; run.bannerTime = 5; run.shake = w(6); run.flash = 0.2;
+          run.phase = "clear"; run.bossHealth = 0; run.banner = stage.index === 2 ? "STARFALL / VICTORY" : `${stage.name} SECURED`; run.bannerTime = 5; run.bannerKind = "sector"; run.shake = w(6); run.flash = 0.2;
# P4 src/bosses/kiln-serpent.ts:32 (T3)
-          if (phase > run.bossPhase) { run.bossPhase = phase; run.banner = `PHASE ${phase} / CORE OVERHEAT`; run.bannerTime = 1.4; sound.boss(); }
+          if (phase > run.bossPhase) { run.bossPhase = phase; run.banner = `PHASE ${phase} / CORE OVERHEAT`; run.bannerTime = 1.4; run.bannerKind = "phase"; sound.boss(); }
# P5 src/bosses/starfall-engine.ts:37 (T3)
-          if (phase > run.bossPhase) { run.bossPhase = phase; run.banner = `PHASE ${phase} / REACTOR SURGE`; run.bannerTime = 1.4; sound.boss(); }
+          if (phase > run.bossPhase) { run.bossPhase = phase; run.banner = `PHASE ${phase} / REACTOR SURGE`; run.bannerTime = 1.4; run.bannerKind = "phase"; sound.boss(); }
# P6 tests/browser-boss-review.ts:29 (T5)
-  if (ending) { Object.assign(session.run!, { phase: "clear", score: 191550, kills: 104, banner: "STARFALL / VICTORY", bannerTime: 5 }); session.best = 191550; }
+  if (ending) { Object.assign(session.run!, { phase: "clear", score: 191550, kills: 104, banner: "STARFALL / VICTORY", bannerTime: 5, bannerKind: "sector" }); session.best = 191550; }
```

- Stage initialization (`stage.ts:27`, `run.banner = stage.name`) needs **no** change. `newRun` already sets kind `"stage"` and the renderer never draws a stage-kind banner, so its remaining 0.9 s cannot reappear after the card (tested per stage). `bannerTime` (3.5) and every gameplay clock are untouched.
- P7 (T3, recommended): the boss "GAP" hint still uses the deprecated 3x5 shim on the legacy frame. 5x7 glyphs need the native frame: through `pixelSnapped` their odd-width quads would be rounded onto half pixels. Proposed change:

```diff
# src/bosses/boss.ts
-import { text } from "../ui/bitmap-text.ts";
+import { centredX, drawText } from "../ui/bitmap-text.ts";
-  render(frame: Frame, alpha: number): void;
+  render(frame: Frame, alpha: number, native: Frame): void;
-export function drawGap(frame: Frame, x: number, width: number, color: number, label: number): void {
+export function drawGap(frame: Frame, native: Frame, x: number, width: number, color: number, label: number): void {
   frame.rect(x, fromLegacy(151), width, fromLegacy(230), color, 0.07, LAYER.floorTelegraph, true);
-  text(frame, "GAP", x - 6, fromLegacy(36), label, 1, LAYER.hudText);
+  drawText(native, "GAP", centredX("GAP", Math.round(x)), 48, label, LAYER.hudText);
 }
# src/render/enemies.ts:45
-    boss.render(legacy, alpha);
+    boss.render(legacy, alpha, frame);
# gatebreaker.ts:60 / kiln-serpent.ts:72 / starfall-engine.ts:71: pass `native` as drawGap's second argument (add the parameter to their render()).
```

  The label colours (0xa4e8bd / 0xb5efd0) are outside the palette; T3 may switch them to a `TEXT_COLOR` entry. T2's beam "!" marker is replaced by its beamWarning sprite. After P7 and T2, T5 deletes the `text()` shim.

## Mismatches, choices, limitations

1. **Legacy 3x5 shim kept.** `text()` in bitmap-text.ts keeps only the pre-rev01 G, A, P and ! glyphs (pixel-identical) for `bosses/boss.ts` ("GAP", T3) and `render/player-fx.ts` ("!", T2). The HUD and screens never use it. Deleting it would break files owned by T2/T3. See P7.
2. **Banner writers are not yet patched** (P1–P6). In this standalone snapshot, later banners stay hidden until the orchestrator applies the patches. The T4 tests set kinds directly.
3. **Stage card timer** is a system registered by the HUD pass factory. It advances by the stage's fixed dt, so it freezes under pause like the stage, and starts on the first frame. It shares no state with `run.seconds`/`bannerTime`. After review fix B, runsDuringFreeze:true keeps it advancing through hit-stop; it ends after exactly 156 actual stage-update ticks of 1/60 s (1e-9 drift guard), while pause still blocks stage updates.
4. **Repeated slices** (plate/item/rule/banner fills, 9-slice edges/fill) are one quad sampling the 1-texel slice. Nearest sampling makes this pixel-identical to repeating the column, with far fewer quads. No art content is scaled. This is asserted in tests (fill UV = 1 texel).
5. **Engine marks:** originally the spec decimals 0.3333/0.6667 also selected passed state, so the 2/3 mark could flip earlier than the phase change (400/600). Review fix A keeps those decimals only for x placement (offsets 80/160) and uses exact gameplay fractions 1/3, 2/3 for passed state, with a <=1e-4 agreement assertion. Equality stays ahead; 399/600 is passed.
6. **Settings control "right-aligned to itemX + 200"** is read as last column 416, symmetric with the 8 px label inset.
7. **Title:** no runtime scaling and no new art, so the STARFALL wordmark is now 1x 5x7 heading (row 77, was 5x-scaled 3x5). Taglines are at rows 115/217, the footer at 344, items at 241/260/279. Text sits on the tinted painting without plates, as before. A larger wordmark would need new authored art (owner card candidate if wanted; not requested).
8. **Footer overlap:** on pause/result, the footer at row 344 shares the row with the HUD's dimmed controls hint underneath (15% show-through, visible in `screen-*.png`). This is the spec layout ("the dim overlay counts as a band"). T5 should compare it with the gate-5 sheets, which are not present in this worktree.
9. **Score pops** keep their writers' offsets (tuned for 3x5). With the 5x7 width they now sit roughly centred on the kill point. No change requested.
10. **Result panel geometry** (x 170..470, top 116) comes from the spec's prose and is hard-coded in `menu-layout.ts`.
11. Pointer coordinates are compared with half-open pixel coverage, so a fractional pointer on the last column or row still counts.
12. No browser run; no physical-device or human checks. Runtime captures at 1x/2x and the settings/controls/results/death supplements are T5's.

## Permission denials

Auto-denied with no approval surface: `ls` into the `node_modules` link (outside the worktree; the engine API was read from the 0.2.2 evidence tarball instead), compound shell commands with `cd`/`echo $?`, and `git status`/`git rev-parse` after the first call. No check was skipped because of these. Tests, build and bot ran via `npm.cmd --prefix` and absolute paths.
