const CHUNK_CAPACITY = 512;
const FIELD_VALUE = Symbol("field value");
const SCHEMA_COMPONENT = Symbol("schema component");
function field(kind, defaultValue) {
    return Object.freeze({ kind, default: defaultValue, [FIELD_VALUE]: defaultValue });
}
export const f32 = (defaultValue = 0) => field("f32", validateF32("f32", defaultValue));
export const f64 = (defaultValue = 0) => field("f64", validateNumber("f64", defaultValue));
export const i32 = (defaultValue = 0) => field("i32", validateInteger("i32", defaultValue, -0x80000000, 0x7fffffff));
export const u32 = (defaultValue = 0) => field("u32", validateInteger("u32", defaultValue, 0, 0xffffffff));
export const u8 = (defaultValue = 0) => field("u8", validateInteger("u8", defaultValue, 0, 0xff));
export const bool = (defaultValue = false) => {
    if (typeof defaultValue !== "boolean")
        throw new Error("Invalid bool default");
    return field("bool", defaultValue);
};
export function entityRef(...defaultValues) {
    if (defaultValues.length > 0)
        throw new Error("Entity reference defaults are always null");
    return field("entity", null);
}
export class SchemaComponent {
    name;
    [SCHEMA_COMPONENT] = true;
    fields;
    constructor(name, fields) {
        this.name = name;
        if (!name)
            throw new Error("Component name required");
        if (typeof fields !== "object" || fields === null)
            throw new Error(`Component fields must be a schema object: ${name}`);
        const cloned = Object.create(null);
        for (const [fieldName, descriptor] of Object.entries(fields)) {
            if (!fieldName)
                throw new Error("Component field name required");
            if (!isFieldDescriptor(descriptor))
                throw new Error(`Invalid field descriptor: ${name}.${fieldName}`);
            const defaultValue = validateDescriptorDefault(`${name}.${fieldName}`, descriptor);
            cloned[fieldName] = Object.freeze({
                kind: descriptor.kind,
                default: defaultValue,
                [FIELD_VALUE]: defaultValue,
            });
        }
        this.fields = Object.freeze(cloned);
        Object.freeze(this);
    }
    of(value = {}) {
        for (const fieldName of Object.keys(value))
            if (!(fieldName in this.fields))
                throw new Error(`Unknown component field: ${this.name}.${fieldName}`);
        return { component: this, value };
    }
}
export function component(name, fields) {
    return new SchemaComponent(name, fields);
}
// Definitions and their fields are immutable. Keep iteration metadata private and
// weakly owned so repeated spawns do not enumerate the same schema or retain it.
const schemaFieldEntries = new WeakMap();
function fieldsOf(type) {
    let fields = schemaFieldEntries.get(type);
    if (!fields) {
        fields = Object.entries(type.fields);
        schemaFieldEntries.set(type, fields);
    }
    return fields;
}
class AllQueryRuntime {
    #world;
    constructor(world) {
        this.#world = world;
        Object.freeze(this);
    }
    get size() {
        return this.#world.size;
    }
    each(visit) {
        this.#world.beginRead();
        try {
            for (const archetype of this.#world.archetypeList)
                for (const chunk of archetype.chunks)
                    for (let row = 0; row < chunk.count; row++)
                        visit(chunk.entities[row]);
        }
        finally {
            this.#world.endRead();
        }
    }
}
class SchemaQueryRuntime {
    #version = -1;
    #matches = [];
    #borrowEpoch = -1;
    #descriptors = [];
    #world;
    #types;
    constructor(world, types) {
        this.#world = world;
        this.#types = types;
        Object.freeze(this);
    }
    get size() {
        this.refresh();
        return this.#matches.reduce((size, archetype) => size + archetype.chunks.reduce((rows, chunk) => rows + chunk.count, 0), 0);
    }
    eachChunk(visit) {
        this.refresh();
        this.refreshDescriptors();
        this.#world.beginRead();
        try {
            for (const descriptor of this.#descriptors)
                if (descriptor.count > 0)
                    visit(descriptor);
        }
        finally {
            this.#world.endRead();
        }
    }
    refresh() {
        if (this.#version === this.#world.structureVersion)
            return;
        this.#matches = this.#world.archetypeList.filter((archetype) => this.#types.every((type) => archetype.types.includes(type)));
        this.#version = this.#world.structureVersion;
        this.#borrowEpoch = -1;
    }
    refreshDescriptors() {
        if (this.#borrowEpoch === this.#world.commitEpoch)
            return;
        const epoch = this.#world.commitEpoch;
        this.#descriptors = this.#matches.flatMap((archetype) => archetype.chunks.map((chunk) => createChunkDescriptor(this.#world, epoch, archetype, chunk, this.#types)));
        this.#borrowEpoch = epoch;
    }
}
Object.freeze(AllQueryRuntime.prototype);
Object.freeze(SchemaQueryRuntime.prototype);
class WorldAccessRuntime {
    #world;
    constructor(world) {
        this.#world = world;
        defineOpaque(this, {
            spawn: this.spawn.bind(this),
            despawn: this.despawn.bind(this),
            has: this.has.bind(this),
            read: this.read.bind(this),
            write: this.write.bind(this),
            query: this.query.bind(this),
        });
    }
    spawn(...values) {
        return this.#world.spawnValues(values);
    }
    despawn(entity) {
        this.#world.despawn(entity);
    }
    has(entity) {
        return this.#world.has(entity);
    }
    read(entity, type, field) {
        return this.#world.read(entity, type, field);
    }
    write(entity, type, field, value) {
        this.#world.write(entity, type, field, value);
    }
    query(...types) {
        return this.#world.queryTypes(types);
    }
}
Object.freeze(WorldAccessRuntime.prototype);
export class World {
    owner = Symbol("world");
    slots = [];
    free = [];
    archetypes = [];
    births = [];
    deaths = new Set();
    definitions = new Map();
    reading = 0;
    disposed = false;
    structuralVersion = 0;
    epoch = 0;
    access;
    constructor() {
        this.access = new WorldAccessRuntime(this);
    }
    get archetypeList() {
        return this.archetypes;
    }
    get structureVersion() {
        return this.structuralVersion;
    }
    get commitEpoch() {
        return this.epoch;
    }
    get size() {
        return this.archetypes.reduce((size, archetype) => size + archetype.chunks.reduce((rows, chunk) => rows + chunk.count, 0), 0);
    }
    get capacity() {
        return this.slots.length;
    }
    beginRead() {
        this.reading++;
    }
    endRead() {
        this.reading--;
    }
    spawn(...values) {
        return this.spawnValues(values);
    }
    spawnValues(values) {
        if (this.disposed)
            throw new Error("World is disposed");
        for (const { component: type } of values)
            if (!isSchemaComponent(type))
                throw new Error("Schema component required");
        if (new Set(values.map((value) => value.component)).size !== values.length)
            throw new Error("Duplicate component");
        const lowered = values.map(({ component: type, value }) => ({
            component: type,
            value: this.lowerSchemaValue(type, value),
        }));
        for (const { component: type } of values)
            this.registerDefinition(type);
        const index = this.free.pop() ?? this.slots.length;
        const slot = this.slots[index] ?? { generation: 0, chunk: -1, row: -1, pending: true };
        slot.pending = true;
        this.slots[index] = slot;
        const entity = Object.freeze({ index, generation: slot.generation, owner: this.owner });
        slot.handle = entity;
        this.births.push({ entity, values: lowered });
        return entity;
    }
    registerDefinition(type) {
        const existing = this.definitions.get(type.name);
        if (existing && existing !== type)
            throw new Error(`Conflicting component identity: ${type.name}`);
        this.definitions.set(type.name, type);
    }
    lowerSchemaValue(type, partial) {
        const value = Object.create(null);
        for (const fieldName of Object.keys(partial))
            if (!(fieldName in type.fields))
                throw new Error(`Unknown component field: ${type.name}.${fieldName}`);
        for (const [fieldName, descriptor] of fieldsOf(type)) {
            const candidate = Object.prototype.hasOwnProperty.call(partial, fieldName)
                ? Reflect.get(partial, fieldName)
                : undefined;
            const authored = candidate === undefined ? descriptor.default : candidate;
            value[fieldName] = this.validateField(type, fieldName, descriptor, authored);
        }
        return value;
    }
    validateField(type, fieldName, descriptor, value) {
        const label = `${type.name}.${fieldName}`;
        switch (descriptor.kind) {
            case "f32":
                return validateF32(label, value);
            case "f64":
                return validateNumber(label, value);
            case "i32":
                return validateInteger(label, value, -0x80000000, 0x7fffffff);
            case "u32":
                return validateInteger(label, value, 0, 0xffffffff);
            case "u8":
                return validateInteger(label, value, 0, 0xff);
            case "bool":
                if (typeof value !== "boolean")
                    throw new Error(`Invalid boolean: ${label}`);
                return value;
            case "entity":
                if (value === null)
                    return null;
                if (!isEntity(value))
                    throw new Error(`Invalid entity reference: ${label}`);
                if (value.owner !== this.owner)
                    throw new Error(`Foreign entity reference: ${label}`);
                const slot = this.slots[value.index];
                if (!slot ||
                    value.generation > slot.generation ||
                    (value.generation === slot.generation && !slot.archetype && !slot.pending))
                    throw new Error(`Unknown entity reference: ${label}`);
                if (value.index + 1 > 0xffffffff || value.generation > 0xffffffff)
                    throw new Error(`Entity reference exceeds uint32 storage: ${label}`);
                return value;
        }
    }
    slot(entity) {
        const slot = this.slots[entity.index];
        return entity.owner === this.owner && slot?.generation === entity.generation
            ? slot
            : undefined;
    }
    has(entity) {
        return !!this.slot(entity)?.archetype;
    }
    read(entity, type, fieldName) {
        const descriptor = this.requireField(type, fieldName);
        const slot = this.slot(entity);
        if (!slot?.archetype)
            return undefined;
        const typeIndex = slot.archetype.types.indexOf(type);
        if (typeIndex < 0)
            return undefined;
        const column = slot.archetype.chunks[slot.chunk].columns[typeIndex][String(fieldName)];
        return this.readColumn(column, descriptor, slot.row);
    }
    write(entity, type, fieldName, value) {
        const descriptor = this.requireField(type, fieldName);
        const validated = this.validateField(type, String(fieldName), descriptor, value);
        const slot = this.slot(entity);
        if (!slot?.archetype)
            return;
        const typeIndex = slot.archetype.types.indexOf(type);
        if (typeIndex < 0)
            return;
        writeColumn(slot.archetype.chunks[slot.chunk].columns[typeIndex][String(fieldName)], descriptor.kind, slot.row, validated);
    }
    requireField(type, fieldName) {
        if (!isSchemaComponent(type))
            throw new Error("Schema component required");
        const descriptor = type.fields[String(fieldName)];
        if (!descriptor)
            throw new Error(`Unknown component field: ${type.name}.${String(fieldName)}`);
        return descriptor;
    }
    readColumn(column, descriptor, row) {
        if (descriptor.kind === "entity") {
            const reference = column, encodedIndex = reference.index[row];
            if (encodedIndex === 0)
                return null;
            const index = encodedIndex - 1, generation = reference.generation[row], slot = this.slots[index];
            if (slot?.handle?.generation === generation)
                return slot.handle;
            return Object.freeze({ index, generation, owner: this.owner });
        }
        const encoded = column[row];
        return descriptor.kind === "bool" ? encoded !== 0 : encoded;
    }
    despawn(entity) {
        const slot = this.slot(entity);
        if (slot && (slot.archetype || slot.pending))
            this.deaths.add(entity);
    }
    query(...types) {
        return this.queryTypes(types);
    }
    queryTypes(types) {
        if (this.disposed)
            throw new Error("World is disposed");
        if (types.length === 0)
            return new AllQueryRuntime(this);
        if (!types.every(isSchemaComponent))
            throw new Error("Schema component required");
        if (new Set(types).size !== types.length)
            throw new Error("Duplicate component");
        for (const type of types)
            this.registerDefinition(type);
        return new SchemaQueryRuntime(this, types);
    }
    commit() {
        if (this.reading)
            throw new Error("Cannot commit during query iteration");
        if (this.disposed)
            throw new Error("World is disposed");
        this.epoch++;
        for (const birth of this.births)
            this.commitBirth(birth);
        this.births.length = 0;
        for (const entity of this.deaths)
            this.commitDeath(entity);
        this.deaths.clear();
    }
    commitBirth(birth) {
        let archetype = this.archetypes.find((candidate) => candidate.types.length === birth.values.length &&
            birth.values.every((value) => candidate.types.includes(value.component)));
        if (!archetype) {
            archetype = {
                types: birth.values.map((value) => value.component),
                chunks: [],
            };
            this.archetypes.push(archetype);
            this.structuralVersion++;
        }
        let chunkIndex = archetype.chunks.findIndex((chunk) => chunk.count < CHUNK_CAPACITY);
        if (chunkIndex < 0) {
            archetype.chunks.push(createSchemaChunk(archetype.types));
            chunkIndex = archetype.chunks.length - 1;
            this.structuralVersion++;
        }
        const chunk = archetype.chunks[chunkIndex], row = chunk.count++;
        chunk.entities[row] = birth.entity;
        for (let typeIndex = 0; typeIndex < archetype.types.length; typeIndex++) {
            const type = archetype.types[typeIndex], value = birth.values.find((entry) => entry.component === type).value;
            for (const [fieldName, descriptor] of fieldsOf(type))
                writeColumn(chunk.columns[typeIndex][fieldName], descriptor.kind, row, Reflect.get(value, fieldName));
        }
        const slot = this.slot(birth.entity);
        slot.archetype = archetype;
        slot.chunk = chunkIndex;
        slot.row = row;
        slot.pending = false;
    }
    commitDeath(entity) {
        const slot = this.slot(entity);
        if (!slot?.archetype)
            return;
        const chunk = slot.archetype.chunks[slot.chunk], last = chunk.count - 1;
        if (slot.row !== last) {
            const moved = chunk.entities[last];
            chunk.entities[slot.row] = moved;
            this.slots[moved.index].row = slot.row;
            for (const column of chunk.columnList)
                copyColumnRow(column, last, slot.row);
        }
        chunk.entities[last] = undefined;
        for (const column of chunk.columnList)
            clearColumnRow(column, last);
        chunk.count--;
        slot.archetype = undefined;
        slot.chunk = -1;
        slot.row = -1;
        slot.pending = false;
        slot.generation++;
        this.free.push(entity.index);
    }
    enumerate() {
        return {
            archetypes: this.archetypes.map((archetype) => ({
                components: archetype.types.map((type) => type.name),
                entities: archetype.chunks.flatMap((chunk) => chunk.entities.slice(0, chunk.count).map((entity) => entity.index)),
                fields: archetype.types.map((type) => ({
                    component: type.name,
                    fields: Object.entries(type.fields).map(([name, descriptor]) => ({
                        name,
                        kind: descriptor.kind,
                        default: inspectFieldValue(descriptor.default),
                    })),
                })),
                chunks: archetype.chunks.map((chunk) => ({
                    capacity: CHUNK_CAPACITY,
                    count: chunk.count,
                    entities: chunk.entities.slice(0, chunk.count).map((entity) => entity.index),
                })),
            })),
            slots: this.slots.map((slot) => ({
                generation: slot.generation,
                row: slot.row,
                pending: slot.pending,
                ...(slot.archetype ? { chunk: slot.chunk } : {}),
            })),
            free: [...this.free],
            entities: enumerateEntities(this.archetypes),
        };
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.epoch++;
        this.structuralVersion++;
        this.births.length = 0;
        this.deaths.clear();
        for (const archetype of this.archetypes)
            for (const chunk of archetype.chunks) {
                chunk.count = 0;
                chunk.entities.fill(undefined);
                for (const columns of chunk.columns)
                    for (const column of Object.values(columns))
                        clearColumn(column);
            }
        this.archetypes.length = 0;
        this.slots.length = 0;
        this.free.length = 0;
    }
}
function createSchemaChunk(types) {
    const columns = types.map((type) => Object.fromEntries(Object.entries(type.fields).map(([name, descriptor]) => [
        name,
        createColumn(descriptor.kind),
    ])));
    return {
        count: 0,
        entities: new Array(CHUNK_CAPACITY),
        columns,
        // Columns are never replaced; retain their existing component/field order.
        columnList: columns.flatMap((componentColumns) => Object.values(componentColumns)),
    };
}
function createColumn(kind) {
    switch (kind) {
        case "f32":
            return new Float32Array(CHUNK_CAPACITY);
        case "f64":
            return new Float64Array(CHUNK_CAPACITY);
        case "i32":
            return new Int32Array(CHUNK_CAPACITY);
        case "u32":
            return new Uint32Array(CHUNK_CAPACITY);
        case "u8":
        case "bool":
            return new Uint8Array(CHUNK_CAPACITY);
        case "entity":
            return {
                index: new Uint32Array(CHUNK_CAPACITY),
                generation: new Uint32Array(CHUNK_CAPACITY),
            };
    }
}
function writeColumn(column, kind, row, value) {
    if (kind === "entity") {
        const reference = column;
        if (value === null) {
            reference.index[row] = 0;
            reference.generation[row] = 0;
        }
        else {
            const entity = value;
            reference.index[row] = entity.index + 1;
            reference.generation[row] = entity.generation;
        }
    }
    else
        column[row] = kind === "bool" ? (value ? 1 : 0) : value;
}
function copyColumnRow(column, source, target) {
    if ("index" in column) {
        column.index[target] = column.index[source];
        column.generation[target] = column.generation[source];
    }
    else
        column[target] = column[source];
}
function clearColumnRow(column, row) {
    if ("index" in column) {
        column.index[row] = 0;
        column.generation[row] = 0;
    }
    else
        column[row] = 0;
}
function clearColumn(column) {
    if ("index" in column) {
        column.index.fill(0);
        column.generation.fill(0);
    }
    else
        column.fill(0);
}
function createChunkDescriptor(world, epoch, archetype, chunk, types) {
    const assertValid = () => {
        if (world.commitEpoch !== epoch)
            throw new Error("Schema chunk borrow has expired");
    };
    const componentViews = new Map();
    for (const type of types) {
        const typeIndex = archetype.types.indexOf(type), view = {};
        for (const [fieldName, descriptor] of fieldsOf(type)) {
            const column = chunk.columns[typeIndex][fieldName];
            const exposed = descriptor.kind === "entity"
                ? defineOpaque({}, {
                    index: column.index,
                    generation: column.generation,
                })
                : column;
            Object.defineProperty(view, fieldName, { value: exposed });
        }
        componentViews.set(type, Object.freeze(view));
    }
    const views = {};
    for (const type of types)
        Object.defineProperty(views, type.name, {
            get() {
                assertValid();
                return componentViews.get(type);
            },
        });
    Object.freeze(views);
    const descriptor = {};
    Object.defineProperties(descriptor, {
        count: {
            get() {
                assertValid();
                return chunk.count;
            },
        },
        capacity: {
            get() {
                assertValid();
                return CHUNK_CAPACITY;
            },
        },
        views: {
            get() {
                assertValid();
                return views;
            },
        },
        entityAt: {
            value(row) {
                assertValid();
                if (!Number.isInteger(row) || row < 0 || row >= chunk.count)
                    throw new Error("Schema chunk row is outside the live range");
                return chunk.entities[row];
            },
        },
    });
    return Object.freeze(descriptor);
}
function defineOpaque(target, values) {
    for (const [name, value] of Object.entries(values))
        Object.defineProperty(target, name, { value });
    return Object.freeze(target);
}
function inspectColumnValue(column, descriptor, row) {
    if (descriptor.kind === "entity") {
        const reference = column;
        return reference.index[row] === 0
            ? null
            : { index: reference.index[row] - 1, generation: reference.generation[row] };
    }
    const value = column[row];
    return descriptor.kind === "bool" ? value !== 0 : value;
}
function inspectFieldValue(value) {
    return isEntity(value) ? { index: value.index, generation: value.generation } : value;
}
function enumerateEntities(archetypes) {
    const entities = [];
    for (const archetype of archetypes) {
        for (const chunk of archetype.chunks) {
            for (let row = 0; row < chunk.count; row++) {
                const entity = chunk.entities[row];
                entities.push({
                    index: entity.index,
                    generation: entity.generation,
                    components: archetype.types.map((type, typeIndex) => ({
                        name: type.name,
                        fields: Object.entries(type.fields).map(([fieldName, descriptor]) => ({
                            name: fieldName,
                            kind: descriptor.kind,
                            value: inspectColumnValue(chunk.columns[typeIndex][fieldName], descriptor, row),
                        })),
                    })),
                });
            }
        }
    }
    return entities;
}
function isSchemaComponent(value) {
    return typeof value === "object" && value !== null && SCHEMA_COMPONENT in value;
}
function isFieldDescriptor(value) {
    return (typeof value === "object" &&
        value !== null &&
        "kind" in value &&
        typeof value.kind === "string" &&
        ["f32", "f64", "i32", "u32", "u8", "bool", "entity"].includes(value.kind));
}
function isEntity(value) {
    return (typeof value === "object" &&
        value !== null &&
        "index" in value &&
        typeof value.index === "number" &&
        Number.isInteger(value.index) &&
        value.index >= 0 &&
        "generation" in value &&
        typeof value.generation === "number" &&
        Number.isInteger(value.generation) &&
        value.generation >= 0 &&
        "owner" in value &&
        typeof value.owner === "symbol");
}
function validateNumber(label, value) {
    if (typeof value !== "number" || !Number.isFinite(value))
        throw new Error(`Invalid finite number: ${label}`);
    return value;
}
function validateF32(label, value) {
    const rounded = Math.fround(validateNumber(label, value));
    if (!Number.isFinite(rounded))
        throw new Error(`Invalid finite float32: ${label}`);
    return rounded;
}
function validateInteger(label, value, min, max) {
    if (!Number.isInteger(value) || value < min || value > max)
        throw new Error(`Invalid integer: ${label}`);
    return value;
}
function validateDescriptorDefault(label, descriptor) {
    switch (descriptor.kind) {
        case "f32":
            return validateF32(label, descriptor.default);
        case "f64":
            return validateNumber(label, descriptor.default);
        case "i32":
            return validateInteger(label, descriptor.default, -0x80000000, 0x7fffffff);
        case "u32":
            return validateInteger(label, descriptor.default, 0, 0xffffffff);
        case "u8":
            return validateInteger(label, descriptor.default, 0, 0xff);
        case "bool":
            if (typeof descriptor.default !== "boolean")
                throw new Error(`Invalid boolean: ${label}`);
            return descriptor.default;
        case "entity":
            if (descriptor.default !== null)
                throw new Error(`Entity reference defaults are always null: ${label}`);
            return null;
    }
}
