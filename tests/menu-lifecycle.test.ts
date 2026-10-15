import { test } from "node:test";
import { strict as assert } from "node:assert";
import { Game, emptyInput, type PreparedScene } from "@ngne/core";
import { menuScene } from "../src/scenes/menu.ts";
import type { Progress, ProgressCommand, Session } from "../src/world/session.ts";

test("pause cleanup restores play on resume but preserves title on replacement", async () => {
  const session: Session = { settings: { music: 0, effects: 0, muted: true, reducedMotion: false }, screen: "playing", best: 0, ready: true };
  const candidates = new Map<string, PreparedScene>();
  const take = (purpose: string) => { const result = candidates.get(purpose); candidates.delete(purpose); return result; };
  const game = new Game<Progress, ProgressCommand>({ seed: 1, state: { best: 0, runs: 0 }, transition: (state) => state });
  const press = (key: string) => game.tick({ ...emptyInput(), pressed: [key] });
  try {
    await game.start(await game.prepare({ id: "underlying-flight", setup() {} }, { key: "flight" }));
    game.push(await game.prepare(menuScene("pause", session, take), { key: "pause" })); game.tick();
    assert.equal(session.screen, "paused");
    press("Escape");
    assert.equal(session.screen, "playing");
    game.push(await game.prepare(menuScene("pause", session, take), { key: "pause-again" })); game.tick();
    candidates.set("title", await game.prepare({ ...menuScene("title", session, take), assets: [] }, { key: "title" }));
    press("ArrowDown"); press("ArrowDown"); press("ArrowDown"); press("Enter"); game.tick();
    assert.equal(game.scenes.length, 1);
    assert.equal(game.scenes[0].definition, "menu-title");
    assert.equal(session.screen, "title");
  } finally { game.dispose(); }
});
