import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Game, emptyInput, type PreparedScene, type WorldAccess } from "@ngne/core";
import { STAGES } from "../src/config/stages.ts";
import { stageScene } from "../src/scenes/stage.ts";
import { menuScene } from "../src/scenes/menu.ts";
import type { CombatSound } from "../src/systems/combat-context.ts";
import type { Progress, ProgressCommand, Session } from "../src/world/session.ts";
import { createBotMemory, decideCampaignKeys, observeCampaign } from "./helpers/campaign-bot.ts";

const output = process.argv[2] ?? "artifacts/campaign-testing/headless-bot.json";
const seeds = process.argv.slice(3).map(Number);
if (seeds.length === 0) seeds.push(17, 41, 83);
const results: unknown[] = [];
for (const seed of seeds) {
  const session: Session = { settings: { music: 0, effects: 0, muted: true, reducedMotion: false }, screen: "title", best: 0, ready: true };
  const calls: Record<string, number> = {};
  const sound = Object.fromEntries(["update", "shoot", "enemyShot", "hit", "kill", "nova", "damage", "boss", "clear", "death"].map((name) => [name, () => { calls[name] = (calls[name] ?? 0) + 1; }])) as unknown as CombatSound;
  const diagnostics: string[] = [];
  const game = new Game<Progress, ProgressCommand>({ seed, state: { best: 0, runs: 0 }, transition: (state, command) => ({ best: Math.max(state.best, command.score), runs: state.runs + 1 }), diagnostic: (error) => diagnostics.push(String(error)) });
  const candidates = new Map<string, PreparedScene>();
  let world!: WorldAccess, preparedOwner = -1, previousKeys: string[] = [], memory = createBotMemory();
  let observedStage = -1, maxBullets = 0, bossStart: number | null = null, stageNovaBase = 0;
  const summaries: unknown[] = [];
  const finishedStages = new Set<number>();
  const take = (purpose: string) => {
    const owner = game.scenes.at(-1), key = `${owner?.id}:${purpose}`, candidate = candidates.get(key);
    candidates.delete(key); return candidate;
  };
  const stage = (index: number, score: number) => {
    const original = stageScene(session, { assets: [], sound: () => sound, take }, index, score);
    return { ...original, setup(context: Parameters<typeof original.setup>[0]) { original.setup(context); world = context.world; } };
  };
  const menu = (kind: "title" | "pause" | "result") => ({ ...menuScene(kind, session, take), assets: [] });
  const prepareForTop = async () => {
    const owner = game.scenes.at(-1);
    if (!owner || owner.id === preparedOwner) return;
    preparedOwner = owner.id;
    const liveOwners = new Set(game.scenes.map((scene) => scene.id));
    for (const [key, candidate] of candidates) if (!liveOwners.has(Number(key.split(":")[0]))) { candidate.release(); candidates.delete(key); }
    const prepare = async (purpose: string, definition: ReturnType<typeof stage> | ReturnType<typeof menu>) => candidates.set(`${owner.id}:${purpose}`, await game.prepare(definition, { key: `${purpose}-${owner.id}` }));
    if (owner.definition === "menu-title") await prepare("play", stage(0, 0));
    else if (STAGES.some((entry) => entry.id === owner.definition)) {
      await prepare("pause", menu("pause")); await prepare("result", menu("result"));
    } else if (owner.definition === "menu-result") {
      const run = session.run!;
      if (run.phase === "clear" && run.stageIndex < STAGES.length - 1) await prepare("next", stage(run.stageIndex + 1, run.score));
      else if (run.phase === "clear") await prepare("replay", stage(0, 0));
      else await prepare("retry", stage(run.stageIndex, run.entryScore));
      await prepare("title", menu("title"));
    }
  };
  try {
    await game.start(await game.prepare(menu("title"), { key: "title" }));
    for (let tick = 0; tick < 60 * 900; tick++) {
      await prepareForTop();
      const run = session.run;
      if (run && observedStage !== run.stageIndex) { observedStage = run.stageIndex; memory = createBotMemory(); previousKeys = []; maxBullets = 0; bossStart = null; stageNovaBase = calls.nova ?? 0; }
      if (run && !finishedStages.has(run.stageIndex) && (run.phase === "clear" || run.phase === "dead")) {
        finishedStages.add(run.stageIndex);
        const summary = { stageIndex: run.stageIndex, stage: STAGES[run.stageIndex].id, outcome: run.phase, seconds: Number(run.seconds.toFixed(3)), hull: run.hull, kills: run.kills, entryScore: run.entryScore, score: run.score, bossHealth: run.bossHealth, bossStart, maxBullets, novas: (calls.nova ?? 0) - stageNovaBase };
        summaries.push(summary); console.log(JSON.stringify({ seed, ...summary }));
      }
      if (session.screen === "dead" || session.screen === "clear" && run?.stageIndex === STAGES.length - 1) break;
      let keys: string[];
      if (session.screen === "title" || session.screen === "clear") keys = previousKeys.includes("Enter") ? [] : ["Enter"];
      else if (run) {
        const observation = observeCampaign(world, run);
        maxBullets = Math.max(maxBullets, observation.bullets.length);
        if (run.phase === "boss" && bossStart === null) bossStart = Number(run.seconds.toFixed(3));
        keys = decideCampaignKeys(observation, memory);
      } else keys = [];
      game.tick({ ...emptyInput(), held: keys, pressed: keys.filter((key) => !previousKeys.includes(key)), released: previousKeys.filter((key) => !keys.includes(key)) });
      previousKeys = keys;
    }
    results.push({ seed, outcome: session.screen === "clear" && session.run?.stageIndex === STAGES.length - 1 ? "campaign-clear" : session.run?.phase ?? session.screen, stages: summaries, terminalScreen: session.screen, stageIndex: session.run?.stageIndex, progress: game.state, diagnostics, sceneCountBeforeDispose: game.scenes.length });
  } finally { game.dispose(); }
}
const evidence = {
  evidenceClass: "Headless normal-rules campaign run using actual production stage and menu systems",
  command: `node --experimental-strip-types tests/run-campaign-bot.ts ${output} ${seeds.join(" ")}`,
  stageConfig: STAGES.map(({ id, bossAt, boss }) => ({ id, bossAt, bossHp: boss.hp })), results,
  limitations: ["No browser/GPU, decoded production assets or audible sound: empty fixture assets and stub sound.", "Bot reads exact public ECS observations and predicts threats; this is reachability evidence, not human difficulty/fun acceptance.", "Only ordinary held Space, arrows, KeyB and menu Enter inputs; no gameplay HP, timer, invulnerability, encounter or AI mutations.", "Menu candidate preparation is a headless adapter matching production route semantics; actual stage/menu systems execute.", "Simulation time is not a wall-time performance benchmark."],
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(evidence, null, 2) + "\n");
console.log(`Saved ${output}`);
