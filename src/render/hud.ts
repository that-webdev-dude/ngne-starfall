import type { Frame } from "@ngne/core";
import { LAYER } from "../config/layers.ts";
import type { StageConfig } from "../config/stages.ts";
import { rev01Sprite } from "../services/rev01-assets.ts";
import { centredX, drawText, textWidth } from "../ui/bitmap-text.ts";
import {
    PRESENTATION,
    TEXT_COLOR,
    art,
    clipColumns,
    drawAt,
    drawThreeSlice,
    fillColumns,
    fillRect,
    paletteColor,
    playbackFrame,
} from "../ui/presentation.ts";
import type { RunState, Session } from "../world/session.ts";
import type { RenderPassFactory } from "./pass.ts";

/** Stage card display time (owner, gate 5): 2.6 s from stage start, cut in / cut out, same in reduced motion. */
export const STAGE_CARD_SECONDS = 2.6;
/** Low hull (owner, gate 5): hull <= 1 of 5. */
export const LOW_HULL = 1;
/** Nova counts as ready from here (unchanged pre-rev01 HUD threshold). */
const NOVA_READY = 0.999;

/** The stage card's own clock: advanced by its own system, separate from every gameplay clock. */
export interface StageCard {
    readonly elapsed: number;
    readonly visible: boolean;
    advance(dt: number): void;
}
export function createStageCard(seconds = STAGE_CARD_SECONDS): StageCard {
    let elapsed = 0;
    return {
        get elapsed() {
            return elapsed;
        },
        // 1e-9 absorbs float drift so 156 ticks of 1/60 s end the card exactly at 2.6 s.
        get visible() {
            return elapsed < seconds - 1e-9;
        },
        advance(dt) {
            elapsed += dt;
        },
    };
}

/** Boss threshold keys in presentation.layout.topRowB.bossMarks, per stage id (stages.ts ids). */
const BOSS_MARK_KEY: Record<string, string> = {
    "orbital-breakwater": "gatebreaker",
    "furnace-belt": "kilnSerpent",
    "midnight-citadel": "starfallEngine",
};
export const bossThresholds = (stageId: string): readonly number[] =>
    PRESENTATION.layout.topRowB.bossMarks.thresholds[BOSS_MARK_KEY[stageId]] ?? [];
/** Exact gameplay fractions decide passed state; spec decimals only place the mark columns. */
const BOSS_PHASE_FRACTIONS: Record<string, readonly number[]> = {
    gatebreaker: [1 / 2],
    kilnSerpent: [1 / 2],
    starfallEngine: [1 / 3, 2 / 3],
};
for (const [key, fractions] of Object.entries(BOSS_PHASE_FRACTIONS)) {
    const thresholds = PRESENTATION.layout.topRowB.bossMarks.thresholds[key];
    if (
        thresholds?.length !== fractions.length ||
        fractions.some((fraction, i) => Math.abs(fraction - thresholds[i]) > 1e-4)
    )
        throw new Error(`Boss mark thresholds disagree with gameplay: ${key}`);
}

/** The bottom-band hint (spec bottom.controlsHint: 37 chars, 221 px, no plate). */
export const CONTROLS_HINT = "SPACE/MOUSE FIRE   B NOVA   ESC PAUSE";
/** Timer right edge (spec bottom.timer "right edge 631"). */
const TIMER_RIGHT = 631;
/** Banner plate margin each side of the text (spec banner width = textWidth + 22). */
const BANNER_SIDE = 11;

const timerText = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export interface HudState {
    run: RunState;
    stage: StageConfig;
    session: Session;
    card: StageCard;
}

/**
 * Draws the rev01 HUD into the native frame (spec presentation.layout): opaque bands, hudPlate plates, text in the
 * 5x7 font, hull pips, nova/charge/boss bars, boss marks and name, centre banner by kind, stage card and score pops.
 * All on HUD layers (below nova, lanes, bullets and the core). Reduced motion swaps every HUD loop for its hudCalm frame.
 */
export function drawHud(frame: Frame, { run, stage, session, card }: HudState): void {
    const layout = PRESENTATION.layout,
        a = layout.topRowA,
        b = layout.bottom,
        bands = PRESENTATION.bands;
    const calm = session.settings.reducedMotion,
        ms = run.effectClock * 1000;
    const plate = rev01Sprite("hudPlate"),
        slices = ["left", "fill", "right"] as const;
    const plateAt = ([left, right]: [number, number], top: number) =>
        drawThreeSlice(frame, plate, slices, left, top, right - left + 1, LAYER.hudPlate);
    const label = (value: string, x: number, y: number, color: number) =>
        drawText(frame, value, x, y, color, LAYER.hudText);

    for (const pop of run.scorePops)
        drawText(frame, pop.text, pop.x, pop.y, TEXT_COLOR.scorePop, LAYER.scorePop);

    // Bands: opaque panel[0] with a panel[1] edge row facing the playfield.
    const [topFirst, topLast] = bands.top.rows,
        [bottomFirst, bottomLast] = bands.bottom.rows;
    fillRect(
        frame,
        0,
        topFirst,
        640,
        topLast - topFirst,
        paletteColor(bands.top.fill),
        LAYER.hudBand,
        bands.opacity,
    );
    fillRect(frame, 0, topLast, 640, 1, paletteColor(bands.top.edge), LAYER.hudBand, bands.opacity);
    fillRect(
        frame,
        0,
        bottomFirst,
        640,
        1,
        paletteColor(bands.bottom.edge),
        LAYER.hudBand,
        bands.opacity,
    );
    fillRect(
        frame,
        0,
        bottomFirst + 1,
        640,
        bottomLast - bottomFirst,
        paletteColor(bands.bottom.fill),
        LAYER.hudBand,
        bands.opacity,
    );

    // Top row A: wordmark + score, chain, hull, nova.
    const [plateTop] = a.plateRows,
        [textTop] = a.textRows;
    for (const range of [a.scorePlate, a.chainPlate, a.hullPlate, a.novaPlate])
        plateAt(range, plateTop);
    label(a.wordmark.text, a.wordmark.x, textTop, TEXT_COLOR.heading);
    label(String(run.score).padStart(7, "0"), a.score.x, textTop, TEXT_COLOR.value);
    label(
        `CHAIN ${run.combo}X`,
        a.chain.x,
        textTop,
        run.combo > 1 ? TEXT_COLOR.chainActive : TEXT_COLOR.chainIdle,
    );
    const low = run.hull <= LOW_HULL;
    label(a.hullLabel.text, a.hullLabel.x, textTop, low ? TEXT_COLOR.danger : TEXT_COLOR.label);
    const pips = rev01Sprite("hudPip"),
        lowPip = calm ? art("hudCalm", "pip-low") : playbackFrame(pips, ms);
    a.hullPips.x.forEach((x, i) =>
        drawAt(
            frame,
            i < run.hull ? (low ? lowPip : pips.frame("full")) : pips.frame("empty"),
            x,
            a.hullPips.y,
            LAYER.hudFill,
        ),
    );
    const ready = run.nova >= NOVA_READY,
        novaBar = rev01Sprite("novaBar");
    label(
        ready ? "NOVA READY" : `NOVA ${Math.ceil((1 - run.nova) * 15)}S`,
        a.nova.x,
        textTop,
        ready ? TEXT_COLOR.novaReady : TEXT_COLOR.label,
    );
    drawAt(frame, novaBar.frame("track"), a.novaBar.x, a.novaBar.y, LAYER.hudTrack);
    if (ready)
        drawAt(
            frame,
            calm ? art("hudCalm", "nova-ready") : playbackFrame(novaBar, ms),
            a.novaBar.x,
            a.novaBar.y,
            LAYER.hudFill,
        );
    else {
        const fill = novaBar.frame("fill"),
            columns = fillColumns(fill.width, run.nova);
        if (columns)
            drawAt(frame, clipColumns(fill, columns), a.novaBar.x, a.novaBar.y, LAYER.hudFill);
    }

    // Top row B (boss only): name, health bar, phase marks.
    if (run.phase === "boss") {
        const row = layout.topRowB,
            name = stage.boss.name,
            fraction = run.bossMax > 0 ? run.bossHealth / run.bossMax : 0;
        label(name, centredX(name, 320), row.bossName.textRows[0], TEXT_COLOR.heading);
        const bar = rev01Sprite("bossBar"),
            fill = bar.frame("fill"),
            columns = fillColumns(fill.width, fraction);
        drawAt(frame, bar.frame("track"), row.bossBar.x, row.bossBar.y, LAYER.hudTrack);
        if (columns)
            drawAt(frame, clipColumns(fill, columns), row.bossBar.x, row.bossBar.y, LAYER.hudFill);
        // Mark left column 200 + round(240 * t) - 1: its centre column sits t of the way along the 241-column bar.
        for (const [i, threshold] of bossThresholds(stage.id).entries()) {
            drawAt(
                frame,
                art(
                    "bossBarMark",
                    fraction < BOSS_PHASE_FRACTIONS[BOSS_MARK_KEY[stage.id]][i]
                        ? "passed"
                        : "ahead",
                ),
                row.bossBar.x + Math.round((fill.width - 1) * threshold) - 1,
                row.bossMarks.y,
                LAYER.hudFillTop,
            );
        }
    }

    // Bottom band: stage, plasma charge (no charge state exists: always the empty frame), controls hint, timer.
    const [bottomPlateTop] = b.plateRows,
        [bottomText] = b.textRows;
    for (const range of [b.stagePlate, b.chargePlate, b.timerPlate]) plateAt(range, bottomPlateTop);
    label(`0${stage.index + 1} / ${stage.name}`, b.stage.x, bottomText, TEXT_COLOR.label);
    label(b.chargeLabel.text, b.chargeLabel.x, bottomText, TEXT_COLOR.label);
    drawAt(frame, art("chargeBar", "empty"), b.chargeBar.x, b.chargeBar.y, LAYER.hudTrack);
    label(CONTROLS_HINT, b.controlsHint.x, bottomText, TEXT_COLOR.label);
    const timer = timerText(run.seconds);
    label(timer, TIMER_RIGHT + 1 - textWidth(timer), bottomText, TEXT_COLOR.label);

    // Centre banner: the stage-start banner ("stage") is shown by the stage card instead.
    if (run.bannerTime > 0 && run.bannerKind !== "stage") {
        const alert = run.bannerKind === "phase",
            banner = layout.banner,
            x = centredX(run.banner, banner.centreX);
        const sliceNames = alert
            ? (["left-alert", "fill-alert", "right-alert"] as const)
            : (["left", "fill", "right"] as const);
        drawThreeSlice(
            frame,
            rev01Sprite("bannerPlate"),
            sliceNames,
            x - BANNER_SIDE,
            banner.rows[0],
            textWidth(run.banner) + 2 * BANNER_SIDE,
            LAYER.banner,
        );
        drawText(
            frame,
            run.banner,
            x,
            banner.textRows[0],
            alert ? TEXT_COLOR.danger : TEXT_COLOR.heading,
            LAYER.bannerText,
        );
    }

    if (card.visible) {
        const { x, y } = layout.stageCard,
            cardArt = rev01Sprite("stageCard");
        const slots = cardArt.spec.textSlots as {
            sector: { x: number; y: number };
            name: { x: number; y: number };
        };
        drawAt(frame, cardArt.frame(stage.id), x, y, LAYER.stageCard);
        drawText(
            frame,
            `SECTOR 0${stage.index + 1}`,
            x + slots.sector.x,
            y + slots.sector.y,
            TEXT_COLOR.label,
            LAYER.stageCardText,
        );
        drawText(
            frame,
            stage.name,
            x + slots.name.x,
            y + slots.name.y,
            TEXT_COLOR.heading,
            LAYER.stageCardText,
        );
    }
}

/** Stage HUD pass. The stage card timer starts with the stage and ticks in its own system (frozen under pause). */
export const createHudRender: RenderPassFactory = ({ run, stage, session, scene }) => {
    const card = createStageCard();
    scene.system(({ dt }) => card.advance(dt), { runsDuringFreeze: true });
    return (frame) => drawHud(frame, { run, stage, session, card });
};
