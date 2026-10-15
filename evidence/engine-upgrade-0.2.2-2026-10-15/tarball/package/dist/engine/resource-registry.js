export function createResourceRegistry() {
    const byHandle = new Map();
    const values = new Set();
    let nextHandle = 0;
    return {
        register(resource) {
            if (values.has(resource))
                throw new Error("Resource is already registered");
            if (!Number.isSafeInteger(nextHandle))
                throw new Error("Resource handle budget exhausted");
            const handle = nextHandle++;
            byHandle.set(handle, resource);
            values.add(resource);
            return handle;
        },
        replace(handle, resource) {
            const previous = byHandle.get(handle);
            if (!previous)
                throw new Error("Resource is not registered: " + handle);
            if (previous === resource)
                return;
            if (values.has(resource))
                throw new Error("Resource is already registered");
            byHandle.set(handle, resource);
            values.delete(previous);
            values.add(resource);
        },
        release(handle) {
            const resource = byHandle.get(handle);
            if (!resource)
                return;
            byHandle.delete(handle);
            values.delete(resource);
        },
        get(handle) {
            const resource = byHandle.get(handle);
            if (!resource)
                throw new Error("Resource is not registered: " + handle);
            return resource;
        },
        clear() {
            byHandle.clear();
            values.clear();
        },
        get size() {
            return byHandle.size;
        },
    };
}
