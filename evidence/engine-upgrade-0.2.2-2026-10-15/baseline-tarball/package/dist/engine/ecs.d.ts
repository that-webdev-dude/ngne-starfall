declare const FIELD_VALUE: unique symbol;
declare const SCHEMA_COMPONENT: unique symbol;
export type FieldKind = "f32" | "f64" | "i32" | "u32" | "u8" | "bool" | "entity";
export interface FieldDescriptor<Value, Kind extends FieldKind = FieldKind> {
    readonly kind: Kind;
    readonly default: Value;
    readonly [FIELD_VALUE]: Value;
}
export type SchemaFields = Readonly<Record<string, FieldDescriptor<unknown>>>;
type FieldValue<Field> = Field extends FieldDescriptor<infer Value> ? Value : never;
export type SchemaValues<Fields extends SchemaFields> = {
    [Name in keyof Fields]: FieldValue<Fields[Name]>;
};
export declare const f32: (defaultValue?: number) => FieldDescriptor<number, "f32">;
export declare const f64: (defaultValue?: number) => FieldDescriptor<number, "f64">;
export declare const i32: (defaultValue?: number) => FieldDescriptor<number, "i32">;
export declare const u32: (defaultValue?: number) => FieldDescriptor<number, "u32">;
export declare const u8: (defaultValue?: number) => FieldDescriptor<number, "u8">;
export declare const bool: (defaultValue?: boolean) => FieldDescriptor<boolean, "bool">;
export declare function entityRef(): FieldDescriptor<Entity | null, "entity">;
export declare class SchemaComponent<Name extends string, Fields extends SchemaFields> {
    readonly name: Name;
    readonly [SCHEMA_COMPONENT] = true;
    readonly fields: Fields;
    constructor(name: Name, fields: Fields);
    of(value?: Partial<SchemaValues<Fields>>): SchemaComponentValue<Name, Fields>;
}
export interface SchemaComponentValue<Name extends string, Fields extends SchemaFields> {
    readonly component: SchemaComponent<Name, Fields>;
    readonly value: Partial<SchemaValues<Fields>>;
}
export declare function component<const Name extends string, const Fields extends SchemaFields>(name: Name, fields: Fields): SchemaComponent<Name, Fields>;
export type Entity = Readonly<{
    index: number;
    generation: number;
    owner: symbol;
}>;
type AnySchemaComponent = SchemaComponent<string, SchemaFields>;
type AnySchemaValue = SchemaComponentValue<string, SchemaFields>;
type FieldColumn<Field> = Field extends FieldDescriptor<unknown, "f32"> ? Float32Array : Field extends FieldDescriptor<unknown, "f64"> ? Float64Array : Field extends FieldDescriptor<unknown, "i32"> ? Int32Array : Field extends FieldDescriptor<unknown, "u32"> ? Uint32Array : Field extends FieldDescriptor<unknown, "u8" | "bool"> ? Uint8Array : Field extends FieldDescriptor<unknown, "entity"> ? EntityReferenceView : never;
export type SchemaComponentView<Fields extends SchemaFields> = {
    [Name in keyof Fields]: FieldColumn<Fields[Name]>;
};
export type SchemaQueryViews<Types extends readonly AnySchemaComponent[]> = {
    [Type in Types[number] as Type["name"]]: Type extends SchemaComponent<string, infer Fields> ? SchemaComponentView<Fields> : never;
};
export interface EntityReferenceView {
    readonly index: Uint32Array;
    readonly generation: Uint32Array;
}
export interface SchemaChunk<Types extends readonly AnySchemaComponent[]> {
    readonly count: number;
    readonly capacity: number;
    readonly views: SchemaQueryViews<Types>;
    entityAt(row: number): Entity;
}
export interface AllQuery {
    readonly size: number;
    each(visit: (entity: Entity) => void): void;
}
export interface SchemaQuery<Types extends readonly AnySchemaComponent[]> {
    readonly size: number;
    eachChunk(visit: (chunk: SchemaChunk<Types>) => void): void;
}
export interface WorldAccess {
    spawn(...values: AnySchemaValue[]): Entity;
    despawn(entity: Entity): void;
    has(entity: Entity): boolean;
    read<Name extends string, Fields extends SchemaFields, Field extends keyof Fields>(entity: Entity, type: SchemaComponent<Name, Fields>, field: Field): FieldValue<Fields[Field]> | undefined;
    write<Name extends string, Fields extends SchemaFields, Field extends keyof Fields>(entity: Entity, type: SchemaComponent<Name, Fields>, field: Field, value: FieldValue<Fields[Field]>): void;
    query(): AllQuery;
    query<Types extends readonly AnySchemaComponent[]>(...types: Types): SchemaQuery<Types>;
}
type NumericColumn = Float32Array | Float64Array | Int32Array | Uint32Array | Uint8Array;
interface EntityReferenceColumn {
    readonly index: Uint32Array;
    readonly generation: Uint32Array;
}
type Column = NumericColumn | EntityReferenceColumn;
type ComponentColumns = Record<string, Column>;
interface SchemaChunkRuntime {
    count: number;
    readonly entities: (Entity | undefined)[];
    readonly columns: ComponentColumns[];
    readonly columnList: readonly Column[];
}
interface Archetype {
    readonly types: AnySchemaComponent[];
    readonly chunks: SchemaChunkRuntime[];
}
export declare class World implements WorldAccess {
    private readonly owner;
    private readonly slots;
    private readonly free;
    private readonly archetypes;
    private readonly births;
    private readonly deaths;
    private readonly definitions;
    private reading;
    private disposed;
    private structuralVersion;
    private epoch;
    readonly access: WorldAccess;
    constructor();
    get archetypeList(): readonly Archetype[];
    get structureVersion(): number;
    get commitEpoch(): number;
    get size(): number;
    get capacity(): number;
    beginRead(): void;
    endRead(): void;
    spawn(...values: AnySchemaValue[]): Entity;
    spawnValues(values: AnySchemaValue[]): Entity;
    private registerDefinition;
    private lowerSchemaValue;
    private validateField;
    private slot;
    has(entity: Entity): boolean;
    read<Name extends string, Fields extends SchemaFields, Field extends keyof Fields>(entity: Entity, type: SchemaComponent<Name, Fields>, fieldName: Field): FieldValue<Fields[Field]> | undefined;
    write<Name extends string, Fields extends SchemaFields, Field extends keyof Fields>(entity: Entity, type: SchemaComponent<Name, Fields>, fieldName: Field, value: FieldValue<Fields[Field]>): void;
    private requireField;
    private readColumn;
    despawn(entity: Entity): void;
    query(): AllQuery;
    query<Types extends readonly AnySchemaComponent[]>(...types: Types): SchemaQuery<Types>;
    queryTypes(types: AnySchemaComponent[]): AllQuery | SchemaQuery<AnySchemaComponent[]>;
    commit(): void;
    private commitBirth;
    private commitDeath;
    enumerate(): object;
    dispose(): void;
}
export {};
