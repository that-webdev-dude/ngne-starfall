/**
 * T4 software evidence: renders the quads produced by the real HUD pass (drawHud) and menu scenes into PNGs at 1x
 * and 2x (nearest), over the stage's native rev01 background cropped through its centre pivot (backdrop drawn by this
 * script, not by game code). Software rasterization of the frame data; not a browser/GPU capture.
 * Usage: node --experimental-strip-types tests/rev01-presentation-evidence.ts <output dir>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Camera, Frame, Game, emptyInput, type InputSnapshot } from "@ngne/core";
import { STAGES } from "../src/config/stages.ts";
import { STAGE_CARD_SECONDS, createStageCard, drawHud } from "../src/render/hud.ts";
import { menuScene } from "../src/scenes/menu.ts";
import { FONT_MASK_TEXTURE } from "../src/services/font-assets.ts";
import { REV01_CLAIMS, REV01_URLS, maskPixels, type Rev01Id } from "../src/services/rev01-assets.ts";
import { newRun, type Progress, type ProgressCommand, type RunState, type Session } from "../src/world/session.ts";
import { decodePng } from "./helpers/png.ts";
import { blank, blitRows, enlarge, rasterize, writePng, type Rgba } from "./helpers/software-frame.ts";

const output = process.argv[2] ?? ".test-output/integration/T4/evidence";
mkdirSync(output, { recursive: true });
const cache = new Map<string, Rgba | undefined>();
const texture = (id: string): Rgba | undefined => {
  if (!cache.has(id)) {
    const name = id.startsWith("rev01-") ? id.slice(6) as Rev01Id : undefined;
    cache.set(id, id === FONT_MASK_TEXTURE ? maskPixels(decodePng(fileURLToPath(REV01_URLS.font))) : name && name in REV01_URLS ? decodePng(fileURLToPath(REV01_URLS[name])) : undefined);
  }
  return cache.get(id);
};
const backdrop = (stageIndex: number) => {
  const canvas = blank(640, 360), id = (REV01_CLAIMS.backgrounds as Record<string, Rev01Id>)[STAGES[stageIndex].id];
  blitRows(canvas, decodePng(fileURLToPath(REV01_URLS[id])), 20);
  return canvas;
};
const report: Record<string, unknown> = {};
function save(name: string, canvas: Rgba, frames: Frame[], note: string) {
  const skipped = new Set<string>();
  for (const frame of frames) for (const id of rasterize(canvas, frame, texture)) skipped.add(id);
  writePng(join(output, `${name}-1x.png`), canvas); writePng(join(output, `${name}-2x.png`), enlarge(canvas, 2));
  report[name] = { note, quads: frames.reduce((sum, frame) => sum + frame.count, 0), skippedLegacyTextures: [...skipped] };
}
const session = (reducedMotion = false): Session => ({ settings: { music: 0.75, effects: 0.5, muted: false, reducedMotion }, screen: "playing", best: 191550, ready: true });
function hudFrame(stageIndex: number, setup: (run: RunState) => void, options: { reducedMotion?: boolean; card?: boolean } = {}) {
  const run = newRun(stageIndex), card = createStageCard(), frame = new Frame(), camera = new Camera();
  if (!options.card) card.advance(STAGE_CARD_SECONDS);
  setup(run); camera.pixelSnap = false; frame.scene(camera, 1);
  drawHud(frame, { run, stage: STAGES[stageIndex], session: session(options.reducedMotion), card });
  return { frame, run };
}
async function menuFrame(kind: "title" | "pause" | "result", state: Session, keys: string[][] = []) {
  const game = new Game<Progress, ProgressCommand>({ seed: 1, state: { best: 0, runs: 0 }, transition: (value) => value });
  await game.start(await game.prepare({ ...menuScene(kind, state, () => undefined), assets: [] }, { key: kind }));
  game.tick(emptyInput());
  for (const pressed of keys) game.tick({ ...emptyInput(), pressed } as InputSnapshot);
  const frame = new Frame(); game.render(frame, 1); game.dispose();
  return frame;
}

save("hud-stage1-card", backdrop(0), [hudFrame(0, (run) => { run.seconds = 0.4; }, { card: true }).frame], "stage 1 start: stage card (start banner suppressed), hull 5, nova ready");
save("hud-stage2-boss-low-phase", backdrop(1), [hudFrame(1, (run) => { Object.assign(run, { phase: "boss", bossMax: 1000, bossHealth: 420, hull: 1, nova: 0.6, combo: 4, score: 48210, seconds: 131, banner: "PHASE 2 / CORE OVERHEAT", bannerTime: 1, bannerKind: "phase" }); run.scorePops.push({ x: 300, y: 120, text: "+250", life: 0.5 }); }).frame], "stage 2 boss: alert banner, low hull (low-a), boss bar 42% with passed 0.5 mark, nova 60%");
save("hud-stage3-boss-calm-sector", backdrop(2), [hudFrame(2, (run) => { Object.assign(run, { phase: "boss", bossMax: 1000, bossHealth: 500, hull: 1, nova: 1, combo: 1, score: 151000, seconds: 612, banner: "WARNING / STARFALL ENGINE", bannerTime: 1, bannerKind: "sector" }); }, { reducedMotion: true }).frame], "stage 3 boss, reduced motion: hudCalm pip-low and nova-ready, sector banner, marks at 1/3 (ahead) and 2/3 (passed)");
for (const [name, keys] of [["pause", []], ["settings", [["ArrowDown"], ["Enter"]]], ["controls", [["ArrowDown"], ["ArrowDown"], ["Enter"]]]] as const) {
  const state = session(); state.run = newRun(0);
  save(`screen-${name}`, backdrop(0), [hudFrame(0, (run) => { run.seconds = 47; }).frame, await menuFrame("pause", state, keys.map((key) => [...key]))], `pause scene (${name}) over the frozen stage 1 HUD`);
}
for (const [name, stageIndex, phase] of [["result-sector-secured", 0, "clear"], ["result-campaign-complete", 2, "clear"], ["result-signal-lost", 1, "dead"]] as const) {
  const state = session(); state.run = { ...newRun(stageIndex, 12000), phase, score: 191550, kills: 104 };
  save(`screen-${name}`, backdrop(stageIndex), [hudFrame(stageIndex, (run) => { run.seconds = 150; }).frame, await menuFrame("result", state)], `result over stage ${stageIndex + 1}`);
}
save("screen-title", backdrop(0), [await menuFrame("title", session())], "title main page: font/menu kit only; legacy painting quads skipped (rev01 background used as backdrop)");
writeFileSync(join(output, "evidence.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
