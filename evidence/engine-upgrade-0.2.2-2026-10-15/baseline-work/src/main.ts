import "./style.css";
import { BrowserGame } from "@ngne/core";
import { VIEW } from "./config/preview.ts";
import { installDisplay } from "./services/display.ts";
import { createCampaign } from "./services/campaign.ts";
import { loadBest, loadSettings, saveBest } from "./services/storage.ts";
import { STAGES } from "./config/stages.ts";
import type { Progress, ProgressCommand, Session } from "./world/session.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const output = document.querySelector<HTMLPreElement>("#error")!;
const session: Session = { settings: loadSettings(), screen: "title", best: loadBest(), ready: false };
function report(error: unknown): void {
  if (!(error instanceof Error)) return;
  output.hidden = false;
  const detail = error instanceof AggregateError ? `${error.message}\n${error.errors.map(String).join("\n")}` : error.message;
  output.textContent += `${output.textContent ? "\n" : ""}${detail}`;
}
let lastLabel = 0, savedBest = session.best, ducked = false;
const app = new BrowserGame<Progress, ProgressCommand>({
  canvas, ...VIEW, seed: "STARFALL-BREAKWATER-01", state: { best: session.best, runs: 0 },
  transition: (state, command) => ({ best: Math.max(state.best, command.score), runs: state.runs + 1 }),
  clear: 0x060d19, diagnostic: report,
  afterFrame: (stats) => {
    campaign.reconcile(); session.best = app.game.state.best;
    if (session.best !== savedBest) { savedBest = session.best; saveBest(savedBest); }
    if (ducked !== (session.screen === "paused")) { ducked = session.screen === "paused"; app.audio.duck(ducked ? 0.22 : 1); }
    app.audio.muted = session.settings.muted;
    if (performance.now() - lastLabel < 150) return;
    lastLabel = performance.now();
    const run = session.run;
    canvas.dataset.screen = session.screen;
    canvas.setAttribute("aria-label", `Starfall. ${session.screen}. ${run && session.screen !== "title" ? `Stage ${run.stageIndex + 1}: ${STAGES[run.stageIndex].name}. Time ${run.seconds.toFixed(1)}. Hull ${run.hull}. Score ${run.score}. Kills ${run.kills}. Phase ${run.phase}. Boss ${Math.round(run.bossHealth)}. Nova ${Math.round(run.nova * 100)} percent. Position ${run.x.toFixed(1)}, ${run.y.toFixed(1)}.` : "Enter or click Launch Campaign to begin."} FPS ${Math.round(stats.fps)}. WASD, arrows or gamepad left stick move. Hold left mouse, Space or gamepad X to fire straight up. B or gamepad A Nova. Escape pause. F fullscreen.`);
  },
});
const campaign = createCampaign(session, app.audio, () => app.game);
const releaseDisplay = installDisplay(canvas);
const unlock = () => { void app.audio.unlock().catch(report); };
canvas.addEventListener("keydown", unlock); canvas.addEventListener("pointerdown", unlock);
window.addEventListener("pagehide", () => {
  releaseDisplay(); canvas.removeEventListener("keydown", unlock); canvas.removeEventListener("pointerdown", unlock);
  void app.dispose().catch(report);
}, { once: true });
try {
  await app.start(await app.game.prepare(campaign.title, { key: "title" }));
  session.ready = true; canvas.dataset.ready = "true";
} catch (error) { report(error); }
