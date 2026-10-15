// Adapted from cluster-renderer .versions/v03/gpu/QuadRenderer.ts at
// 34458a987f03b00894e98a40d39fc0ae666194f6: indexed geometry, explicit pipeline,
// retained bindings, geometric growth, and adjacent runs. Frame owns all ordering.
import { validateGpuOperation } from "./gpu-context.js";
import { BYTES_PER_QUAD, QUAD_STRIDE, QUAD_CORNER_BUFFER_LAYOUT, QUAD_INSTANCE_BUFFER_LAYOUT, } from "./quad-layout.js";
import { FRAME_UNIFORM_BYTES, getQuadShaderSource } from "./quad-shader.js";
import { createResourceRegistry } from "./resource-registry.js";
export async function createQuadRenderer(device, format, debug = false) {
    const buffers = [];
    const registry = createResourceRegistry();
    const textures = new Map();
    let disposed = false;
    // Smallest instance capacity whose allocation reported out-of-memory.
    let unallocatable = Infinity;
    const stats = {
        drawCalls: 0,
        sprites: 0,
        uploadedBytes: 0,
        bufferGrowths: 0,
        capacity: 64,
        bindings: 0,
    };
    const maxQuads = Math.floor(device.limits.maxBufferSize / BYTES_PER_QUAD);
    stats.capacity = Math.min(stats.capacity, maxQuads);
    let upload = new Float32Array(stats.capacity * QUAD_STRIDE);
    const uniforms = new Float32Array(FRAME_UNIFORM_BYTES / 4);
    uniforms[2] = debug ? 1 : 0;
    uniforms[4] = uniforms[7] = 1;
    const allocate = (size, usage) => {
        const buffer = device.createBuffer({ size, usage: usage | GPUBufferUsage.COPY_DST });
        buffers.push(buffer);
        return buffer;
    };
    const dispose = () => {
        if (disposed)
            return;
        disposed = true;
        registry.clear();
        textures.clear();
        stats.bindings = 0;
        const errors = [];
        for (const buffer of buffers) {
            try {
                buffer.destroy();
            }
            catch (error) {
                errors.push(error);
            }
        }
        buffers.length = 0;
        if (errors.length)
            throw new AggregateError(errors, "Quad buffer disposal failed");
    };
    try {
        const resources = await validateGpuOperation(device, () => {
            const layout = device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                        buffer: { minBindingSize: FRAME_UNIFORM_BYTES },
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.FRAGMENT,
                        sampler: { type: "filtering" },
                    },
                    {
                        binding: 2,
                        visibility: GPUShaderStage.FRAGMENT,
                        texture: { sampleType: "float" },
                    },
                ],
            });
            const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout] });
            const corners = allocate(32, GPUBufferUsage.VERTEX);
            device.queue.writeBuffer(corners, 0, new Float32Array([0, 0, 0, 1, 1, 1, 1, 0]));
            const indices = allocate(12, GPUBufferUsage.INDEX);
            device.queue.writeBuffer(indices, 0, new Uint16Array([0, 1, 2, 0, 2, 3]));
            const instances = allocate(stats.capacity * BYTES_PER_QUAD, GPUBufferUsage.VERTEX);
            const uniform = allocate(FRAME_UNIFORM_BYTES, GPUBufferUsage.UNIFORM);
            const sampler = device.createSampler({
                magFilter: "nearest",
                minFilter: "nearest",
                addressModeU: "clamp-to-edge",
                addressModeV: "clamp-to-edge",
            });
            const shader = device.createShaderModule({
                label: "NGNE affine quad",
                code: getQuadShaderSource(),
            });
            return {
                layout,
                pipelineLayout,
                corners,
                indices,
                instances,
                uniform,
                sampler,
                shader,
            };
        });
        const blend = {
            srcFactor: "one",
            dstFactor: "one-minus-src-alpha",
            operation: "add",
        };
        const pipeline = await device.createRenderPipelineAsync({
            layout: resources.pipelineLayout,
            vertex: {
                module: resources.shader,
                entryPoint: "vs_main",
                buffers: [QUAD_CORNER_BUFFER_LAYOUT, QUAD_INSTANCE_BUFFER_LAYOUT],
            },
            fragment: {
                module: resources.shader,
                entryPoint: "fs_main",
                targets: [{ format, blend: { color: blend, alpha: blend } }],
            },
            primitive: { topology: "triangle-list" },
            multisample: { count: 1 },
        });
        let instances = resources.instances;
        const assertAlive = () => {
            if (disposed)
                throw new Error("Quad renderer is disposed");
        };
        return {
            stats,
            async binding(view) {
                assertAlive();
                const group = await validateGpuOperation(device, () => device.createBindGroup({
                    layout: resources.layout,
                    entries: [
                        {
                            binding: 0,
                            resource: { buffer: resources.uniform, size: FRAME_UNIFORM_BYTES },
                        },
                        { binding: 1, resource: resources.sampler },
                        { binding: 2, resource: view },
                    ],
                }));
                assertAlive();
                return group;
            },
            setTexture(id, group) {
                assertAlive();
                const handle = textures.get(id);
                if (handle === undefined)
                    textures.set(id, registry.register(group));
                else
                    registry.replace(handle, group);
                stats.bindings = registry.size;
            },
            async texture(id, view) {
                this.setTexture(id, await this.binding(view));
            },
            release(id) {
                const handle = textures.get(id);
                if (handle === undefined)
                    return;
                textures.delete(id);
                registry.release(handle);
                stats.bindings = registry.size;
            },
            prepare(frame) {
                assertAlive();
                stats.drawCalls = stats.sprites = stats.uploadedBytes = 0;
                const count = frame.count;
                if (!Number.isSafeInteger(count) ||
                    count < 0 ||
                    count > maxQuads ||
                    count * QUAD_STRIDE > frame.data.length ||
                    frame.order.length < count ||
                    frame.textures.length < count)
                    throw new Error("Invalid WebGPU frame count or buffer limit");
                for (let i = 0; i < count; i++) {
                    if (!textures.has(frame.textures[i] ?? ""))
                        throw new Error("Texture is not ready: " + frame.textures[i]);
                }
                frame.sort();
                if (count > stats.capacity) {
                    const capacity = Math.min(maxQuads, unallocatable - 1, Math.max(count, stats.capacity * 2));
                    if (count > capacity)
                        throw new Error("WebGPU instance buffer allocation failed");
                    device.pushErrorScope("out-of-memory");
                    let scope;
                    let replacement;
                    try {
                        replacement = allocate(capacity * BYTES_PER_QUAD, GPUBufferUsage.VERTEX);
                    }
                    finally {
                        scope = device.popErrorScope();
                    }
                    const allocated = replacement;
                    // Allocation failure is only known asynchronously. Frames already drawn with
                    // the invalid buffer raise uncaptured errors (reported once per device); later
                    // frames reallocate below the failed size or skip with one episode diagnostic.
                    void scope.then((error) => {
                        if (!error || disposed || instances !== allocated)
                            return;
                        unallocatable = Math.min(unallocatable, capacity);
                        stats.capacity = 0;
                    }, () => {
                        /* A lost device is handled by the runtime's loss path. */
                    });
                    const previous = instances;
                    instances = replacement;
                    upload = new Float32Array(capacity * QUAD_STRIDE);
                    stats.capacity = capacity;
                    stats.bufferGrowths++;
                    // The facade submits synchronously; no unsubmitted command refers to previous.
                    previous.destroy();
                    buffers.splice(buffers.indexOf(previous), 1);
                }
                for (let target = 0; target < count; target++) {
                    const source = frame.order[target] * QUAD_STRIDE;
                    const offset = target * QUAD_STRIDE;
                    for (let field = 0; field < QUAD_STRIDE; field++)
                        upload[offset + field] = frame.data[source + field];
                }
            },
            encode(encoder, view, frame, width, height, clear) {
                assertAlive();
                uniforms[0] = width;
                uniforms[1] = height;
                device.queue.writeBuffer(resources.uniform, 0, uniforms);
                stats.uploadedBytes = FRAME_UNIFORM_BYTES;
                if (frame.count) {
                    device.queue.writeBuffer(instances, 0, upload, 0, frame.count * QUAD_STRIDE);
                    stats.uploadedBytes += frame.count * BYTES_PER_QUAD;
                }
                const pass = encoder.beginRenderPass({
                    colorAttachments: [
                        {
                            view,
                            clearValue: {
                                r: ((clear >>> 16) & 255) / 255,
                                g: ((clear >>> 8) & 255) / 255,
                                b: (clear & 255) / 255,
                                a: 1,
                            },
                            loadOp: "clear",
                            storeOp: "store",
                        },
                    ],
                });
                try {
                    pass.setPipeline(pipeline);
                    pass.setVertexBuffer(0, resources.corners);
                    pass.setIndexBuffer(resources.indices, "uint16");
                    let start = 0;
                    while (start < frame.count) {
                        const id = frame.textures[frame.order[start]] ?? "";
                        let end = start + 1;
                        while (end < frame.count && (frame.textures[frame.order[end]] ?? "") === id)
                            end++;
                        const handle = textures.get(id);
                        if (handle === undefined)
                            throw new Error("Texture is not ready: " + id);
                        pass.setBindGroup(0, registry.get(handle));
                        pass.setVertexBuffer(1, instances, start * BYTES_PER_QUAD);
                        pass.drawIndexed(6, end - start);
                        stats.drawCalls++;
                        start = end;
                    }
                    stats.sprites = frame.count;
                }
                finally {
                    pass.end();
                }
            },
            dispose,
        };
    }
    catch (error) {
        try {
            dispose();
        }
        catch (cleanup) {
            throw new AggregateError([error, cleanup], "Quad initialization failed");
        }
        throw error;
    }
}
