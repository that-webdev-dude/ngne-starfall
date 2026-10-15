// Adapted from cluster-renderer .versions/v03/gpu/QuadBufferLayout.ts and
// frame/QuadFrame.ts at 34458a987f03b00894e98a40d39fc0ae666194f6.
export const QUAD_FIELDS = {
    tx: 0,
    ty: 1,
    ix: 2,
    iy: 3,
    jx: 4,
    jy: 5,
    u0: 6,
    v0: 7,
    du: 8,
    dv: 9,
    r: 10,
    g: 11,
    b: 12,
    a: 13,
};
export const QUAD_STRIDE = 14;
export const BYTES_PER_QUAD = QUAD_STRIDE * Float32Array.BYTES_PER_ELEMENT;
export const QUAD_INSTANCE_BUFFER_LAYOUT = {
    arrayStride: 56,
    stepMode: "instance",
    attributes: [
        { shaderLocation: 0, offset: 0, format: "float32x2" },
        { shaderLocation: 1, offset: 8, format: "float32x4" },
        { shaderLocation: 2, offset: 24, format: "float32x4" },
        { shaderLocation: 3, offset: 40, format: "float32x4" },
    ],
};
export const QUAD_CORNER_BUFFER_LAYOUT = {
    arrayStride: 8,
    stepMode: "vertex",
    attributes: [{ shaderLocation: 4, offset: 0, format: "float32x2" }],
};
if (QUAD_INSTANCE_BUFFER_LAYOUT.arrayStride !== BYTES_PER_QUAD)
    throw new Error("Quad instance stride does not match the packed fields");
