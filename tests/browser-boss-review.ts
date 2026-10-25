// Explicit presentation fixture: seeds only the stage clock just before boss entry.
// This is not normal-rules reachability evidence and is excluded from the shipped build.
import "../src/style.css";
import { BrowserGame, type PreparedScene } from "@ngne/core";
import { VIEW } from "../src/config/view.ts";
import { STAGES } from "../src/config/stages.ts";
import { stageScene } from "../src/scenes/stage.ts";
import { menuScene } from "../src/scenes/menu.ts";
import { createCombatSound } from "../src/services/sound.ts";
import { stageAssets } from "../src/services/stage-assets.ts";
import { installDisplay } from "../src/services/display.ts";
import type { Progress, ProgressCommand, Session } from "../src/world/session.ts";
const stageIndex = new URLSearchParams(location.search).get("stage") === "3" ? 2 : 1;
const ending = new URLSearchParams(location.search).has("result");
const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const review = document.querySelector<HTMLPreElement>("#review")!;
const session: Session = {
    settings: { music: 0, effects: 0, muted: true, reducedMotion: false },
    screen: "title",
    best: 0,
    ready: true,
};
const errors: string[] = [];
const app = new BrowserGame<Progress, ProgressCommand>({
    canvas,
    ...VIEW,
    seed: 17,
    state: { best: 0, runs: 0 },
    transition: (state) => state,
    diagnostic: (error) => errors.push(String(error)),
    afterFrame: () => {
        app.audio.muted = true;
        review.textContent = `PRESENTATION FIXTURE / stage ${stageIndex + 1} / ${session.run?.phase} / ${session.run?.seconds.toFixed(1)} / errors ${JSON.stringify(errors)}`;
    },
});
let result: PreparedScene | undefined = ending
    ? await app.game.prepare(
          menuScene("result", session, () => undefined),
          { key: "ending-presentation" },
      )
    : undefined;
const actual = stageScene(
    session,
    {
        assets: stageAssets(STAGES[stageIndex]),
        sound: (scene) => createCombatSound(scene, app.audio, session.settings, stageIndex),
        take: (purpose) => {
            if (purpose !== "result") return;
            const candidate = result;
            result = undefined;
            return candidate;
        },
    },
    stageIndex,
);
await app.start(
    await app.game.prepare(
        {
            ...actual,
            setup(scene) {
                actual.setup(scene);
                session.run!.seconds = STAGES[stageIndex].bossAt - 0.2;
                if (ending) {
                    Object.assign(session.run!, {
                        phase: "clear",
                        score: 191550,
                        kills: 104,
                        banner: "STARFALL / VICTORY",
                        bannerTime: 5,
                        bannerKind: "sector",
                    });
                    session.best = 191550;
                }
            },
        },
        { key: "boss-presentation" },
    ),
);
const releaseDisplay = installDisplay(canvas);
window.addEventListener(
    "pagehide",
    () => {
        releaseDisplay();
        void app.dispose();
    },
    { once: true },
);
