// Non-shipping runtime fixture. Uses production campaign composition and ordinary input keys.
// The observer never changes game state, entity data, health, clocks or encounter rules.
import "../src/style.css";
import { BrowserGame, type WorldAccess } from "@ngne/core";
import { VIEW } from "../src/config/view.ts";
import { STAGES } from "../src/config/stages.ts";
import { createCampaign } from "../src/services/campaign.ts";
import { installDisplay } from "../src/services/display.ts";
import { createBotMemory, observeCampaign, decideCampaignKeys } from "./helpers/campaign-bot.ts";
import type { Progress, ProgressCommand, Session } from "../src/world/session.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const output = document.querySelector<HTMLOutputElement>("#verification")!;
const session: Session = {
    settings: { music: 0.55, effects: 0.7, muted: true, reducedMotion: false },
    screen: "title",
    best: 0,
    ready: true,
};
let world: WorldAccess | undefined,
    memory = createBotMemory(),
    lastTick = -1,
    held = new Set<string>();
let lastRun: unknown,
    lastPhase = "",
    complete = false;
const errors: string[] = [],
    history: unknown[] = [];
const report = (error: unknown) => {
    errors.push(String(error));
};
function setKeys(keys: string[]) {
    const desired = new Set(keys);
    for (const key of held) if (!desired.has(key)) app.input.set(key, false);
    for (const key of desired) app.input.set(key, true);
    held = desired;
}
const app = new BrowserGame<Progress, ProgressCommand>({
    canvas,
    ...VIEW,
    seed: 17,
    state: { best: 0, runs: 0 },
    transition: (state, command) => ({
        best: Math.max(state.best, command.score),
        runs: state.runs + 1,
    }),
    clear: 0x060d19,
    diagnostic: report,
    afterFrame(stats) {
        campaign.reconcile();
        session.best = app.game.state.best;
        app.audio.muted = true;
        const run = session.run;
        if (run && run !== lastRun) {
            lastRun = run;
            memory = createBotMemory();
            history.push({
                event: "stage-start",
                stage: run.stageIndex,
                entryScore: run.entryScore,
            });
        }
        const phaseKey = `${run?.stageIndex}:${run?.phase}:${session.screen}`;
        if (phaseKey !== lastPhase) {
            history.push({
                event: "phase",
                stage: run?.stageIndex,
                phase: run?.phase,
                screen: session.screen,
                seconds: run?.seconds,
                score: run?.score,
                hull: run?.hull,
            });
            lastPhase = phaseKey;
        }
        complete = Boolean(
            run?.stageIndex === 2 && run.phase === "clear" && session.screen === "clear",
        );
        if (lastTick !== app.game.simulationTick) {
            lastTick = app.game.simulationTick;
            if (complete || errors.length) setKeys([]);
            else if (
                session.screen === "title" ||
                session.screen === "clear" ||
                session.screen === "dead"
            )
                setKeys(lastTick % 20 === 0 ? ["Enter"] : []);
            else if (run && world && session.screen === "playing")
                setKeys(decideCampaignKeys(observeCampaign(world, run), memory));
            else setKeys([]);
        }
        output.textContent = JSON.stringify(
            {
                status: complete ? "COMPLETE" : errors.length ? "ERROR" : "RUNNING",
                stage: run ? run.stageIndex + 1 : 0,
                screen: session.screen,
                phase: run?.phase,
                seconds: run?.seconds.toFixed(1),
                hull: run?.hull,
                score: run?.score,
                boss: run?.bossHealth.toFixed(0),
                fps: Math.round(stats.fps),
                errors,
                history,
            },
            null,
            1,
        );
        canvas.setAttribute(
            "aria-label",
            `Verification ${complete ? "complete" : "running"}. Stage ${run ? run.stageIndex + 1 : 0}. ${session.screen}. ${run?.phase}. Time ${run?.seconds.toFixed(1)}. Hull ${run?.hull}. Boss ${run?.bossHealth.toFixed(0)}.`,
        );
    },
});
// Decorate only setup to capture the public world handle, leaving production systems untouched.
const prepare = app.game.prepare.bind(app.game);
app.game.prepare = (definition, options) =>
    prepare(
        STAGES.some((stage) => stage.id === definition.id)
            ? {
                  ...definition,
                  setup(scene) {
                      definition.setup(scene);
                      const observed = scene.world;
                      world = observed;
                      scene.defer(() => {
                          if (world === observed) world = undefined;
                      });
                  },
              }
            : definition,
        options,
    );
const campaign = createCampaign(session, app.audio, () => app.game);
const releaseDisplay = installDisplay(canvas);
window.addEventListener(
    "pagehide",
    () => {
        releaseDisplay();
        void app.dispose().catch(report);
    },
    { once: true },
);
canvas.addEventListener("pointerdown", () => {
    canvas.focus();
    void app.audio.unlock().catch(report);
});
try {
    await app.start(await app.game.prepare(campaign.title, { key: "verification-title" }));
    canvas.focus();
} catch (error) {
    report(error);
    output.textContent = JSON.stringify({ errors });
}
