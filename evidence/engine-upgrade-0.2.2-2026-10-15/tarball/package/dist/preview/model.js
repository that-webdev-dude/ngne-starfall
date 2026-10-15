export function object(value, field) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw Error(`${field}: expected an object`);
    return value;
}
function array(value, field) {
    if (!Array.isArray(value))
        throw Error(`${field}: expected an array`);
    return value;
}
function text(value, field) {
    if (typeof value !== "string" || !value.trim())
        throw Error(`${field}: expected a nonempty string`);
    return value;
}
function positive(value, field) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
        throw Error(`${field}: expected a positive finite number`);
    return value;
}
function integer(value, field, minimum) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum)
        throw Error(`${field}: expected a safe integer >= ${minimum}`);
    return value;
}
function unique(values, field) {
    const ids = new Set();
    for (const { id } of values) {
        if (ids.has(id))
            throw Error(`${field} ${id}: duplicate id`);
        ids.add(id);
    }
    return values;
}
export function duration(animation) {
    let total = 0;
    for (const [index, entry] of animation.entries.entries()) {
        const next = total + entry.ms;
        if (!Number.isFinite(next) || next <= total)
            throw Error(`animation ${animation.id} entry ${index}: total duration overflow or lost precision`);
        total = next;
    }
    return total;
}
/** Copy only normalized data. Adapter code and extra consumer metadata never reach the page. */
export function validate(value) {
    const input = object(value, "adapter"), display = object(input.display, "display");
    if (typeof display.pixelSnap !== "boolean")
        throw Error("display.pixelSnap: expected boolean");
    const images = unique(array(input.images, "images").map((value, index) => {
        const v = object(value, `image ${index}`), id = text(v.id, `image ${index}.id`);
        return { id, src: text(v.src, `image ${id}.src`) };
    }), "image");
    const frames = unique(array(input.frames, "frames").map((value, index) => {
        const v = object(value, `frame ${index}`), id = text(v.id, `frame ${index}.id`);
        const image = text(v.image, `frame ${id}.image`);
        if (!images.some((item) => item.id === image))
            throw Error(`frame ${id}.image: missing ${image}`);
        return {
            id,
            image,
            x: integer(v.x, `frame ${id}.x`, 0),
            y: integer(v.y, `frame ${id}.y`, 0),
            width: integer(v.width, `frame ${id}.width`, 1),
            height: integer(v.height, `frame ${id}.height`, 1),
            destinationWidth: positive(v.destinationWidth, `frame ${id}.destinationWidth`),
            destinationHeight: positive(v.destinationHeight, `frame ${id}.destinationHeight`),
        };
    }), "frame");
    if (!frames.length)
        throw Error("frames: at least one frame required");
    const animations = unique(array(input.animations, "animations").map((value, index) => {
        const v = object(value, `animation ${index}`), id = text(v.id, `animation ${index}.id`);
        if (v.playback !== "loop" && v.playback !== "once")
            throw Error(`animation ${id}.playback: expected loop or once`);
        const entries = array(v.entries, `animation ${id}.entries`).map((value, index) => {
            const entry = object(value, `animation ${id} entry ${index}`);
            const frame = text(entry.frame, `animation ${id} entry ${index}.frame`);
            if (!frames.some((item) => item.id === frame))
                throw Error(`animation ${id} entry ${index}.frame: missing ${frame}`);
            return { frame, ms: positive(entry.ms, `animation ${id} entry ${index}.ms`) };
        });
        if (!entries.length)
            throw Error(`animation ${id}.entries: empty sequence`);
        const animation = { id, playback: v.playback, entries };
        duration(animation);
        return animation;
    }), "animation");
    const result = {
        images,
        frames,
        animations,
        display: {
            density: positive(display.density, "display.density"),
            scale: positive(display.scale, "display.scale"),
            pixelSnap: display.pixelSnap,
        },
    };
    stageSize(result);
    return result;
}
/** Fixed even backing dimensions keep one integer center for every selection. */
export function stageSize(preview) {
    let width = 0, height = 0;
    for (const frame of preview.frames) {
        const w = frame.destinationWidth * preview.display.density;
        const h = frame.destinationHeight * preview.display.density;
        for (const [field, value] of [
            ["width", w],
            ["height", h],
        ])
            if (!Number.isFinite(Math.fround(value)) || Math.fround(value) <= 0 || value > 8190)
                throw Error(`frame ${frame.id}: derived ${field} outside supported render dimensions (0, 8190]`);
        width = Math.max(width, w);
        height = Math.max(height, h);
    }
    const size = { width: Math.ceil((width + 2) / 2) * 2, height: Math.ceil((height + 2) / 2) * 2 };
    for (const [field, value] of Object.entries(size)) {
        const css = value * preview.display.scale;
        if (!Number.isFinite(css) || css < 1 / 64 || css > 16777216)
            throw Error(`display.scale: derived CSS ${field} outside supported dimensions`);
    }
    return size;
}
export function validateBounds(preview, dimensions) {
    for (const image of preview.images) {
        const size = dimensions.get(image.id);
        if (!size ||
            !Number.isSafeInteger(size.width) ||
            !Number.isSafeInteger(size.height) ||
            size.width <= 0 ||
            size.height <= 0)
            throw Error(`image ${image.id}: missing or invalid decoded dimensions`);
    }
    for (const frame of preview.frames) {
        const size = dimensions.get(frame.image);
        if (frame.x > size.width - frame.width || frame.y > size.height - frame.height)
            throw Error(`frame ${frame.id}: source rectangle outside image ${frame.image} (${size.width}x${size.height})`);
    }
}
