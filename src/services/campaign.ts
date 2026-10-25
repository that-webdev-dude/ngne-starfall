import type { Audio, Game, PreparedScene, SceneDefinition } from "@ngne/core";
import { STAGES } from "../config/stages.ts";
import { stageScene } from "../scenes/stage.ts";
import { menuScene } from "../scenes/menu.ts";
import { createCombatSound } from "./sound.ts";
import { stageAssets } from "./stage-assets.ts";
import type { Progress, ProgressCommand, Session } from "../world/session.ts";

/** Shared browser composition: production and browser verification use identical scene ownership. */
export function createCampaign(
    session: Session,
    audio: Audio,
    getGame: () => Game<Progress, ProgressCommand>,
) {
    const take = (purpose: string): PreparedScene | undefined => {
        const game = getGame(),
            owners = game.scenes,
            owner = owners[owners.length - 1];
        return owner ? game.candidates.take(owner.id, purpose) : undefined;
    };
    const makeStage = (index: number, score: number) =>
        stageScene(
            session,
            {
                assets: stageAssets(STAGES[index]),
                sound: (scene) => createCombatSound(scene, audio, session.settings, index),
                take,
            },
            index,
            score,
        );
    const first = makeStage(0, 0),
        title = menuScene("title", session, take),
        pause = menuScene("pause", session, take),
        result = menuScene("result", session, take);
    const choices = new Map<
        number,
        {
            retry: SceneDefinition<Progress, ProgressCommand>;
            next?: SceneDefinition<Progress, ProgressCommand>;
        }
    >();
    function reconcile(): void {
        const game = getGame();
        if (game.lifecycle !== "Running") return;
        const owners = game.scenes,
            alive = new Set(owners.map((owner) => owner.id));
        for (const id of choices.keys()) if (!alive.has(id)) choices.delete(id);
        for (const owner of owners) {
            const ensure = (
                purpose: string,
                definition: SceneDefinition<Progress, ProgressCommand>,
            ) =>
                game.candidates.ensure(owner.id, purpose, definition, {
                    key: `${purpose}-${owner.id}`,
                    retries: 1,
                });
            if (owner.definition === "menu-title") ensure("play", first);
            if (STAGES.some((stage) => stage.id === owner.definition)) {
                ensure("pause", pause);
                ensure("result", result);
            }
            if (owner.definition === "menu-pause") ensure("title", title);
            if (owner.definition === "menu-result" && session.run) {
                const run = session.run;
                let options = choices.get(owner.id);
                if (!options) {
                    options = {
                        retry: makeStage(run.stageIndex, run.entryScore),
                        next:
                            run.stageIndex < 2
                                ? makeStage(run.stageIndex + 1, run.score)
                                : undefined,
                    };
                    choices.set(owner.id, options);
                }
                ensure("title", title);
                if (run.phase === "dead") ensure("retry", options.retry);
                else if (options.next) ensure("next", options.next);
                else ensure("replay", first);
            }
        }
    }
    return { title, reconcile };
}
