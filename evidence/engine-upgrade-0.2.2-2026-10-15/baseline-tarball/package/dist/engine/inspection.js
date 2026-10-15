/** Copy enumerable data without exposing object identity, methods or entity ownership. */
export function inspectValue(value, seen = new Map()) {
    if (typeof value === "symbol")
        return value.description;
    if (typeof value === "function")
        return "[Function]";
    if (value === null ||
        value === undefined ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        typeof value === "bigint")
        return value;
    const previous = seen.get(value);
    if (previous !== undefined)
        return previous;
    if (value instanceof Map || value instanceof Set || Array.isArray(value)) {
        const copy = [];
        seen.set(value, copy);
        for (const item of value)
            copy.push(inspectValue(item, seen));
        return Object.freeze(copy);
    }
    const copy = {};
    seen.set(value, copy);
    for (const [key, child] of Object.entries(value))
        Object.defineProperty(copy, key, {
            value: inspectValue(child, seen),
            enumerable: true,
        });
    return Object.freeze(copy);
}
