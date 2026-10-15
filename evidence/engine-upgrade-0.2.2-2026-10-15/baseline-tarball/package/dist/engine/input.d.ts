export interface InputSnapshot {
    readonly held: readonly string[];
    readonly pressed: readonly string[];
    readonly released: readonly string[];
    readonly pointer: Readonly<{
        x: number;
        y: number;
        active: boolean;
        dx: number;
        dy: number;
        completed: readonly Readonly<{
            button: number;
            startX: number;
            startY: number;
            x: number;
            y: number;
        }>[];
    }>;
    readonly wheel: number;
    readonly axes: readonly number[];
}
export declare const emptyInput: () => InputSnapshot;
export declare const down: (i: InputSnapshot, key: string) => boolean;
export declare const pressed: (i: InputSnapshot, key: string) => boolean;
export declare class Input {
    private held;
    private presses;
    private releases;
    private x;
    private y;
    private dx;
    private dy;
    private active;
    private pointerPresses;
    private completions;
    private wheel;
    private cleanups;
    private padHeld;
    private padIndex?;
    private blockedPadIndex?;
    private focused;
    set(key: string, value: boolean): void;
    attach(canvas: HTMLCanvasElement, width: number, height: number): void;
    consume(): InputSnapshot;
    clear(): void;
    dispose(): void;
}
