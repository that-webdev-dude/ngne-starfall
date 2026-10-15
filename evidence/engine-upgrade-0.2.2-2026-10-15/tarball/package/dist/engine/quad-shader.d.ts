/**
 * Frame uniform layout (48 bytes):
 *
 * | offset | size | field             |
 * | -----: | ---: | ----------------- |
 * |      0 |    8 | viewportSize      | logical, not target
 * |      8 |    4 | debug             | uniform branch, not a pipeline key
 * |     12 |    4 | _pad0             |
 * |     16 |   16 | cameraLinear      | a, b, c, d
 * |     32 |    8 | cameraTranslation |
 * |     40 |    8 | _pad1             |
 *
 * `cameraLinear` is a vec4, not a mat2x2: WGSL matrix alignment rules are a
 * recurring source of silent offset bugs and a vec4 has one obvious layout.
 */
export declare const FRAME_UNIFORM_BYTES = 48;
/**
 * The `@location` numbers in `VertexInput` are the third of the three places
 * the quad field order is declared (with `QUAD_FIELDS` and
 * `QUAD_INSTANCE_BUFFER_LAYOUT`). `tests/frame-layout.test.ts` parses
 * this source and checks all three agree.
 */
export declare function getQuadShaderSource(): string;
