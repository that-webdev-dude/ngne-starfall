import { Game, type GameOptions, type PreparedScene } from "./scene.js";
import { Frame } from "./renderer.js";
import { Input } from "./input.js";
import { Audio } from "./audio.js";
import { WebGPURenderer } from "./webgpu-renderer.js";
export interface FrameScheduler {
    request(callback: FrameRequestCallback): number;
    cancel(id: number): void;
}
export interface BrowserOptions<S, C> extends GameOptions<S, C> {
    canvas: HTMLCanvasElement;
    width?: number;
    height?: number;
    maxTicks?: number;
    clear?: number;
    scheduler?: FrameScheduler;
    afterFrame?: (stats: Readonly<Stats>) => void;
}
export interface Stats {
    fps: number;
    frameMs: number;
    updateMs: number;
    renderMs: number;
    sprites: number;
    drawCalls: number;
    droppedTicks: number;
}
export declare class BrowserGame<S, C> {
    private options;
    readonly game: Game<S, C>;
    readonly input: Input;
    readonly audio: Audio;
    readonly frame: Frame;
    readonly stats: Stats;
    renderer?: WebGPURenderer;
    private rendererPromise?;
    private acquisitionAbort?;
    private acquisition;
    private loop;
    private raf;
    private last;
    private enabled;
    private attached;
    private operation?;
    private disposed;
    private disposal?;
    private run;
    readonly width: number;
    readonly height: number;
    private scheduler;
    constructor(options: BrowserOptions<S, C>);
    private reportRenderer;
    private ensureRenderer;
    private restoreBackingSize;
    private endRenderer;
    private frameCallback;
    start(initial?: PreparedScene): Promise<void>;
    stop(): Promise<void>;
    dispose(): Promise<void>;
    private requireIdle;
}
