import { World } from "./ecs.js";
import { Assets } from "./assets.js";
import { Camera, Cleanup, immutable, Random, seedOf } from "./primitives.js";
import { emptyInput } from "./input.js";
import { inspectValue } from "./inspection.js";
/** Internal browser-host capability; deliberately absent from the package entry point. */
export const FAIL_GAME = Symbol("fail game");
/** Host-only image readiness; no browser or GPU types cross this capability. */
export const PREPARE_ASSET = Symbol("prepare asset");
class SceneCandidate {
    owner;
    definition;
    key;
    seed;
    leases;
    onRelease;
    handle = Object.freeze({ release: () => this.release() });
    status = "ready";
    constructor(owner, definition, key, seed, leases, onRelease = () => { }) {
        this.owner = owner;
        this.definition = definition;
        this.key = key;
        this.seed = seed;
        this.leases = leases;
        this.onRelease = onRelease;
    }
    consume(owner) {
        if (owner !== this.owner || this.status !== "ready")
            throw new Error("Scene candidate is stale, consumed, or foreign");
        this.status = "used";
        return this.leases.splice(0);
    }
    release() {
        if (this.status !== "ready")
            return;
        this.status = "released";
        this.onRelease();
        const cleanup = new Cleanup();
        for (const lease of this.leases.splice(0))
            cleanup.defer(() => lease.release());
        cleanup.dispose();
    }
}
class SceneInstance {
    id;
    definition;
    key;
    seed;
    world = new World();
    resources = new Map();
    randomStreams = new Map();
    camera = new Camera();
    cleanup = new Cleanup();
    schedule = [];
    inbox = Object.freeze([]);
    outbox = [];
    freezeRemaining = 0;
    freezePending = 0;
    prepare = () => { };
    resets = [];
    published = false;
    // Presentation eligibility only; suspension must preserve simulation poses.
    canInterpolate = false;
    constructor(id, definition, key, seed) {
        this.id = id;
        this.definition = definition;
        this.key = key;
        this.seed = seed;
        this.cleanup.defer(() => this.world.dispose());
    }
    dispose() {
        this.published = false;
        this.cleanup.dispose();
    }
    inspect() {
        return Object.freeze({
            id: this.id,
            definition: this.definition.id,
            key: this.key,
            seed: this.seed,
            blocksUpdateBelow: !!this.definition.blocksUpdateBelow,
            entityCount: this.world.size,
            entityCapacity: this.world.capacity,
            freezeRemaining: this.freezeRemaining,
        });
    }
    enumerate() {
        return Object.freeze({
            ...this.inspect(),
            world: inspectValue(this.world.enumerate()),
            resources: inspectValue(Object.fromEntries(this.resources)),
            random: inspectValue(Object.fromEntries([...this.randomStreams].map(([name, random]) => [name, random.snapshot()]))),
            camera: inspectValue(this.camera),
            freezeRemaining: this.freezeRemaining,
            freezePending: this.freezePending,
            inbox: inspectValue(this.inbox),
            outbox: inspectValue(this.outbox),
        });
    }
}
/** Headless orchestrator. BrowserGame owns platform services and delegates simulation here. */
export class Game {
    options;
    [PREPARE_ASSET];
    rootSeed;
    assets;
    dt;
    candidates;
    #simulationTick = 0;
    #lifecycle = "Stopped";
    owner = Symbol("game");
    stack = [];
    nextId = 1;
    stateValue;
    stateCommands = [];
    updatingScene;
    commands = [];
    preparedScenes = new Map();
    candidateSlots = new Map();
    preparations = new Set();
    initialized = false;
    busy = false;
    constructor(options) {
        this.options = options;
        this.assets = new Assets({
            retention: options.assetRetention,
            diagnostic: (error) => this.report(error),
        });
        if (typeof options.seed === "number" && !Number.isFinite(options.seed))
            throw new Error("Invalid root seed");
        this.rootSeed = seedOf(options.seed);
        this.stateValue = immutable(options.state);
        this.dt = options.dt ?? 1 / 60;
        if (!(this.dt > 0 && Number.isFinite(this.dt)))
            throw new Error("Invalid tick duration");
        this.candidates = Object.freeze({
            ensure: (ownerId, purpose, definition, candidateOptions) => this.ensureCandidate(ownerId, purpose, definition, candidateOptions),
            take: (ownerId, purpose) => this.takeCandidate(ownerId, purpose),
            release: (ownerId, purpose) => this.releaseCandidateSlots(ownerId, purpose),
        });
    }
    get state() {
        return this.stateValue;
    }
    get simulationTick() {
        return this.#simulationTick;
    }
    get lifecycle() {
        return this.#lifecycle;
    }
    [FAIL_GAME]() {
        if (this.lifecycle !== "Disposing" && this.lifecycle !== "Disposed")
            this.#lifecycle = "Failed";
    }
    /** Fresh frozen summaries in stack order; compare ids across inspections. */
    get scenes() {
        return Object.freeze(this.stack.map((scene) => scene.inspect()));
    }
    report(error) {
        try {
            this.options.diagnostic?.(error);
        }
        catch {
            /* Diagnostics must not change simulation. */
        }
    }
    async prepare(definition, options) {
        if (["Failed", "Disposing", "Disposed", "Stopping"].includes(this.lifecycle))
            throw new Error("Cannot prepare in " + this.lifecycle);
        if (!definition.id || !options.key)
            throw new Error("Scene identity and authored mount key are required");
        if (options.seed !== undefined &&
            (!Number.isSafeInteger(options.seed) || options.seed < 0 || options.seed > 0xffffffff))
            throw new Error("Scene seed must be uint32");
        const controller = new AbortController();
        this.preparations.add(controller);
        const cancel = () => controller.abort();
        options.signal?.addEventListener("abort", cancel, { once: true });
        if (options.signal?.aborted)
            controller.abort();
        const leases = [];
        try {
            // Each acquired lease is owned before the next await; rollback is deterministic.
            for (const asset of definition.assets ?? []) {
                const lease = await this.assets.acquire(asset, controller.signal, "scene");
                let cleanup;
                let released = false;
                leases.push({
                    id: lease.id,
                    value: lease.value,
                    release() {
                        if (released)
                            return;
                        released = true;
                        const errors = [];
                        try {
                            cleanup?.();
                        }
                        catch (error) {
                            errors.push(error);
                        }
                        try {
                            lease.release();
                        }
                        catch (error) {
                            errors.push(error);
                        }
                        if (errors.length)
                            throw new AggregateError(errors, "Prepared asset release failed");
                    },
                });
                cleanup = await this[PREPARE_ASSET]?.(asset, controller.signal);
                if (controller.signal.aborted)
                    throw new Error("Scene preparation cancelled");
            }
            if (controller.signal.aborted)
                throw new Error("Scene preparation cancelled");
            const candidate = new SceneCandidate(this.owner, definition, options.key, options.seed, leases, () => this.preparedScenes.delete(candidate.handle));
            this.preparedScenes.set(candidate.handle, candidate);
            return candidate.handle;
        }
        catch (error) {
            const errors = [error];
            for (const lease of leases.reverse()) {
                try {
                    lease.release();
                }
                catch (releaseError) {
                    errors.push(releaseError);
                }
            }
            throw new AggregateError(errors, "Scene preparation failed");
        }
        finally {
            this.preparations.delete(controller);
            options.signal?.removeEventListener("abort", cancel);
        }
    }
    ensureCandidate(ownerId, purpose, definition, options) {
        if (this.lifecycle !== "Running")
            throw new Error("Scene candidates require Running");
        if (!this.stack.some((scene) => scene.id === ownerId))
            throw new Error("Scene candidate owner is not mounted");
        if (!purpose)
            throw new Error("Scene candidate purpose is required");
        const retries = options.retries ?? 0;
        if (!Number.isSafeInteger(retries) || retries < 0)
            throw new Error("Scene candidate retries must be a non-negative integer");
        let slots = this.candidateSlots.get(ownerId);
        if (!slots) {
            slots = new Map();
            this.candidateSlots.set(ownerId, slots);
        }
        const previous = slots.get(purpose);
        if (previous?.definition === definition &&
            previous.options.key === options.key &&
            previous.options.seed === options.seed &&
            previous.options.retries === options.retries)
            return;
        if (previous)
            this.releaseCandidateSlot(previous);
        const slot = {
            ownerId,
            purpose,
            definition,
            options: Object.freeze({ ...options }),
            controller: new AbortController(),
            status: "preparing",
        };
        slots.set(purpose, slot);
        void this.prepareCandidateSlot(slot, retries);
    }
    async prepareCandidateSlot(slot, retries) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const handle = await this.prepare(slot.definition, {
                    key: slot.options.key,
                    seed: slot.options.seed,
                    signal: slot.controller.signal,
                });
                if (slot.status !== "preparing" ||
                    !this.stack.some((scene) => scene.id === slot.ownerId)) {
                    try {
                        handle.release();
                    }
                    catch (error) {
                        this.report(error);
                    }
                    return;
                }
                slot.handle = handle;
                slot.status = "ready";
                return;
            }
            catch (error) {
                if (slot.status === "released" || slot.controller.signal.aborted)
                    return;
                if (attempt === retries) {
                    slot.status = "failed";
                    this.report(error);
                }
            }
        }
    }
    takeCandidate(ownerId, purpose) {
        const slots = this.candidateSlots.get(ownerId);
        const slot = slots?.get(purpose);
        if (slot?.status !== "ready")
            return;
        slot.status = "consumed";
        const handle = slot.handle;
        slot.handle = undefined;
        queueMicrotask(() => {
            const currentSlots = this.candidateSlots.get(ownerId);
            if (currentSlots?.get(purpose) !== slot)
                return;
            currentSlots.delete(purpose);
            if (!currentSlots.size)
                this.candidateSlots.delete(ownerId);
            if (slot.status === "consumed" &&
                this.lifecycle === "Running" &&
                this.stack.some((scene) => scene.id === ownerId))
                this.ensureCandidate(ownerId, purpose, slot.definition, slot.options);
        });
        return handle;
    }
    releaseCandidateSlots(ownerId, purpose) {
        const slots = this.candidateSlots.get(ownerId);
        if (!slots)
            return;
        const selected = purpose ? [slots.get(purpose)] : [...slots.values()];
        const cleanup = new Cleanup();
        for (const slot of selected) {
            if (!slot)
                continue;
            slots.delete(slot.purpose);
            cleanup.defer(() => this.releaseCandidateSlot(slot));
        }
        if (!slots.size)
            this.candidateSlots.delete(ownerId);
        cleanup.dispose();
    }
    releaseCandidateSlot(slot) {
        if (slot.status === "released")
            return;
        slot.status = "released";
        slot.controller.abort();
        const handle = slot.handle;
        slot.handle = undefined;
        handle?.release();
    }
    mount(handle) {
        const candidate = this.preparedScenes.get(handle);
        if (!candidate)
            throw new Error("Scene candidate is stale, consumed, or foreign");
        const leases = candidate.consume(this.owner);
        this.preparedScenes.delete(handle);
        const scene = new SceneInstance(this.nextId++, candidate.definition, candidate.key, candidate.seed ?? seedOf(this.rootSeed, candidate.definition.id, candidate.key));
        for (const lease of leases)
            scene.cleanup.defer(() => lease.release());
        let mounting = true;
        const setup = this.createSceneSetup(scene, leases, () => mounting);
        try {
            const result = scene.definition.setup(setup);
            if (result && typeof result.then === "function") {
                Promise.resolve(result).catch((error) => this.report(error));
                throw new Error("Scene setup must be synchronous");
            }
            mounting = false;
            this.publishScene(scene);
            return scene;
        }
        catch (error) {
            mounting = false;
            try {
                scene.dispose();
            }
            catch (cleanupError) {
                throw new AggregateError([error, cleanupError], "Private scene mount and cleanup failed");
            }
            throw error;
        }
    }
    createSceneSetup(scene, leases, isMounting) {
        const setupOnly = () => {
            if (!isMounting())
                throw new Error("Scene bindings are fixed after setup");
        };
        return {
            world: scene.world.access,
            camera: scene.camera,
            assets: new Map(leases.map((lease) => [lease.id, lease.value])),
            resource: (name, value, cleanup) => {
                setupOnly();
                if (!name || scene.resources.has(name))
                    throw new Error("Invalid or duplicate resource: " + name);
                scene.resources.set(name, value);
                if (cleanup)
                    scene.cleanup.defer(() => cleanup(value));
                return value;
            },
            random: (name) => {
                setupOnly();
                if (!name || scene.randomStreams.has(name))
                    throw new Error("Invalid or duplicate RNG stream: " + name);
                const random = new Random(seedOf(scene.seed, name));
                scene.randomStreams.set(name, random);
                return random;
            },
            system: (update, options) => {
                setupOnly();
                scene.schedule.push({
                    update,
                    runsDuringFreeze: !!options?.runsDuringFreeze,
                });
            },
            render: (prepare) => {
                setupOnly();
                scene.prepare = prepare;
            },
            resetInterpolation: (action) => {
                setupOnly();
                scene.resets.push(action);
            },
            state: () => {
                setupOnly();
                return {
                    read: () => this.stateValue,
                    dispatch: (command) => {
                        if (isMounting() || !scene.published || this.updatingScene !== scene)
                            throw new Error("State dispatch requires an active system update");
                        this.stateCommands.push(immutable(command));
                    },
                };
            },
            freeze: (ticks) => {
                if (!Number.isSafeInteger(ticks) || ticks <= 0)
                    throw new Error("Freeze requires positive integer ticks");
                if (!isMounting() && (!scene.published || !this.busy))
                    throw new Error("Freeze requires active update");
                scene.freezePending = Math.max(scene.freezePending, ticks);
            },
            defer: (action) => {
                setupOnly();
                scene.cleanup.defer(action);
            },
        };
    }
    publishScene(scene) {
        scene.world.commit();
        scene.camera.cut();
        for (const reset of scene.resets)
            reset();
        scene.freezeRemaining = scene.freezePending;
        scene.freezePending = 0;
        Object.freeze(scene.schedule);
        scene.published = true;
    }
    async start(initial, loop) {
        if (this.lifecycle !== "Stopped")
            throw new Error("Cannot start in " + this.lifecycle);
        this.#lifecycle = "Starting";
        const cold = !this.initialized;
        let loopAttempted = false;
        try {
            if (cold) {
                if (!initial)
                    throw new Error("Initial prepared scene required");
                this.stack = [this.mount(initial)];
            }
            loopAttempted = true;
            loop?.start();
            for (const scene of this.stack)
                scene.canInterpolate = false;
            this.initialized = true;
            this.#lifecycle = "Running";
        }
        catch (error) {
            const errors = [error];
            if (loopAttempted) {
                try {
                    loop?.stop();
                }
                catch (error) {
                    errors.push(error);
                }
            }
            if (cold) {
                for (const scene of this.stack.splice(0).reverse()) {
                    try {
                        scene.dispose();
                    }
                    catch (error) {
                        errors.push(error);
                    }
                }
            }
            this.#lifecycle =
                !cold || errors.length > 1 || error instanceof AggregateError
                    ? "Failed"
                    : "Stopped";
            if (errors.length > 1)
                throw new AggregateError(errors, "Startup rollback failed");
            throw error;
        }
    }
    cancelPending() {
        const cleanup = new Cleanup();
        for (const ownerId of [...this.candidateSlots.keys()])
            cleanup.defer(() => this.releaseCandidateSlots(ownerId));
        for (const controller of this.preparations)
            cleanup.defer(() => controller.abort());
        for (const candidate of [...this.preparedScenes.values()])
            cleanup.defer(() => candidate.release());
        this.preparedScenes.clear();
        this.commands.length = 0;
        cleanup.dispose();
    }
    stop() {
        if (this.lifecycle !== "Running" && this.lifecycle !== "Stopped")
            throw new Error("Cannot stop in " + this.lifecycle);
        this.#lifecycle = "Stopping";
        try {
            this.cancelPending();
            this.#lifecycle = "Stopped";
        }
        catch (error) {
            this.#lifecycle = "Failed";
            throw error;
        }
    }
    /** Queue an already prepared candidate. It publishes only at a tick boundary. */
    set(candidate) {
        this.enqueue({ type: "set", candidate });
    }
    push(candidate) {
        this.enqueue({ type: "push", candidate });
    }
    pop() {
        this.enqueue({ type: "pop" });
    }
    enqueue(command) {
        if (this.lifecycle !== "Running")
            throw new Error("Scene commands require Running");
        this.commands.push(command);
    }
    tick(input = emptyInput(), display = { width: 640, height: 360, pixelRatio: 1 }) {
        if (this.lifecycle !== "Running")
            return;
        if (this.busy)
            throw new Error("Reentrant tick");
        this.busy = true;
        try {
            const updateStart = this.findUpdateStart();
            for (let index = 0; index < this.stack.length; index++)
                this.stack[index].canInterpolate = index >= updateStart;
            const selectedScenes = this.stack.slice(updateStart);
            const sceneCommands = {
                set: (candidate) => this.set(candidate),
                push: (candidate) => this.push(candidate),
                pop: () => this.pop(),
            };
            const ordinaryScenes = this.updateScenes(selectedScenes, input, display, sceneCommands);
            this.updatingScene = undefined;
            this.commitSceneSimulation(selectedScenes, ordinaryScenes);
            this.commitStateCommands();
            this.applySceneCommands();
            this.#simulationTick++;
        }
        catch (error) {
            this.#lifecycle = "Failed";
            this.report(error);
            throw error;
        }
        finally {
            this.busy = false;
            this.updatingScene = undefined;
        }
    }
    updateScenes(scenes, input, display, sceneCommands) {
        const ordinaryScenes = new Set();
        for (const scene of scenes) {
            if (!scene.freezeRemaining) {
                ordinaryScenes.add(scene);
                scene.camera.beginTick();
            }
            const context = Object.freeze({
                dt: this.dt,
                simulationTick: this.simulationTick,
                input,
                display,
                world: scene.world.access,
                camera: scene.camera,
                events: scene.inbox,
                emit: (event) => {
                    if (scene.freezeRemaining)
                        throw new Error("Gameplay events cannot emit during freeze");
                    scene.outbox.push(immutable(event));
                },
                scenes: sceneCommands,
            });
            this.updatingScene = scene;
            for (const system of scene.schedule) {
                if (scene.freezeRemaining && !system.runsDuringFreeze)
                    continue;
                const result = system.update(context);
                if (result && typeof result.then === "function") {
                    Promise.resolve(result).catch((error) => this.report(error));
                    throw new Error("Systems must be synchronous");
                }
            }
        }
        return ordinaryScenes;
    }
    commitSceneSimulation(selectedScenes, ordinaryScenes) {
        for (const scene of selectedScenes)
            scene.world.commit();
        for (const scene of ordinaryScenes) {
            scene.inbox = Object.freeze(scene.outbox);
            scene.outbox = [];
        }
        for (const scene of selectedScenes) {
            if (scene.freezePending && !scene.freezeRemaining) {
                scene.camera.cut();
                for (const reset of scene.resets)
                    reset();
            }
            scene.freezeRemaining = Math.max(0, scene.freezeRemaining - 1, scene.freezePending);
            scene.freezePending = 0;
        }
    }
    commitStateCommands() {
        for (const command of this.stateCommands) {
            const result = this.options.transition(this.stateValue, command);
            if (result instanceof Promise) {
                Promise.resolve(result).catch((error) => this.report(error));
                throw new Error("State transitions must be synchronous");
            }
            this.stateValue = immutable(result);
        }
        this.stateCommands.length = 0;
    }
    applySceneCommands() {
        const commands = this.commands.splice(0);
        for (let index = 0; index < commands.length; index++) {
            const command = commands[index];
            try {
                if (command.type === "pop") {
                    const oldScene = this.stack.pop();
                    if (oldScene)
                        this.disposeMountedScene(oldScene);
                    continue;
                }
                const newScene = this.mount(command.candidate);
                if (command.type === "push") {
                    this.stack.push(newScene);
                    continue;
                }
                const oldScenes = this.stack;
                this.stack = [newScene];
                for (const oldScene of oldScenes.reverse())
                    this.disposeMountedScene(oldScene);
            }
            catch (error) {
                this.report(error);
                for (const laterCommand of commands.slice(index + 1)) {
                    if (laterCommand.type === "pop")
                        continue;
                    try {
                        laterCommand.candidate.release();
                        this.preparedScenes.delete(laterCommand.candidate);
                    }
                    catch (releaseError) {
                        this.report(releaseError);
                    }
                }
                break;
            }
        }
    }
    disposeMountedScene(scene) {
        try {
            this.releaseCandidateSlots(scene.id);
        }
        catch (error) {
            this.report(error);
        }
        try {
            scene.dispose();
        }
        catch (error) {
            this.report(error);
        }
    }
    render(frame, alpha) {
        if (this.lifecycle !== "Running")
            return;
        const first = this.findUpdateStart();
        for (let i = 0; i < this.stack.length; i++) {
            const scene = this.stack[i];
            const sceneAlpha = i >= first && scene.canInterpolate ? alpha : 1;
            frame.scene(scene.camera, sceneAlpha);
            scene.prepare(frame, sceneAlpha);
        }
    }
    findUpdateStart() {
        for (let i = this.stack.length - 1; i >= 0; i--)
            if (this.stack[i].definition.blocksUpdateBelow)
                return i;
        return 0;
    }
    /** Detached frozen diagnostics. Inspect after tick() returns for a completed commit. */
    enumerate() {
        return Object.freeze({
            compatibility: "NGNE/2;mulberry32/1;" + (this.options.compatibility ?? "unversioned-game"),
            simulationTick: this.simulationTick,
            dt: this.dt,
            rootSeed: this.rootSeed,
            nextInstanceId: this.nextId,
            state: inspectValue(this.stateValue),
            scenes: Object.freeze(this.stack.map((scene) => scene.enumerate())),
        });
    }
    dispose() {
        if (this.lifecycle === "Disposed")
            return;
        this.#lifecycle = "Disposing";
        const cleanup = new Cleanup();
        cleanup.defer(() => this.assets.dispose());
        for (const scene of this.stack)
            cleanup.defer(() => scene.dispose());
        this.stack = [];
        cleanup.defer(() => this.cancelPending());
        this.stateCommands.length = 0;
        try {
            cleanup.dispose();
        }
        finally {
            this.stateValue = undefined;
            this.#lifecycle = "Disposed";
        }
    }
}
