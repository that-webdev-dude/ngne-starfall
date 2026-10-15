/** Detached diagnostic data, not a serialization or restoration format. */
export type InspectionValue = string | number | boolean | bigint | null | undefined | readonly InspectionValue[] | {
    readonly [key: string]: InspectionValue;
};
/** Copy enumerable data without exposing object identity, methods or entity ownership. */
export declare function inspectValue(value: unknown, seen?: Map<object, InspectionValue>): InspectionValue;
