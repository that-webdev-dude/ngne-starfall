import { Camera, Frame, WebGPURenderer, imageAsset } from "@ngne/core";
import { stageSize, validate, validateBounds } from "./model.js";
import { Playback } from "./playback.js";
import { Inspection } from "./inspection.js";
function element(id, kind) {
    const value = document.getElementById(id);
    if (!(value instanceof kind))
        throw Error(`Missing element ${id}`);
    return value;
}
const canvas = element("canvas", HTMLCanvasElement), controls = element("controls", HTMLFieldSetElement);
const frames = element("frames", HTMLSelectElement), animations = element("animations", HTMLSelectElement);
const play = element("play", HTMLButtonElement), status = element("status", HTMLParagraphElement);
const error = element("error", HTMLParagraphElement), entry = element("entry", HTMLParagraphElement);
const details = element("details", HTMLPreElement);
const selectionName = element("selection-name", HTMLHeadingElement), playbackState = element("playback-state", HTMLSpanElement), selectionSummary = element("selection-summary", HTMLParagraphElement), spriteSize = element("sprite-size", HTMLParagraphElement);
const previous = element("previous", HTMLButtonElement), next = element("next", HTMLButtonElement), magnification = element("magnification", HTMLSelectElement), baseline = element("baseline", HTMLButtonElement);
const abort = new AbortController();
let renderer, playback, callback = 0, disposed = false, failed = false;
let stopInspection = () => { };
function fail(cause) {
    stopInspection();
    failed = true;
    error.textContent += `${String(cause)}\n`;
    status.textContent = "Preview failed";
    controls.disabled = true;
    playback?.pause(performance.now());
    cancelAnimationFrame(callback);
    abort.abort();
    try {
        renderer?.dispose();
    }
    catch (cleanup) {
        error.textContent += `Cleanup: ${String(cleanup)}\n`;
    }
}
function dispose() {
    if (disposed)
        return;
    disposed = true;
    stopInspection();
    playback?.pause(performance.now());
    cancelAnimationFrame(callback);
    abort.abort();
    try {
        renderer?.dispose();
        status.textContent = "Preview disposed";
    }
    catch (cause) {
        fail(cause);
    }
}
window.addEventListener("pagehide", dispose, { once: true });
// A page restored from the back/forward cache needs a fresh renderer.
window.addEventListener("pageshow", (event) => {
    if (event.persisted)
        location.reload();
});
window.addEventListener("error", (event) => fail(event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => fail(event.reason));
async function start() {
    const response = await fetch("/config", { signal: abort.signal });
    if (!response.ok)
        throw Error(`Adapter data: HTTP ${response.status}`);
    const preview = validate(await response.json());
    const size = stageSize(preview);
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.style.width = `${size.width * preview.display.scale}px`;
    canvas.style.height = `${size.height * preview.display.scale}px`;
    const stage = element("stage", HTMLDivElement);
    const inspection = new Inspection(size.width * preview.display.scale, size.height * preview.display.scale);
    let zoom = 1;
    let drag;
    function endDrag() {
        if (drag && stage.hasPointerCapture(drag.id))
            stage.releasePointerCapture(drag.id);
        drag = undefined;
        stage.classList.remove("dragging");
    }
    function position() {
        canvas.style.left = `${Math.round(stage.clientWidth / 2 + (inspection.x - inspection.width / 2) * zoom)}px`;
        canvas.style.top = `${Math.round(stage.clientHeight / 2 + (inspection.y - inspection.height / 2) * zoom)}px`;
    }
    const resize = new ResizeObserver(position);
    resize.observe(stage);
    stopInspection = () => {
        endDrag();
        resize.disconnect();
    };
    const listen = { signal: abort.signal };
    stage.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || !event.isPrimary || drag)
            return;
        stage.focus({ preventScroll: true });
        stage.setPointerCapture(event.pointerId);
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
        stage.classList.add("dragging");
        event.preventDefault();
    }, listen);
    stage.addEventListener("pointermove", (event) => {
        if (!drag || event.pointerId !== drag.id)
            return;
        inspection.pan(event.clientX - drag.x, event.clientY - drag.y);
        drag.x = event.clientX;
        drag.y = event.clientY;
        position();
    }, listen);
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
        stage.addEventListener(type, endDrag, listen);
    window.addEventListener("blur", endDrag, listen);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden)
            endDrag();
    }, listen);
    stage.addEventListener("wheel", (event) => {
        if (event.ctrlKey || event.metaKey)
            return;
        event.preventDefault();
        if (!event.deltaY || controls.disabled)
            return;
        const levels = [...magnification.options]
            .filter((option) => !option.disabled)
            .map((option) => Number(option.value));
        const index = Math.max(0, Math.min(levels.length - 1, levels.indexOf(zoom) - Math.sign(event.deltaY)));
        setZoom(levels[index]);
    }, { ...listen, passive: false });
    stage.addEventListener("keydown", (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey)
            return;
        const step = event.shiftKey ? 128 : 32;
        const directions = {
            ArrowLeft: [step, 0],
            ArrowRight: [-step, 0],
            ArrowUp: [0, step],
            ArrowDown: [0, -step],
        };
        const direction = directions[event.key];
        if (!direction)
            return;
        event.preventDefault();
        inspection.pan(...direction);
        position();
    }, listen);
    // Only CSS scales the already rendered pixels; backing size and sprite geometry stay fixed.
    for (const option of magnification.options)
        option.disabled =
            Math.max(size.width, size.height) * preview.display.scale * Number(option.value) >
                16777216;
    function setZoom(value) {
        endDrag();
        zoom = value;
        inspection.zoom = value;
        magnification.value = String(value);
        canvas.style.width = `${size.width * preview.display.scale * zoom}px`;
        canvas.style.height = `${size.height * preview.display.scale * zoom}px`;
        position();
    }
    magnification.addEventListener("change", () => setZoom(Number(magnification.value)));
    baseline.addEventListener("click", () => {
        inspection.reset();
        setZoom(1);
    });
    position();
    const dimensions = new Map();
    const bitmaps = new Map();
    try {
        for (const image of preview.images) {
            try {
                const bitmap = await imageAsset(image.id, image.src).load(abort.signal);
                bitmaps.set(image.id, bitmap);
                if (abort.signal.aborted)
                    throw Error("Image loading cancelled");
                dimensions.set(image.id, { width: bitmap.width, height: bitmap.height });
            }
            catch (cause) {
                throw Error(`image ${image.id}: ${String(cause)}`);
            }
        }
        validateBounds(preview, dimensions);
        renderer = await WebGPURenderer.create(canvas, size.width, size.height, fail);
        if (disposed || failed) {
            renderer.dispose();
            return;
        }
        for (const [id, bitmap] of bitmaps) {
            try {
                await renderer.texture(id, bitmap, abort.signal);
            }
            catch (cause) {
                throw Error(`image ${id} upload: ${String(cause)}`);
            }
        }
    }
    finally {
        for (const bitmap of bitmaps.values())
            bitmap.close();
    }
    if (disposed || failed)
        return;
    const gpu = renderer;
    const frame = new Frame(), camera = new Camera();
    camera.pixelSnap = preview.display.pixelSnap;
    for (const item of preview.frames)
        frames.add(new Option(item.id, item.id));
    animations.add(new Option("Standalone frame", ""));
    for (const item of preview.animations)
        animations.add(new Option(item.id, item.id));
    controls.disabled = false;
    function draw(now) {
        if (disposed || failed)
            return;
        try {
            playback?.advance(now);
            const selected = playback
                ? playback.animation.entries[playback.index].frame
                : frames.value;
            const sprite = preview.frames.find((item) => item.id === selected);
            const image = dimensions.get(sprite.image);
            frame.reset();
            frame.scene(camera, 1);
            // Rendered checkerboard makes partial alpha visible through the same renderer.
            const cell = Math.max(8, Math.ceil(Math.max(size.width, size.height) / 64));
            for (let y = 0; y < size.height; y += cell)
                for (let x = 0; x < size.width; x += cell)
                    frame.rect(x + cell / 2, y + cell / 2, cell, cell, (x / cell + y / cell) % 2 ? 0x272d37 : 0x303845);
            frame.sprite({
                x: size.width / 2,
                y: size.height / 2,
                width: sprite.destinationWidth * preview.display.density,
                height: sprite.destinationHeight * preview.display.density,
                texture: sprite.image,
                u: sprite.x / image.width,
                v: sprite.y / image.height,
                uw: sprite.width / image.width,
                vh: sprite.height / image.height,
            });
            frame.sort();
            gpu.render(frame);
            if (failed)
                return;
            const bounds = canvas.getBoundingClientRect();
            if (Math.abs(bounds.width - size.width * preview.display.scale * zoom) > 0.02 ||
                Math.abs(bounds.height - size.height * preview.display.scale * zoom) > 0.02)
                throw Error("Canvas CSS bounds differ from declared presentation scale");
            frames.value = selected;
            play.disabled = !playback || document.hidden;
            play.textContent = playback?.playing ? "Pause" : "Play";
            previous.disabled = next.disabled = !playback || playback.playing || document.hidden;
            selectionName.textContent = playback?.animation.id ?? selected;
            playbackState.textContent = playback
                ? playback.playing
                    ? "Playing"
                    : "Paused"
                : "Still";
            selectionSummary.textContent = playback
                ? `Entry ${playback.index + 1}/${playback.animation.entries.length} · ${playback.animation.entries[playback.index].ms} ms · ${playback.animation.playback === "loop" ? "Loop" : "Once"}`
                : "Standalone frame";
            spriteSize.textContent = `${sprite.destinationWidth * preview.display.density * preview.display.scale} × ${sprite.destinationHeight * preview.display.density * preview.display.scale} CSS px at 1×`;
            entry.textContent = playback
                ? `${playback.animation.id}: entry ${playback.index + 1}/${playback.animation.entries.length} · ${playback.animation.entries[playback.index].ms} ms · elapsed ${playback.elapsed.toFixed(1)}/${playback.total} ms · ${playback.animation.playback} · ${playback.playing ? "playing" : "paused"}`
                : `${selected}: standalone frame`;
            status.textContent = document.hidden
                ? "Hidden: paused; press Play after returning"
                : `Ready · renderer ${gpu.status}`;
            details.textContent = `Frame ${selected}\nSource: ${sprite.image} (${image.width} × ${image.height}), crop ${sprite.x}, ${sprite.y}, ${sprite.width} × ${sprite.height} px\nDestination: ${sprite.destinationWidth} × ${sprite.destinationHeight} logical units\nRender density: ${preview.display.density} px/unit · CSS presentation: ${preview.display.scale} px/render px · pixel snap: ${preview.display.pixelSnap}\nSprite render size: ${sprite.destinationWidth * preview.display.density} × ${sprite.destinationHeight * preview.display.density} px\nCanvas: ${canvas.width} × ${canvas.height} · baseline CSS: ${size.width * preview.display.scale} × ${size.height * preview.display.scale} · measured CSS: ${bounds.width} × ${bounds.height} · DPR: ${devicePixelRatio}\nFixed center: ${size.width / 2}, ${size.height / 2} · inspection magnification: ${zoom}×${zoom === 1 ? " (baseline)" : ""} · browser zoom: manual (use 100%)`;
            callback = requestAnimationFrame(draw);
        }
        catch (cause) {
            fail(cause);
        }
    }
    frames.addEventListener("change", () => {
        playback = undefined;
        animations.value = "";
    });
    animations.addEventListener("change", () => {
        const animation = preview.animations.find((item) => item.id === animations.value);
        playback = animation ? new Playback(animation) : undefined;
    });
    play.addEventListener("click", () => {
        if (document.hidden || !playback)
            return;
        if (playback.playing)
            playback.pause(performance.now());
        else
            playback.play(performance.now());
    });
    previous.addEventListener("click", () => playback?.step(-1));
    next.addEventListener("click", () => playback?.step(1));
    document.addEventListener("visibilitychange", () => {
        if (document.hidden)
            playback?.pause(performance.now());
    });
    callback = requestAnimationFrame(draw);
}
void start().catch((cause) => {
    if (!disposed)
        fail(cause);
});
