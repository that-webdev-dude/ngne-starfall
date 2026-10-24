import { pressed, type Frame, type PreparedScene, type SceneDefinition } from "@ngne/core";
import { playbackFrame, poseSockets } from "../render/player-fx-model.ts";
import { rev01ScreenImages } from "../services/rev01-claims.ts";
import { rev01Image, rev01Sprite } from "../services/rev01-assets.ts";
import { saveSettings } from "../services/storage.ts";
import { centredX, drawText } from "../ui/bitmap-text.ts";
import { CENTRE_X, ITEM, LINE_STEP, SETTINGS_LABELS, hitItem, menuLayout, resultFrame, settingsControl, type MenuLayout, type Rect } from "../ui/menu-layout.ts";
import { PRESENTATION, TEXT_COLOR, art, drawAt, drawNineSlice, drawThreeSlice, fillRect, paletteColor } from "../ui/presentation.ts";
import { drawNative } from "../ui/sprite.ts";
import type { Progress, ProgressCommand, Session } from "../world/session.ts";
import { STAGES } from "../config/stages.ts";
import { LAYER } from "../config/layers.ts";
import { fromLegacy as w } from "../config/view.ts";

export type MenuKind = "title" | "pause" | "result";
const text = (frame: Frame, value: string, left: number, top: number, color: number) => drawText(frame, value, left, top, color, LAYER.screenText);
const centred = (frame: Frame, value: string, top: number, color: number) => text(frame, value, centredX(value, CENTRE_X), top, color);

export const CONTROLS_LINES = ["WASD / ARROWS  MOVE WITH MOMENTUM", "HOLD LEFT MOUSE / SPACE  FIRE UP", "GAMEPAD LEFT STICK  MOVE", "HOLD PAD X  FIRE STRAIGHT UP", "B / PAD A  NOVA BLAST", "ESC / P / START  PAUSE", "F  FULLSCREEN", "BRIGHT CORE DOT  YOUR HITBOX"];

/** One menuItem row: 3-slice plate (focused caps when selected), centred text or a settings label + control. */
function drawItem(frame: Frame, rect: Rect, label: string, focused: boolean, control?: { kind: "meter" | "toggle"; frame: string }): void {
  const slices = focused ? ["left-focused", "fill-focused", "right-focused"] as const : ["left", "fill", "right"] as const;
  drawThreeSlice(frame, rev01Sprite("menuItem"), slices, rect.left, rect.top, rect.width, LAYER.screenItem);
  const color = focused ? TEXT_COLOR.focused : TEXT_COLOR.label, row = rect.top + ITEM.textOffset;
  if (!control) { centred(frame, label, row, color); return; }
  text(frame, label, rect.left + ITEM.labelInset, row, color);
  const image = art(control.kind === "meter" ? "optionMeter" : "optionToggle", control.frame);
  drawAt(frame, image, ITEM.controlRight + 1 - image.width, rect.top + Math.floor((rect.height - image.height) / 2), LAYER.screenItemMark);
}

/** menuPanel with its centred heading and panelRule (x 212..428). */
function drawPanel(frame: Frame, layout: MenuLayout, title?: string): void {
  const box = layout.panel;
  if (!box) return;
  drawNineSlice(frame, box.left, box.top, box.width, box.height, LAYER.screenPanel);
  if (title === undefined || layout.titleTop === undefined || layout.ruleTop === undefined) return;
  centred(frame, title, layout.titleTop, TEXT_COLOR.heading);
  drawThreeSlice(frame, rev01Sprite("panelRule"), ["left", "fill", "right"], 212, layout.ruleTop, 428 - 212 + 1, LAYER.screenPanel);
}

/**
 * Title, pause/settings/controls and result screens on the rev01 menu kit (spec presentation.screens): 1x 5x7 text,
 * 9-slice panels, menuItem rows whose rects are also the click areas (press and release on the same item),
 * fixed settings labels with optionMeter/optionToggle controls, resultPlate titles. The title keeps its established
 * composition and placement with native frames, font and item kit.
 */
export function menuScene(kind: MenuKind, session: Session, take: (purpose: string) => PreparedScene | undefined): SceneDefinition<Progress, ProgressCommand> {
  return {
    // Pause/result draw over a stage scene, which already claims the rev01 screen kit (stage-assets.ts).
    id: `menu-${kind}`, blocksUpdateBelow: true, assets: kind === "title" ? [rev01Image("breakwaterBackground"), rev01Image("player"), rev01Image("exhaust"), ...rev01ScreenImages()] : [],
    setup(scene) {
      session.screen = kind === "title" ? "title" : kind === "pause" ? "paused" : session.run?.phase === "clear" ? "clear" : "dead";
      if (kind === "pause") scene.defer(() => { if (session.screen === "paused") session.screen = "playing"; });
      // Every title raster is a native frame.
      scene.camera.pixelSnap = false;
      let selection = 0, page: "main" | "settings" | "controls" = "main", clock = 0, pending: string | undefined, previousAxis = 0;
      const labels = (): readonly string[] => page === "controls" ? ["BACK"] : page === "settings" ? SETTINGS_LABELS
        : kind === "title" ? ["LAUNCH CAMPAIGN", "SETTINGS", "CONTROLS"] : kind === "pause" ? PRESENTATION.screens.pause.items
        : [session.run?.phase === "clear" ? session.run.stageIndex === 2 ? "PLAY AGAIN" : "NEXT SECTOR" : "RETRY SECTOR", "RETURN TO TITLE"];
      const stats = (): { text: string; color: number }[] => {
        const run = session.run!;
        const message = run.phase === "clear" ? run.stageIndex === 2 ? "ALL THREE SECTORS LIBERATED / CAMPAIGN COMPLETE" : `NEXT / ${STAGES[run.stageIndex + 1].name}` : `RETRY / ${STAGES[run.stageIndex].name}`;
        const closing = run.phase === "clear" ? run.stageIndex === 2 ? "WELCOME HOME. YOU EARNED IT." : "SCORE BANKED / HULL AND NOVA RESTORED" : `SECTOR ENTRY SCORE ${run.entryScore}`;
        return [{ text: `SCORE ${String(run.score).padStart(7, "0")}`, color: TEXT_COLOR.value }, { text: `KILLS ${run.kills}   BEST ${session.best}`, color: TEXT_COLOR.label },
          { text: message, color: TEXT_COLOR.label }, { text: closing, color: TEXT_COLOR.label }];
      };
      const layout = (): MenuLayout => page === "controls" ? menuLayout("controls", 1) : page === "settings" ? menuLayout("panel", labels().length)
        : kind === "title" ? menuLayout("title", labels().length) : kind === "result" ? menuLayout("result", labels().length, stats().length) : menuLayout("panel", labels().length);
      scene.system(({ dt, input, scenes }) => {
        clock += dt;
        if (pending) { const candidate = take(pending); if (candidate) scenes.set(candidate); return; }
        const list = labels(), axis = Math.abs(input.axes[1] ?? 0) > 0.6 ? Math.sign(input.axes[1]) : 0;
        if (pressed(input, "ArrowDown") || pressed(input, "KeyS") || pressed(input, "Pad13") || axis === 1 && previousAxis !== 1) selection = (selection + 1) % list.length;
        if (pressed(input, "ArrowUp") || pressed(input, "KeyW") || pressed(input, "Pad12") || axis === -1 && previousAxis !== -1) selection = (selection + list.length - 1) % list.length;
        previousAxis = axis;
        let activate = pressed(input, "Enter") || pressed(input, "Space") || pressed(input, "Pad0");
        const items = layout().items;
        for (const click of input.pointer.completed) { const hit = hitItem(items, click); if (hit >= 0) { selection = hit; activate = true; } }
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
          const centre = w(240), playerY = w(126);
          drawNative(frame, rev01Sprite("breakwaterBackground").frames[0], centre, 180, { layer: LAYER.background });
          frame.rect(centre, 180, 640, 360, 0x030c18, 0.44, LAYER.backgroundTint, true);
          const exhaust = session.settings.reducedMotion ? rev01Sprite("exhaust").frame("medium") : playbackFrame(rev01Sprite("exhaust"), clock)!;
          for (const [sx, sy] of poseSockets(0).exhaust) drawNative(frame, exhaust, centre + sx, playerY + sy, { layer: LAYER.playerExhaust });
          drawNative(frame, rev01Sprite("player").frame("neutral"), centre, playerY, { layer: LAYER.player });
        } else fillRect(frame, 0, 0, 640, 360, paletteColor(PRESENTATION.screens.dim.fill), LAYER.screenDim, PRESENTATION.screens.dim.opacity);
        const current = layout(), list = labels();
        if (kind === "title" && page === "main") {
          // Pre-rev01 rows, 1x text (no runtime scaling): wordmark, tagline above the ship, line below it.
          centred(frame, "STARFALL", 77, TEXT_COLOR.heading);
          centred(frame, "THREE SECTORS / ONE LAST FLIGHT", 115, TEXT_COLOR.value);
          centred(frame, "A PILOT. A NOVA. A SKY FULL OF TROUBLE.", 217, TEXT_COLOR.label);
        } else if (kind === "result" && page === "main") {
          const plate = PRESENTATION.screens.result.plate;
          drawAt(frame, art("resultPlate", resultFrame(session.run!)), plate.x, plate.y, LAYER.screenPanel);
          drawPanel(frame, current);
          stats().forEach((line, i) => centred(frame, line.text, current.linesTop! + i * LINE_STEP, line.color));
        } else {
          const screens = PRESENTATION.screens;
          drawPanel(frame, current, page === "settings" ? screens.settings.title : page === "controls" ? screens.controls.title : screens.pause.title);
        }
        if (page === "controls") CONTROLS_LINES.forEach((line, i) => text(frame, line, PRESENTATION.screens.controls.lineX, current.linesTop! + i * LINE_STEP, i === 7 ? TEXT_COLOR.heading : TEXT_COLOR.label));
        current.items.forEach((rect, i) => {
          const value = pending && i === selection ? "PREPARING FLIGHT..." : list[i];
          drawItem(frame, rect, value, selection === i, page === "settings" ? settingsControl(session.settings, i) : undefined);
        });
        const footer = PRESENTATION.screens.footer;
        text(frame, footer.text, centredX(footer.text, footer.centreX), footer.row, TEXT_COLOR.label);
      });
    },
  };
}
