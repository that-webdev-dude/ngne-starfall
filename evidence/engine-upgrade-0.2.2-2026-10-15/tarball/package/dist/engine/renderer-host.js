/** Internal platform capabilities; not exported by the package entry point. */
export const CREATE_RENDERER = Symbol("create renderer with host cancellation");
export const ACQUIRE_IMAGE = Symbol("acquire renderer image");
export const RENDERER_READY = Symbol("await renderer readiness");
