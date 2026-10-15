import { pressed, type Frame, type PreparedScene, type SceneDefinition } from "@ngne/core";
import { art, artAssets, animationIndex } from "../services/art-assets.ts";
import { saveSettings } from "../services/storage.ts";
import { text as bitmapText } from "../ui/bitmap-text.ts";
import { drawSprite } from "../ui/sprite.ts";
import type { Progress, ProgressCommand, Session } from "../world/session.ts";
import { STAGES } from "../config/stages.ts";

export type MenuKind = "title" | "pause" | "result";
function text(frame: Frame, value: string, x: number, y: number, color = 0xdde9e3, scale = 1): void {
  bitmapText(frame, value, x, y, color, scale, 100);
}
export function menuScene(kind: MenuKind, session: Session, take: (purpose: string) => PreparedScene | undefined): SceneDefinition<Progress, ProgressCommand> {
  return {
    id: `menu-${kind}`, blocksUpdateBelow: true, assets: kind === "title" ? artAssets : [],
    setup(scene) {
      session.screen = kind === "title" ? "title" : kind === "pause" ? "paused" : session.run?.phase === "clear" ? "clear" : "dead";
      if (kind === "pause") scene.defer(() => { if (session.screen === "paused") session.screen = "playing"; });
      let selection = 0, page: "main" | "settings" | "controls" = "main", clock = 0, pending: string | undefined, previousAxis = 0;
      const labels = () => page === "controls" ? ["BACK"] : page === "settings" ? [
        `MUSIC ${Math.round(session.settings.music * 100)}`, `EFFECTS ${Math.round(session.settings.effects * 100)}`,
        session.settings.muted ? "SOUND OFF" : "SOUND ON", session.settings.reducedMotion ? "REDUCED MOTION ON" : "REDUCED MOTION OFF", "BACK",
      ] : kind === "title" ? ["LAUNCH CAMPAIGN", "SETTINGS", "CONTROLS"] : kind === "pause" ? ["RESUME FLIGHT", "SETTINGS", "CONTROLS", "RETURN TO TITLE"] : [session.run?.phase === "clear" ? session.run.stageIndex === 2 ? "PLAY AGAIN" : "NEXT SECTOR" : "RETRY SECTOR", "RETURN TO TITLE"];
      const menuY = () => page === "settings" ? 145 : page === "controls" ? 223 : kind === "title" ? 184 : kind === "result" ? 190 : 161;
      scene.system(({ dt, input, scenes }) => {
        clock += dt;
        if (pending) { const candidate = take(pending); if (candidate) scenes.set(candidate); return; }
        const list = labels(), axis = Math.abs(input.axes[1] ?? 0) > 0.6 ? Math.sign(input.axes[1]) : 0;
        if (pressed(input, "ArrowDown") || pressed(input, "KeyS") || pressed(input, "Pad13") || axis === 1 && previousAxis !== 1) selection = (selection + 1) % list.length;
        if (pressed(input, "ArrowUp") || pressed(input, "KeyW") || pressed(input, "Pad12") || axis === -1 && previousAxis !== -1) selection = (selection + list.length - 1) % list.length;
        previousAxis = axis;
        let activate = pressed(input, "Enter") || pressed(input, "Space") || pressed(input, "Pad0");
        for (const click of input.pointer.completed) for (let i = 0; i < list.length; i++) {
          const y = menuY() + i * 19;
          if (click.button === 0 && click.x >= 156 && click.x <= 324 && click.startX >= 156 && click.startX <= 324 && click.y >= y - 6 && click.y <= y + 9 && click.startY >= y - 6 && click.startY <= y + 9) { selection = i; activate = true; }
        }
        if (pressed(input, "Escape") || pressed(input, "Pad1")) {
          if (page !== "main") { page = "main"; selection = 0; }
          else if (kind === "pause") scenes.pop();
          return;
        }
        if (!activate) return;
        if (page === "controls") { page = "main"; selection = 0; return; }
        if (page === "settings") {
          if (selection === 0) session.settings.music = Math.round((session.settings.music >= 0.99 ? 0 : Math.min(1, session.settings.music + 0.25)) * 100) / 100;
          if (selection === 1) session.settings.effects = Math.round((session.settings.effects >= 0.99 ? 0 : Math.min(1, session.settings.effects + 0.25)) * 100) / 100;
          if (selection === 2) session.settings.muted = !session.settings.muted;
          if (selection === 3) session.settings.reducedMotion = !session.settings.reducedMotion;
          if (selection === 4) { page = "main"; selection = 0; }
          saveSettings(session.settings); return;
        }
        if (selection === 0) { if (kind === "pause") scenes.pop(); else pending = kind === "title" ? "play" : session.run?.phase === "clear" ? session.run.stageIndex === 2 ? "replay" : "next" : "retry"; }
        else if (kind === "result" || selection === 3) pending = "title";
        else { page = selection === 1 ? "settings" : "controls"; selection = 0; }
      });
      scene.render((frame) => {
        if (kind === "title") {
          drawSprite(frame, art.background, 240, 135, -10);
          frame.rect(240, 135, 480, 270, 0x030c18, 0.44, 20, true);
          const exhaust = art.exhaust[session.settings.reducedMotion ? 0 : animationIndex(clock, art.exhaustDurations, true)];
          for (const [sx, sy] of art.exhaustSockets.neutral) drawSprite(frame, exhaust, 240 + sx, 126 + sy, 24);
          drawSprite(frame, art.player.neutral, 240, 126, 25);
        } else frame.rect(240, 135, 480, 270, 0x030b18, 0.85, 80, true);
        if (kind === "title" && page === "main") {
          text(frame, "STARFALL", 162, 53, 0x26445b, 5); text(frame, "STARFALL", 160, 51, 0xc7eeef, 5);
          text(frame, "THREE SECTORS / ONE LAST FLIGHT", 182, 86, 0xd6b68f);
          text(frame, "A PILOT. A NOVA. A SKY FULL OF TROUBLE.", 166, 163, 0x8aabbf);
        } else {
          const title = page === "settings" ? "SETTINGS" : page === "controls" ? "FLIGHT CONTROLS" : kind === "pause" ? "FLIGHT PAUSED" : session.run?.phase === "clear" ? session.run.stageIndex === 2 ? "THE SKY IS YOURS" : "SECTOR SECURED" : "SIGNAL LOST";
          text(frame, title, 240 - title.length * 4, 67, session.run?.phase === "dead" ? 0xffb4a7 : 0xc5ebee, 2);
        }
        if (page === "main" && kind === "result") {
          const run = session.run!;
          const score = `SCORE ${String(run.score).padStart(7, "0")}`;
          text(frame, score, 240 - score.length * 2, 106, 0xffd39c);
          text(frame, `KILLS ${run.kills}   BEST ${session.best}`, 192, 124, 0xa1c5d2);
          const message = run.phase === "clear" ? run.stageIndex === 2 ? "ALL THREE SECTORS LIBERATED / CAMPAIGN COMPLETE" : `NEXT / ${STAGES[run.stageIndex + 1].name}` : `RETRY / ${STAGES[run.stageIndex].name}`;
          text(frame, message, 240 - message.length * 2, 148, 0x8cabc0);
          if (run.phase === "clear") text(frame, run.stageIndex === 2 ? "WELCOME HOME. YOU EARNED IT." : "SCORE BANKED / HULL AND NOVA RESTORED", run.stageIndex === 2 ? 186 : 170, 163, 0xa5d8d3);
          else text(frame, `SECTOR ENTRY SCORE ${run.entryScore}`, 188, 163, 0xa5bacd);
        }
        if (page === "controls") {
          const lines = ["WASD / ARROWS  MOVE WITH MOMENTUM", "HOLD LEFT MOUSE / SPACE  FIRE UP", "GAMEPAD LEFT STICK  MOVE", "HOLD PAD X  FIRE STRAIGHT UP", "B / PAD A  NOVA BLAST", "ESC / P / START  PAUSE", "F  FULLSCREEN", "BRIGHT CORE DOT  YOUR HITBOX"];
          lines.forEach((line, i) => text(frame, line, 167, 100 + i * 13, i === 7 ? 0xbaffdb : 0x9fbecd));
        }
        labels().forEach((label, i) => {
          const y = menuY() + i * 19, focused = selection === i;
          frame.rect(240, y + 2, 168, 15, focused ? 0x294555 : 0x0c1c2b, 0.94, 90, true);
          if (focused) { frame.rect(156, y + 2, 2, 15, 0xffd197, 1, 91, true); frame.rect(324, y + 2, 2, 15, 0xffd197, 1, 91, true); }
          const value = pending && i === selection ? "PREPARING FLIGHT..." : label;
          text(frame, value, 240 - value.length * 2, y, focused ? 0xffe0b1 : 0x8dabbf);
        });
        text(frame, "ARROWS SELECT   ENTER CONFIRM", 186, 257, 0x637f95);
      });
    },
  };
}
