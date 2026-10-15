import { type WorldAccess } from "./ecs.js";
import { Assets, type Asset, type AssetRetention } from "./assets.js";
import { Camera, Random } from "./primitives.js";
import type { DeepReadonly } from "./primitives.js";
import { type InputSnapshot } from "./input.js";
import type { Frame } from "./renderer.js";
import { type InspectionValue } from "./inspection.js";
/** Internal browser-host capability; deliberately absent from the package entry point. */
export declare const FAIL_GAME: unique symbol;
/** Host-only image readiness; no browser or GPU types cross this capability. */
export declare const PREPARE_ASSET: unique symbol;
export interface DisplaySnapshot {
    readonly width: number;
    readonly height: number;
    readonly pixelRatio: number;
}
export interface SceneEvent {
    readonly type: string;
    readonly [key: string]: unknown;
}
export interface StateAccess<S, C> {
    read(): DeepReadonly<S>;
    /** Copies plain data now; allowed only during the owning scene's system update. */
    readonly dispatch: (command: C) => void;
}
export interface SceneCommands {
    set(candidate: PreparedScene): void;
    push(candidate: PreparedScene): void;
    pop(): void;
}
export interface SystemContext {
    readonly dt: number;
    readonly simulationTick: number;
    readonly input: InputSnapshot;
    readonly display: DisplaySnapshot;
    readonly world: WorldAccess;
    readonly camera: Camera;
    readonly events: readonly SceneEvent[];
    emit(event: SceneEvent): void;
    readonly scenes: SceneCommands;
}
export interface SceneDefinition<S = unknown, C = never> {
    readonly id: string;
    readonly blocksUpdateBelow?: boolean;
    readonly assets?: readonly Asset<unknown>[];
    readonly setup: (scene: SceneSetup<S, C>) => void;
}
export interface SceneSetup<S = unknown, C = never> {
    readonly world: WorldAccess;
    readonly camera: Camera;
    readonly assets: ReadonlyMap<string, unknown>;
    resource<T>(name: string, value: T, cleanup?: (value: T) => void): T;
    random(name: string): Random;
    system(update: (context: SystemContext) => void, options?: {
        runsDuringFreeze?: boolean;
    }): void;
    render(prepare: (frame: Frame, alpha: number) => void): void;
    resetInterpolation(action: () => void): void;
    /** Bind during setup, then inject into selected systems. Setup itself cannot dispatch. */
    state(): StateAccess<S, C>;
    freeze(ticks: number): void;
    defer(cleanup: () => void): void;
}
export interface PreparedScene {
    release(): void;
}
export interface SceneCandidateOptions {
    readonly key: string;
    readonly seed?: number;
    /** Additional attempts after the first failure. */
    readonly retries?: number;
}
export interface SceneCandidates<S, C> {
    /** Keep one prepared candidate for this mounted scene and purpose, refilling after take. */
    ensure(ownerId: number, purpose: string, definition: SceneDefinition<S, C>, options: SceneCandidateOptions): void;
    /** Remove and return a ready candidate once. */
    take(ownerId: number, purpose: string): PreparedScene | undefined;
    /** Cancel and release one purpose, or every purpose owned by the scene. */
    release(ownerId: number, purpose?: string): void;
}
export interface SceneInspection {
    readonly id: number;
    readonly definition: string;
    readonly key: string;
    readonly seed: number;
    readonly blocksUpdateBelow: boolean;
    readonly entityCount: number;
    readonly entityCapacity: number;
    readonly freezeRemaining: number;
}
export interface SceneStateInspection extends SceneInspection {
    readonly world: InspectionValue;
    readonly resources: InspectionValue;
    readonly random: InspectionValue;
    readonly camera: InspectionValue;
    readonly freezePending: number;
    readonly inbox: InspectionValue;
    readonly outbox: InspectionValue;
}
export interface GameInspection {
    readonly compatibility: string;
    readonly dt: number;
    readonly simulationTick: number;
    readonly rootSeed: number;
    readonly nextInstanceId: number;
    readonly state: InspectionValue;
    readonly scenes: readonly SceneStateInspection[];
}
export type Lifecycle = "Stopped" | "Starting" | "Running" | "Stopping" | "Failed" | "Disposing" | "Disposed";
export interface GameOptions<S, C> {
    seed: number | string;
    state: S;
    transition: (state: DeepReadonly<S>, command: DeepReadonly<C>) => S | DeepReadonly<S>;
    dt?: number;
    compatibility?: string;
    diagnostic?: (error: unknown) => void;
    assetRetention?: AssetRetention;
}
/** Headless orchestrator. BrowserGame owns platform services and delegates simulation here. */
export declare class Game<S = Record<string, never>, C = never> {
    #private;
    private options;
    [PREPARE_ASSET]?: (asset: Asset, signal: AbortSignal) => Promise<(() => void) | undefined>;
    readonly rootSeed: number;
    readonly assets: Assets;
    readonly dt: number;
    readonly candidates: SceneCandidates<S, C>;
    private owner;
    private stack;
    private nextId;
    private stateValue;
    private stateCommands;
    private updatingScene;
    private commands;
    private preparedScenes;
    private candidateSlots;
    private preparations;
    private initialized;
    private busy;
    constructor(options: GameOptions<S, C>);
    get state(): DeepReadonly<S>;
    get simulationTick(): number;
    get lifecycle(): Lifecycle;
    [FAIL_GAME](): void;
    /** Fresh frozen summaries in stack order; compare ids across inspections. */
    get scenes(): readonly SceneInspection[];
    report(error: unknown): void;
    prepare(definition: SceneDefinition<S, C>, options: {
        key: string;
        seed?: number;
        signal?: AbortSignal;
    }): Promise<PreparedScene>;
    private ensureCandidate;
    private prepareCandidateSlot;
    private takeCandidate;
    private releaseCandidateSlots;
    private releaseCandidateSlot;
    private mount;
    private createSceneSetup;
    private publishScene;
    start(initial?: PreparedScene, loop?: {
        start(): void;
        stop(): void;
    }): Promise<void>;
    private cancelPending;
    stop(): void;
    /** Queue an already prepared candidate. It publishes only at a tick boundary. */
    set(candidate: PreparedScene): void;
    push(candidate: PreparedScene): void;
    pop(): void;
    private enqueue;
    tick(input?: InputSnapshot, display?: DisplaySnapshot): void;
    private updateScenes;
    private commitSceneSimulation;
    private commitStateCommands;
    private applySceneCommands;
    private disposeMountedScene;
    render(frame: Frame, alpha: number): void;
    private findUpdateStart;
    /** Detached frozen diagnostics. Inspect after tick() returns for a completed commit. */
    enumerate(): GameInspection;
    dispose(): void;
}
