export function imageAsset(id, url) {
    return {
        id,
        kind: "image",
        estimateBytes: (bitmap) => bitmap.width * bitmap.height * 4,
        async load(signal) {
            const response = await fetch(url, { signal });
            if (!response.ok)
                throw new Error(`Image load failed: ${response.status}`);
            return createImageBitmap(await response.blob(), {
                premultiplyAlpha: "none",
                colorSpaceConversion: "none",
            });
        },
        dispose: (bitmap) => bitmap.close(),
    };
}
function claims() {
    return { external: 0, scene: 0, dependency: 0, renderer: 0 };
}
/** Shared decoded data; GPU uploads belong to the renderer. */
export class Assets {
    entries = new Map();
    disposed = false;
    order = 0;
    cleanupFailures = 0;
    trimming = false;
    maxEntries;
    maxBytes;
    diagnostic;
    constructor(options = {}) {
        const limit = (value) => {
            if (value === undefined)
                return Infinity;
            if (!Number.isSafeInteger(value) || value < 0)
                throw new Error("Invalid asset budget");
            return value;
        };
        this.maxEntries = limit(options.retention?.maxEntries);
        this.maxBytes = limit(options.retention?.maxBytes);
        this.diagnostic = options.diagnostic;
    }
    async acquire(definition, signal, claim = "external") {
        if (this.disposed || signal?.aborted)
            throw new Error("Asset acquisition cancelled");
        if (!Object.hasOwn(claims(), claim))
            throw new Error("Invalid asset claim");
        let entry = this.entries.get(definition.id);
        if (entry && entry.definition !== definition)
            throw new Error(`Conflicting asset identity: ${definition.id}`);
        if (!entry) {
            const controller = new AbortController();
            entry = {
                definition,
                controller,
                refs: 0,
                loaded: false,
                order: 0,
                claims: claims(),
                promise: Promise.resolve().then(() => definition.load(controller.signal)),
            };
            const owned = entry;
            entry.promise = entry.promise
                .then((value) => {
                if (controller.signal.aborted || this.disposed) {
                    try {
                        definition.dispose?.(value);
                    }
                    catch (error) {
                        this.cleanupFailures++;
                        this.report(error);
                    }
                    throw new Error("Asset load cancelled");
                }
                owned.value = value;
                owned.loaded = true;
                const bytes = definition.estimateBytes?.(value);
                if (bytes !== undefined && (!Number.isSafeInteger(bytes) || bytes < 0))
                    throw new Error("Invalid asset byte estimate: " + definition.id);
                owned.bytes = bytes;
                this.autoTrim();
                return value;
            })
                .catch((error) => {
                if (this.entries.get(definition.id) === owned)
                    this.entries.delete(definition.id);
                if (owned.loaded) {
                    owned.loaded = false;
                    try {
                        definition.dispose?.(owned.value);
                    }
                    catch (cleanup) {
                        this.cleanupFailures++;
                        throw new AggregateError([error, cleanup], "Asset load cleanup failed");
                    }
                    finally {
                        owned.value = undefined;
                    }
                }
                throw error;
            });
            this.entries.set(definition.id, entry);
        }
        entry.refs++;
        entry.claims[claim]++;
        entry.order = ++this.order;
        const owned = entry;
        let released = false;
        const release = () => {
            if (released)
                return;
            released = true;
            owned.refs--;
            owned.claims[claim]--;
            if (!owned.refs && !owned.loaded) {
                owned.controller.abort();
                if (this.entries.get(definition.id) === owned)
                    this.entries.delete(definition.id);
            }
            this.autoTrim();
        };
        let abort;
        const cancelled = new Promise((_, reject) => {
            abort = () => {
                release();
                reject(new Error("Asset acquisition cancelled"));
            };
            signal?.addEventListener("abort", abort, { once: true });
        });
        try {
            const value = await Promise.race([entry.promise, cancelled]);
            if (signal?.aborted || this.disposed || owned.controller.signal.aborted)
                throw new Error("Asset acquisition cancelled");
            return { id: definition.id, value, release };
        }
        catch (e) {
            release();
            throw e;
        }
        finally {
            signal?.removeEventListener("abort", abort);
        }
    }
    autoTrim() {
        try {
            this.trim();
        }
        catch (error) {
            this.report(error);
        }
    }
    report(error) {
        try {
            this.diagnostic?.(error);
        }
        catch {
            /* Observation cannot interrupt release. */
        }
    }
    remove(entry) {
        if (this.entries.get(entry.definition.id) === entry)
            this.entries.delete(entry.definition.id);
        entry.controller.abort();
        if (!entry.loaded)
            return;
        entry.loaded = false;
        const value = entry.value;
        entry.value = undefined;
        try {
            entry.definition.dispose?.(value);
        }
        catch (error) {
            this.cleanupFailures++;
            throw error;
        }
    }
    trim() {
        if (this.trimming || (this.maxEntries === Infinity && this.maxBytes === Infinity))
            return;
        this.trimming = true;
        const errors = [];
        try {
            for (;;) {
                let count = 0, bytes = 0;
                const eligible = [];
                for (const entry of this.entries.values())
                    if (entry.loaded) {
                        count++;
                        bytes += entry.bytes ?? 0;
                        if (!entry.refs)
                            eligible.push(entry);
                    }
                eligible.sort((a, b) => a.order - b.order);
                const selected = [];
                for (const entry of eligible) {
                    if (count <= this.maxEntries && bytes <= this.maxBytes)
                        break;
                    // A disposer may release other leases or reenter this service.
                    if (this.entries.get(entry.definition.id) !== entry || entry.refs)
                        continue;
                    count--;
                    bytes -= entry.bytes ?? 0;
                    selected.push(entry);
                }
                if (!selected.length)
                    break;
                // End registry membership for the complete eviction batch before invoking user cleanup.
                for (const entry of selected)
                    this.entries.delete(entry.definition.id);
                for (const entry of selected)
                    try {
                        this.remove(entry);
                    }
                    catch (error) {
                        errors.push(error);
                    }
                // Cleanup may release another dependency; account for those newly eligible entries too.
            }
        }
        finally {
            this.trimming = false;
        }
        if (errors.length)
            throw new AggregateError(errors, "Asset trim failed");
    }
    evict(id) {
        const entry = this.entries.get(id);
        if (!entry?.loaded || entry.refs)
            return false;
        try {
            this.remove(entry);
        }
        catch (error) {
            throw new AggregateError([error], "Asset eviction failed");
        }
        return true;
    }
    inspect(limit = 100) {
        if (!Number.isSafeInteger(limit) || limit < 0 || limit > 1000)
            throw new Error("Invalid asset inspection limit");
        let loaded = 0, loading = 0, leased = 0, unleased = 0, estimatedBytes = 0;
        let imageBytes = 0, audioBytes = 0, unknownSizes = 0, protectedCount = 0, protectedBytes = 0;
        const totals = claims(), entries = [];
        for (const [id, entry] of this.entries) {
            if (entry.refs)
                leased++;
            else
                unleased++;
            for (const key of Object.keys(totals))
                totals[key] += entry.claims[key];
            if (entry.loaded) {
                loaded++;
                estimatedBytes += entry.bytes ?? 0;
                if (entry.bytes === undefined)
                    unknownSizes++;
                if (entry.definition.kind === "image")
                    imageBytes += entry.bytes ?? 0;
                if (entry.definition.kind === "audio")
                    audioBytes += entry.bytes ?? 0;
                if (entry.refs) {
                    protectedCount++;
                    protectedBytes += entry.bytes ?? 0;
                }
            }
            else
                loading++;
            if (entries.length < limit)
                entries.push(Object.freeze({
                    id,
                    loaded: entry.loaded,
                    estimatedBytes: entry.bytes,
                    claims: Object.freeze({ ...entry.claims }),
                }));
        }
        return Object.freeze({
            loaded,
            loading,
            leased,
            unleased,
            claims: Object.freeze(totals),
            estimatedBytes,
            imageBytes,
            audioBytes,
            unknownSizes,
            overBudget: loaded > this.maxEntries || estimatedBytes > this.maxBytes,
            protectedOverBudget: protectedCount > this.maxEntries || protectedBytes > this.maxBytes,
            cleanupFailures: this.cleanupFailures,
            entries: Object.freeze(entries),
            truncated: this.entries.size > entries.length,
        });
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        const errors = [];
        const entries = [...this.entries.values()];
        this.entries.clear();
        for (const e of entries) {
            try {
                this.remove(e);
            }
            catch (error) {
                errors.push(error);
            }
        }
        if (errors.length)
            throw new AggregateError(errors, "Asset disposal failed");
    }
}
