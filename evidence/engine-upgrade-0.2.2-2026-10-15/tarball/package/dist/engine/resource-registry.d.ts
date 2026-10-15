/** Device-generation-local handles. A released handle is never reused. */
export interface ResourceRegistry<T extends object> {
    register(resource: T): number;
    replace(handle: number, resource: T): void;
    release(handle: number): void;
    get(handle: number): T;
    clear(): void;
    readonly size: number;
}
export declare function createResourceRegistry<T extends object>(): ResourceRegistry<T>;
