import { PRESENTATION } from "./presentation.ts";
import type { RunState, Settings } from "../world/session.ts";

/**
 * Screen geometry from spec presentation.screens. One layout drives both drawing and pointer hit tests,
 * so a menuItem's pixels and its click rect are the same rows and columns. All coordinates are pixels.
 */
const screens = PRESENTATION.screens, panel = screens.panel;
export const ITEM = { left: panel.item.x[0], right: panel.item.x[1], height: panel.item.height, step: panel.itemStep, textOffset: 4, labelInset: 8, controlRight: panel.item.x[0] + 200 } as const;
export const CENTRE_X = 320;
/** Text line step on the controls page and the result panel (11 rows). */
export const LINE_STEP = screens.controls.lineStep;

export interface Rect { left: number; top: number; width: number; height: number }
export interface PanelBox { left: number; top: number; width: number; height: number }

/** Panel box: rows centred on 180 (top = 180 - floor(height / 2); even heights sit half a row high). */
export function panelBox(height: number, [left, right]: readonly [number, number] = panel.x): PanelBox {
  return { left, top: panel.centreY - Math.floor(height / 2), width: right - left + 1, height };
}
export const menuPanelHeight = (items: number) => 40 + panel.itemStep * items;
export const controlsPanelHeight = (lines: number) => 40 + panel.itemStep + LINE_STEP * lines + 4;
export const resultPanelHeight = (statLines: number, items: number) => 23 + LINE_STEP * statLines + panel.itemStep * items;

/** Item rect at x 216..424, rows top..top+14. */
export const itemRect = (top: number): Rect => ({ left: ITEM.left, top, width: ITEM.right - ITEM.left + 1, height: ITEM.height });

/** Whether pointer position (logical px, possibly fractional) falls on one of the rect's pixels. */
export const inside = (rect: Rect, x: number, y: number) => x >= rect.left && x < rect.left + rect.width && y >= rect.top && y < rect.top + rect.height;

/** Index of the item a completed click activates: press (drag start) and release both inside the same item rect; -1 otherwise. */
export function hitItem(items: readonly Rect[], click: { button: number; startX: number; startY: number; x: number; y: number }): number {
  if (click.button !== 0) return -1;
  return items.findIndex((rect) => inside(rect, click.startX, click.startY) && inside(rect, click.x, click.y));
}

/** Settings controls: meters show round(value * 4) of 4 cells; SOUND is on when not muted. */
export const meterFrame = (value: number) => `level-${Math.round(Math.min(1, Math.max(0, value)) * 4)}`;
export const toggleFrame = (on: boolean) => on ? "on" : "off";
export type SettingsControl = { kind: "meter"; frame: string } | { kind: "toggle"; frame: string } | undefined;
export const SETTINGS_LABELS = ["MUSIC", "EFFECTS", "SOUND", "REDUCED MOTION", "BACK"] as const;
export function settingsControl(settings: Settings, index: number): SettingsControl {
  if (index === 0) return { kind: "meter", frame: meterFrame(settings.music) };
  if (index === 1) return { kind: "meter", frame: meterFrame(settings.effects) };
  if (index === 2) return { kind: "toggle", frame: toggleFrame(!settings.muted) };
  if (index === 3) return { kind: "toggle", frame: toggleFrame(settings.reducedMotion) };
  return undefined;
}

/** Result title plate (presentation.screens.result.frames): clear stages 1-2, clear stage 3, dead. */
export const resultFrame = (run: Pick<RunState, "phase" | "stageIndex">) => run.phase === "clear" ? run.stageIndex === 2 ? "campaign-complete" : "sector-secured" : "signal-lost";

/** Title screen (outside the gate 5 pass): items keep the pre-rev01 rows, now on menuItem rects (row 241 = the old box centre 248 - 7). */
export const TITLE_ITEMS_TOP = 241;

export interface MenuLayout {
  /** menuPanel box; undefined on the title's main page. */
  panel?: PanelBox;
  /** Page title (1x heading) top row, centred on 320; the panelRule sits at panel top + 22. */
  titleTop?: number;
  ruleTop?: number;
  items: Rect[];
  /** First text line row (controls lines / result stats), step 11. */
  linesTop?: number;
}

/** Layout of a page with `items` items: main/settings panels, the controls page, the result panel or the bare title list. */
export function menuLayout(page: "title" | "panel" | "controls" | "result", items: number, statLines = 0): MenuLayout {
  if (page === "title") return { items: Array.from({ length: items }, (_, i) => itemRect(TITLE_ITEMS_TOP + i * ITEM.step)) };
  if (page === "result") {
    const box = { left: 170, top: 116, width: 301, height: resultPanelHeight(statLines, items) };
    const linesTop = box.top + 10, itemsTop = linesTop + LINE_STEP * statLines + 5;
    return { panel: box, items: Array.from({ length: items }, (_, i) => itemRect(itemsTop + i * ITEM.step)), linesTop };
  }
  if (page === "controls") {
    const box = panelBox(controlsPanelHeight(screens.controls.lines)), itemsTop = box.top + 32;
    return { panel: box, titleTop: box.top + 10, ruleTop: box.top + 22, linesTop: itemsTop, items: [itemRect(itemsTop + LINE_STEP * screens.controls.lines + 4)] };
  }
  const box = panelBox(menuPanelHeight(items)), itemsTop = box.top + 32;
  return { panel: box, titleTop: box.top + 10, ruleTop: box.top + 22, items: Array.from({ length: items }, (_, i) => itemRect(itemsTop + i * ITEM.step)) };
}
