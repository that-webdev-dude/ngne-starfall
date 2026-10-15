import { Camera } from "./primitives.js";
export interface Sprite {
    x: number;
    y: number;
    width: number;
    height: number;
    color?: number;
    alpha?: number;
    rotation?: number;
    texture?: string;
    u?: number;
    v?: number;
    uw?: number;
    vh?: number;
    layer?: number;
    depth?: number;
    screen?: boolean;
}
/** Renderer input contains no entities. Ordering is scene -> layer -> depth -> insertion. */
export declare class Frame {
    data: Float32Array<ArrayBuffer>;
    count: number;
    readonly textures: (string | undefined)[];
    readonly order: number[];
    private layers;
    private depths;
    private scenes;
    private sceneIndex;
    private camera;
    private snap;
    reset(): void;
    scene(camera: Camera, alpha: number): void;
    sprite(s: Sprite): void;
    rect(x: number, y: number, width: number, height: number, color: number, alpha?: number, layer?: number, screen?: boolean): void;
    private add;
    private grow;
    sort(): void;
}
