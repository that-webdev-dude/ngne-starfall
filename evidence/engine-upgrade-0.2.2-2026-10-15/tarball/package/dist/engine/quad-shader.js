// Adapted from cluster-renderer .versions/v03/gpu/quadShader.ts at 34458a987f03b00894e98a40d39fc0ae666194f6.
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
export const FRAME_UNIFORM_BYTES = 48;
/**
 * The `@location` numbers in `VertexInput` are the third of the three places
 * the quad field order is declared (with `QUAD_FIELDS` and
 * `QUAD_INSTANCE_BUFFER_LAYOUT`). `tests/frame-layout.test.ts` parses
 * this source and checks all three agree.
 */
export function getQuadShaderSource() {
    return `
        struct FrameUniforms {
            viewportSize: vec2<f32>,
            debug: f32,
            _pad0: f32,
            cameraLinear: vec4<f32>,
            cameraTranslation: vec2<f32>,
            _pad1: vec2<f32>,
        }

        @group(0) @binding(0) var<uniform> frameUniforms: FrameUniforms;
        @group(0) @binding(1) var quadSampler: sampler;
        @group(0) @binding(2) var quadTexture: texture_2d<f32>;

        fn pixelToClip(pixel: vec2<f32>, viewport: vec2<f32>) -> vec4<f32> {
            let clipX = (pixel.x / viewport.x) * 2.0 - 1.0;
            let clipY = 1.0 - (pixel.y / viewport.y) * 2.0;

            return vec4<f32>(clipX, clipY, 0.0, 1.0);
        }

        struct VertexInput {
            @location(0) translation: vec2<f32>,
            @location(1) linear: vec4<f32>,
            @location(2) uv: vec4<f32>,
            @location(3) tint: vec4<f32>,
            @location(4) corner: vec2<f32>,
        }

        struct VertexOutput {
            @builtin(position) position: vec4<f32>,
            @location(0) uv: vec2<f32>,
            @location(1) tint: vec4<f32>,
        }

        @vertex
        fn vs_main(input: VertexInput) -> VertexOutput {
            var out: VertexOutput;

            let quadLinear = mat2x2<f32>(
                input.linear.x,
                input.linear.y,
                input.linear.z,
                input.linear.w,
            );
            let cameraLinear = mat2x2<f32>(
                frameUniforms.cameraLinear.x,
                frameUniforms.cameraLinear.y,
                frameUniforms.cameraLinear.z,
                frameUniforms.cameraLinear.w,
            );

            let world = quadLinear * input.corner + input.translation;
            let logical = cameraLinear * world + frameUniforms.cameraTranslation;

            out.position = pixelToClip(logical, frameUniforms.viewportSize);

            let uvOrigin = input.uv.xy;
            let uvShift = input.corner * input.uv.zw;
            out.uv = uvOrigin + uvShift;

            out.tint = input.tint;

            return out;
        }

        struct FragmentInput {
            @location(0) uv: vec2<f32>,
            @location(1) tint: vec4<f32>,
        }

        @fragment
        fn fs_main(input: FragmentInput) -> @location(0) vec4<f32> {
            if (frameUniforms.debug == 1) {
                return vec4<f32>(1.0, 0.0, 0.0, 1.0);
            }

            let texColor = textureSample(quadTexture, quadSampler, input.uv);
            let straight = texColor * input.tint;
            let premultiplied = vec4<f32>(straight.rgb * straight.a, straight.a);

            return premultiplied;
        }
    `;
}
