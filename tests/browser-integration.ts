// Development-only actual-production capture/manual launcher; excluded from the Vite production entry.
import "../src/style.css";
import { BrowserGame, emptyInput, type PreparedScene } from "@ngne/core";
import { VIEW } from "../src/config/view.ts";
import { STAGES } from "../src/config/stages.ts";
import { stageScene } from "../src/scenes/stage.ts";
import { menuScene } from "../src/scenes/menu.ts";
import { createCampaign } from "../src/services/campaign.ts";
import { installDisplay } from "../src/services/display.ts";
import { novaAtlasPlan } from "../src/services/player-fx-assets.ts";
import { createCombatSound } from "../src/services/sound.ts";
import { stageAssets } from "../src/services/stage-assets.ts";
import type { Progress, ProgressCommand, Session } from "../src/world/session.ts";
import { SCENARIOS, gateUpdates, presentationStage, type IntegrationScenario } from "./helpers/integration-presentation.ts";

const params = new URLSearchParams(location.search);
const stageIndex = Math.max(0, Math.min(2, Number(params.get("stage") || 1) - 1));
const manual = params.get("manual") === "1", capture = params.get("capture") === "1";
const requested = params.get("scenario") || "play";
if (!Number.isInteger(stageIndex) || !SCENARIOS.includes(requested as IntegrationScenario)) throw new Error("Invalid stage/scenario route");
const scenario = requested as IntegrationScenario, calm = params.get("calm") === "1";
const pose = Math.max(-3, Math.min(3, Math.round(Number(params.get("pose") || 0))));
const novaTime = Math.max(0, Math.min(0.559, Number(params.get("novaTime") || 0.23)));
const variant = params.get("variant") || "parts";
const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const status = document.querySelector<HTMLPreElement>("#fixture-status")!;
const statusOnly = document.querySelector<HTMLOutputElement>("#fixture-status-only")!;
const session: Session = { settings: { music: .55, effects: .7, muted: !manual, reducedMotion: calm }, screen: "title", best: manual ? 0 : 191550, ready: false };
const errors: string[] = [];
const diagnostics: { type: "overload"; droppedTicks: number; simulationTick: number }[] = [];
let ready = false, menuFrozen = false, exportRequested = false, exported = 0, lastReport = "", ducked = false;
let initialTextureIds: readonly string[] | undefined;
const report = (error: unknown) => {
  // BrowserGame reports dropped fixed ticks as a nonfatal structured diagnostic. Preserve resize/host
  // overload evidence without misclassifying it as a failed renderer or asset load.
  if (typeof error === "object" && error !== null && "type" in error && error.type === "overload" && "droppedTicks" in error && typeof error.droppedTicks === "number") {
    diagnostics.push({ type: "overload", droppedTicks: error.droppedTicks, simulationTick: app.game.simulationTick });
  } else errors.push(error instanceof Error ? error.stack || error.message : JSON.stringify(error));
  updateStatus();
};
const nativeCopy = document.createElement("canvas"); nativeCopy.width = 640; nativeCopy.height = 360;
const copyContext = nativeCopy.getContext("2d")!;
const app = new BrowserGame<Progress, ProgressCommand>({
  canvas, ...VIEW, seed: 17, state: { best: session.best, runs: 0 }, clear: 0x060d19,
  transition: (state, command) => ({ best: Math.max(state.best, command.score), runs: state.runs + 1 }), diagnostic: report,
  afterFrame() {
    ready = session.ready && app.renderer?.status === "ready";
    campaign.reconcile(); session.best = app.game.state.best; app.audio.muted = session.settings.muted;
    if (ducked !== (session.screen === "paused")) { ducked = session.screen === "paused"; app.audio.duck(ducked ? .22 : 1); }
    initialTextureIds ??= app.renderer?.inspect(1000).entries.map(entry => entry.id);
    // Snapshot current pixels immediately after the production GPU render, before the next presentation.
    if (exportRequested) { exportRequested = false; copyContext.drawImage(canvas, 0, 0); saveFrame(); }
    updateStatus();
  },
});
const campaign = createCampaign(session, app.audio, () => app.game);
const releaseDisplay = installDisplay(canvas);
function updateStatus() {
  const rect = canvas.getBoundingClientRect(), plan = novaAtlasPlan();
  const details = {
    status: errors.length ? "ERROR" : ready ? "READY" : "LOADING", stage: stageIndex + 1, scenario: manual ? "manual" : scenario,
    setup: manual ? "NORMAL RULES / ordinary stage beginning" : "SEEDED PRESENTATION / not reachability evidence",
    frozen: !manual && (capture || scenario !== "title"), calm: session.settings.reducedMotion, screen: session.screen, phase: session.run?.phase,
    seconds: session.run?.seconds, view: [640, 360], backing: [canvas.width, canvas.height],
    css: [rect.width, rect.height], viewportCSS: [innerWidth, innerHeight], dpr: devicePixelRatio, k: Number(canvas.dataset.scale),
    renderer: app.renderer?.status ?? "unavailable", adapterIdentity: "unavailable through public API",
    novaAtlas: plan ? [plan.width, plan.height] : "not loaded",
    novaAtlasRegistered: initialTextureIds?.includes("rev01-nova-atlas") ?? false, exported, diagnostics, errors,
  };
  const value = JSON.stringify(details, null, 1);
  if (value === lastReport) return;
  lastReport = value; status.textContent = statusOnly.textContent = value;
  canvas.dataset.ready = details.status === "READY" ? "true" : "false";
  canvas.dataset.status = details.status; canvas.dataset.scenario = manual ? "manual" : scenario;
  canvas.setAttribute("aria-label", `Starfall ${details.status}. Stage ${stageIndex + 1}. ${details.scenario}. ${details.setup}. ${session.screen}. k ${details.k}. DPR ${devicePixelRatio}. Backing ${canvas.width} by ${canvas.height}. CSS ${rect.width} by ${rect.height}. Nonfatal diagnostics ${diagnostics.length}. Errors ${errors.length}.`);
}
function saveFrame() {
  nativeCopy.toBlob(blob => {
    if (!blob) { report(new Error("Native frame PNG encoding failed")); return; }
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = `starfall-s${stageIndex + 1}-${manual ? "manual" : scenario}-${session.settings.reducedMotion ? "calm" : "normal"}-${++exported}.png`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); updateStatus();
  }, "image/png");
}
const stageSelect = document.querySelector<HTMLSelectElement>("#stage")!, scenarioSelect = document.querySelector<HTMLSelectElement>("#scenario")!, calmInput = document.querySelector<HTMLInputElement>("#calm")!;
for (const name of SCENARIOS) scenarioSelect.add(new Option(name, name));
stageSelect.value = String(stageIndex + 1); scenarioSelect.value = scenario; calmInput.checked = calm;
function navigate(play: boolean) {
  const route = new URLSearchParams({ stage: stageSelect.value, calm: calmInput.checked ? "1" : "0", ...(play ? { manual: "1" } : { scenario: scenarioSelect.value }) });
  location.search = route.toString();
}
document.querySelector("#load")!.addEventListener("click", () => navigate(false));
document.querySelector("#manual")!.addEventListener("click", () => navigate(true));
document.querySelector("#save")!.addEventListener("click", () => { exportRequested = true; });
document.documentElement.classList.toggle("capture", capture);
window.addEventListener("keydown", event => {
  if (event.code === "KeyO") { event.preventDefault(); exportRequested = true; }
  if (event.code === "KeyH") document.documentElement.classList.toggle("capture");
});
const unlock = () => { void app.audio.unlock().catch(report); };
canvas.addEventListener("pointerdown", unlock); canvas.addEventListener("keydown", unlock);
window.addEventListener("error", event => report(event.error || event.message));
window.addEventListener("unhandledrejection", event => report(event.reason));
window.addEventListener("pagehide", () => { releaseDisplay(); void app.dispose().catch(report); }, { once: true });

try {
  const take = (purpose: string): PreparedScene | undefined => {
    const owners = app.game.scenes, owner = owners[owners.length - 1];
    return owner ? app.game.candidates.take(owner.id, purpose) : undefined;
  };
  const actual = stageScene(session, { assets: stageAssets(STAGES[stageIndex]), sound: scene => createCombatSound(scene, app.audio, session.settings, stageIndex), take }, stageIndex);
  if (manual) await app.start(await app.game.prepare(actual, { key: `manual-stage-${stageIndex + 1}` }));
  else {
    const preset = presentationStage(actual, session, { scenario, pose, novaTime, variant });
    const title = menuScene("title", session, take);
    await app.game.start(await app.game.prepare(scenario === "title" ? { ...title, setup(scene) { title.setup(gateUpdates(scene, () => menuFrozen)); } } : preset.definition, { key: `presentation-${stageIndex + 1}-${scenario}` }));
    for (let i = 0; i < (scenario === "title" ? 1 : preset.warmup); i++) app.game.tick(emptyInput());
    if (["pause", "settings", "controls", "result", "loss"].includes(scenario)) {
      const menu = menuScene(scenario === "result" || scenario === "loss" ? "result" : "pause", session, take);
      app.game.push(await app.game.prepare({ ...menu, setup(scene) { menu.setup(gateUpdates(scene, () => menuFrozen)); } }, { key: `presentation-menu-${scenario}` }));
      app.game.tick(emptyInput());
      if (scenario === "settings" || scenario === "controls") {
        for (let i = 0; i < (scenario === "settings" ? 1 : 2); i++) app.game.tick({ ...emptyInput(), pressed: ["ArrowDown"] });
        app.game.tick({ ...emptyInput(), pressed: ["Enter"] });
      }
    }
    menuFrozen = capture;
    // A public blocking scene makes suspended production scenes render at alpha=1, including Kiln's
    // private husk history. Gating updates alone would leave that history dependent on rAF alpha.
    if (capture || !["pause", "settings", "controls", "result", "loss", "title"].includes(scenario)) {
      app.game.push(await app.game.prepare({ id: "presentation-freeze", blocksUpdateBelow: true, setup() {} }, { key: "presentation-freeze" }));
      app.game.tick(emptyInput());
    }
    app.game.stop();
    await app.start();
  }
  session.ready = true; canvas.focus(); updateStatus();
} catch (error) { report(error); }
