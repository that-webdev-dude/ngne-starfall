# Engine guide

Examples assume a TypeScript browser app with a canvas. The [first scene](https://github.com/that-webdev-dude/ngne/tree/main/examples/hello) provides a complete example. Application setup and game code remain consumer-owned.

## Install from npm

For registry installation, pin an exact version in your application:

```sh
npm install --save-exact @ngne/core@0.2.1
```

Normal releases use `latest`; prereleases use `next`. Commit your consumer lockfile
and upgrade deliberately as the experimental API evolves. Use Node 24 or newer
(`npm.cmd` in Windows PowerShell).
For unpublished candidates, use the local-package workflow below.

## Migrate from `@that-webdev-dude/ngne`

`0.2.1` renames the package to `@ngne/core`; exports, engine behavior and the
`ngne-preview` command are unchanged. Replace the dependency:

```sh
npm uninstall @that-webdev-dude/ngne
npm install --save-exact @ngne/core@0.2.1
```

Change imports from `"@that-webdev-dude/ngne"` to `"@ngne/core"` and commit the
updated lockfile.

## Install a local package

From the engine checkout, install locked dependencies and prepare the package:

```powershell
npm ci
npm run prepare:package
```

The command prints the exact preparation manifest path. Copy the tarball identified
by that manifest into the separate application's `vendor` directory and install it
there with `npm install ./vendor/<actual-tarball-filename>`, replacing the placeholder
with the emitted filename including `.tgz`. Commit the tarball and consumer lockfile together;
subsequent clean installs use `npm ci`. Retain the preparation manifest, source revision
(`git rev-parse HEAD`), any engine changes and the tarball hash (`Get-FileHash`).
See [package preparation](https://github.com/that-webdev-dude/ngne/blob/main/tooling/README.md#package-preparation)
for the authoritative commands, output selection and manifest semantics.
Do not use a workspace link, source alias, or imports from engine `src`.

Your application owns its commands and fixtures. For either installation method,
a Vite application should use TypeScript with `moduleResolution: "Bundler"`, DOM
libraries, `types: []` and `skipLibCheck: false`; consumer declarations need no
`@webgpu/types`. Set `build.target: "es2022"` for top-level await. Use
`new URL("../assets/file.png", import.meta.url)` so Vite rewrites asset URLs for
root or nested deployment bases.

The package includes `dist/engine` JavaScript and declarations. WGSL source is
embedded in `quad-shader.js`; no shader loader or extra shader-file copy is needed.
Browser WebGPU, Web Audio, fetch and image decoding remain platform requirements.
Check the production preview at both bases, click to unlock audio, and record
visible rendering and audible playback separately from successful decoding.

## Sprite and animation inspection

The installed package includes `ngne-preview`, a local development tool using that
same installation's WebGPU renderer. Node 24+ and a WebGPU-capable desktop browser
are required. After installing NGNE in your application, add this consumer npm script:

```json
{ "scripts": { "preview:assets": "ngne-preview ./preview.config.mjs" } }
```

Create `preview.config.mjs` beside the consumer's `package.json`, adjusting the
image and rectangles to match your artwork:

```js
export default {
    images: [{ id: "sheet", src: new URL("./assets/sheet.png", import.meta.url) }],
    frames: [
        {
            id: "idle",
            image: "sheet",
            x: 0,
            y: 0,
            width: 32,
            height: 32,
            destinationWidth: 16,
            destinationHeight: 16,
        },
        {
            id: "blink",
            image: "sheet",
            x: 32,
            y: 0,
            width: 32,
            height: 32,
            destinationWidth: 16,
            destinationHeight: 16,
        },
    ],
    animations: [
        {
            id: "blink",
            playback: "loop",
            entries: [
                { frame: "idle", ms: 800 },
                { frame: "blink", ms: 120 },
            ],
        },
    ],
    display: { density: 2, scale: 1, pixelSnap: true },
};
```

Run `npm run preview:assets` (`npm.cmd` on Windows) and open the printed loopback
URL. Ctrl+C stops the host. This uses the installed executable, with no tool download,
Vite or tsx dependency. The config argument resolves from the invocation directory;
adapter imports follow Node ESM rules. The adapter executes in Node and may translate
consumer metadata with consumer-owned dependencies. Only normalized data reaches the
browser. Images and data are snapshotted at startup: restart after edits, then reload.

| Field        | Supported input                                                                                                                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `images`     | Array of unique nonempty `id`s and local `file:` URL objects or strings in `src`; no remote URLs or relative path strings.                                                                                                                                                     |
| `frames`     | Nonempty array of unique `id`s, existing `image` ID, nonnegative safe-integer `x/y`, positive safe-integer `width/height` in source pixels, and positive finite `destinationWidth/destinationHeight` in logical units. Decoded image dimensions bound the crop.                |
| `animations` | Array (may be empty) of unique `id`s, `playback: "loop"` or `"once"`, and nonempty ordered `entries` of existing `frame` IDs with positive finite `ms`. Repeated frame references remain distinct entries. Total duration must remain finite with every entry distinguishable. |
| `display`    | Required positive finite `density` (render pixels/logical unit), positive finite `scale` (baseline CSS pixels/render pixel), and boolean `pixelSnap`.                                                                                                                          |

IDs are unique within their own collection. Invalid inputs are rejected with field
diagnostics; rectangles and timings are never guessed or clamped. Translation from
an exporter's schema remains the adapter author's responsibility. Startup errors
appear in the terminal; image decode/bounds/upload and renderer errors appear in the page.

Select a frame for a still image, or an animation to start at entry 1 paused.
Play/Pause preserves elapsed time within the current entry. Timing uses elapsed
visible time with start-inclusive/end-exclusive intervals, not callback counts.
Loops retain their remainder; once animations hold their final entry and stop,
and Play restarts them. Hiding the tab pauses; returning requires Play.
Previous/Next work only while paused, move one entry and clamp at both ends even
for loops. Each step resets the selected entry's elapsed time, including at a clamped
endpoint or after once completion, so it receives its full duration on resume.

Inspection magnification offers 1× (baseline), 2×, 4× and 8×. The Baseline button
restores 1× and centers the canvas. Controls stay above a viewport bounded by the
window; artwork is never fitted. Left-click and drag to pan, or focus the viewport
and use arrow keys (Shift for larger steps). Wheel up/down steps zoom through 1×,
2×, 4× and 8×, capped at the supported limits. Ctrl/Command-wheel remains
browser-controlled.
Panning can bring any canvas edge to the viewport center. Magnification retains the
canvas point at that center, including when resizing the window. Rendering details
expand below the viewport. Magnification scales the rendered canvas
with pixelated CSS; it never changes destination dimensions, backing resolution or
timing, and cannot recover discarded source detail. Baseline size is destination ×
density × scale; inspection adds only the magnification factor. Set browser zoom to
100% for review. DPR is reported but never automatically applied to render dimensions.

The stage has a fixed center and size across all frames, with a checkerboard for
transparency and measured-size labels. Its rectangle covers every frame, so small
frames can have empty margins; panning changes only the inspection position. Derived sprite
dimensions must be representable positive float32 values no larger than 8190 pixels;
the padded even-sized canvas is at most 8192. Baseline CSS dimensions must lie within
1/64–16777216 pixels; magnifications exceeding the upper limit are disabled. Browser
layout or GPU limits can still reject a preview visibly.

Limitations: no fallback renderer, live reload, TypeScript adapter execution, custom
origins, composite scenes, gameplay or state-machine interpretation. Very short entries
may receive no physical display refresh. Inspect external frames and motion at baseline
and magnified sizes and record actual observations plus approve/revise decisions;
valid metadata and automated checks cannot approve artwork. Isolated inspection does
not establish readability against game backgrounds, lighting, HUD or moving cameras.

## Your first scene

```ts
import { BrowserGame, component, f64, lerp, type SceneDefinition } from "@ngne/core";

const Position = component("position", { x: f64(40), previousX: f64(40) });
const scene: SceneDefinition = {
    id: "hello",
    setup(scene) {
        scene.world.spawn(Position.of());
        const points = scene.world.query(Position);

        scene.system(({ dt }) => {
            points.eachChunk((chunk) => {
                const position = chunk.views.position;
                for (let row = 0, count = chunk.count; row < count; row++) {
                    position.previousX[row] = position.x[row];
                    position.x[row] += 40 * dt;
                }
            });
        });
        scene.resetInterpolation(() => {
            points.eachChunk((chunk) => {
                const position = chunk.views.position;
                for (let row = 0, count = chunk.count; row < count; row++)
                    position.previousX[row] = position.x[row];
            });
        });
        scene.render((frame, alpha) => {
            points.eachChunk((chunk) => {
                const position = chunk.views.position;
                for (let row = 0, count = chunk.count; row < count; row++)
                    frame.rect(
                        lerp(position.previousX[row], position.x[row], alpha),
                        100,
                        16,
                        16,
                        0x83e8e1,
                    );
            });
        });
    },
};

const app = new BrowserGame({
    canvas: document.querySelector("canvas")!,
    diagnostic: showError,
    width: 640,
    height: 400,
    seed: "my-game",
    state: {},
    transition: (state) => state,
});
// Provide a persistent <pre role="alert"> in the page. Diagnostics also report
// non-error notices (dropped-tick overload); append errors so none hides another.
function showError(error: unknown): void {
    const output = document.querySelector('[role="alert"]');
    if (!output || !(error instanceof Error)) return;
    const message = describeError(error);
    if (!output.textContent?.includes(message))
        output.textContent += (output.textContent ? "\n" : "") + message;
}
function describeError(error: unknown): string {
    if (error instanceof AggregateError)
        return [error.message, ...error.errors.map(describeError)].join("\n");
    if (error instanceof Error)
        return error.message + (error.cause ? "\n" + describeError(error.cause) : "");
    return String(error);
}
try {
    await app.start(await app.game.prepare(scene, { key: "first-room" }));
} catch (error) {
    showError(error);
}
// await app.stop(); await app.start(); // preserve the mounted scene
// await app.dispose();                 // terminal; releases all owned services
```

Rectangles and sprites use **center coordinates**. Distances are logical canvas pixels; `dt` is seconds. Composition is fixed when an entity spawns. Schema queries invoke one callback per nonempty 512-row chunk; hoist the inferred typed columns and read `chunk.count` once before the row loop to avoid repeating the borrow check for every row.

Use a secure origin (localhost or HTTPS) and a WebGPU-capable browser with hardware
acceleration. See the [README's Status and platform support section](../README.md#status-and-platform-support)
for the documented validation envelope and unverified platforms. Unsupported startup
and failed device recovery remain visible in the alert above. `BrowserGame` renders
only through WebGPU; there is no fallback backend.

CSS can resize the canvas on screen. BrowserGame preserves its fixed logical backing
resolution and converts input through the current bounding rectangle. Stop/resume
retains the scene and renderer; use `app.dispose()` for terminal browser teardown.
See the [renderer contract](contracts/browser-and-presentation.md#renderer) for exact recovery and ownership rules.

## Image sprites

```ts
import { imageAsset, type SceneDefinition } from "@ngne/core";

const spark = imageAsset("spark", new URL("./spark.png", import.meta.url).href);
const room: SceneDefinition = {
    id: "spark-room",
    assets: [spark],
    setup(scene) {
        const sprite = { x: 80, y: 100, width: 32, height: 32, texture: spark.id };
        scene.render((frame) => frame.sprite(sprite));
    },
};
```

With the WebGPU host, `app.game.prepare(room, { key: "room" })` waits for decoding
and validated GPU upload, even before the first start. Preparation does not mount or
tick the room. Reuse the same ImageAsset definition for shared consumers; setup assets
remain CPU values. The host releases GPU registrations with their scene/candidate.
The [hello example](https://github.com/that-webdev-dude/ngne/blob/main/examples/hello/main.ts) combines an image sprite and a solid quad.

## Browser input

Give the game canvas `tabindex="0"` and focus it after the player starts or resumes the
game. `BrowserGame` then owns keyboard and gamepad input only while that canvas is
focused; ordinary buttons and form controls keep their normal keyboard behavior. Pointer
input is canvas-scoped and uses current CSS-to-logical scaling.

Release-to-activate consumers must use `input.pointer.completed`, checking both start
and release coordinates against their target; `released` only means an action stopped
being held and does not establish successful completion.

Blur, pointer cancellation or capture loss, host stop and disposal clear held actions.
The first connected gamepad supplies the one logical player; after cancellation it must
return to neutral before being read again. Local multiplayer and explicit pad assignment
remain outside the engine contract. The exact edge and hot-plug rules are in the
[platform contract](contracts/browser-and-presentation.md#platform-and-lifecycle).

## Scene authoring

```ts
type Progress = { best: number };
type ProgressCommand = { type: "score"; value: number };
const arena: SceneDefinition<Progress, ProgressCommand> = {
    id: "arena",
    setup(scene) {
        const board = scene.resource("board", new Uint8Array(20 * 12));
        const waves = scene.random("waves");
        const score = scene.state();

        scene.system((ctx) => {
            // All three are explicitly injected; there is no global resource registry.
            board[0] = waves.int(0, 4);
            if (ctx.input.pressed.includes("Space")) {
                scene.freeze(4);
                ctx.emit({ type: "blast" });
                score.dispatch({ type: "score", value: 100 });
            }
        });
        scene.system(
            (ctx) => {
                // Separate effects continue through hitstop.
            },
            { runsDuringFreeze: true },
        );
    },
};
```

Use the same state/command types on `SceneDefinition<S,C>` and `Game<S,C>`; `prepare()` checks compatibility and `scene.state()` infers access. Unparameterized definitions remain portable but cannot dispatch. Treat state reads and transition inputs as read-only, keep transitions synchronous, and dispatch only from the owning scene's system update; the [data contract](contracts/simulation.md#committed-state-typing-and-ownership) defines which values are accepted and how they are copied. Resources and RNG streams bind once during setup. Register cleanup immediately with `scene.defer()` or a resource cleanup argument.

For scene transitions:

1. Prepare initial and one-off candidates with `game.prepare(definition, { key, signal })`.
   Preparation acquires assets without creating or activating a world.
2. For repeated transitions, let the host call
   `game.candidates.ensure(owner.id, "pause", pauseDefinition, { key: "pause", retries: 1 })`.
   Obtain `owner` from `game.scenes`.
3. In a scene callback, take the ready handle with
   `game.candidates.take(owner.id, "pause")` and pass it explicitly to
   `ctx.scenes.push()` or `.set()`.
4. Abandon an unused raw candidate with `.release()`; it is single-use.

The slot refills after take and releases on owner removal, stop or disposal; see
the [candidate contract](contracts/simulation.md#candidate-slots).
Use `blocksUpdateBelow: true` for pause/menu scenes that suspend lower simulation
while preserving its rendered world.

## Assets, sprites and audio

For externally authored content, resolve the required room/animation/atlas graph in
the consumer first. Validate references and deduplicate definitions there, then use
`assets: [snapshot, image, audio]` (plus any other required resources) in the scene.
Reuse the same image definition across overlapping rooms. `game.prepare` completes
only after the browser host prepares the listed images; merely fetching atlas JSON
does not upload its texture. Keep the requesting owner's abort signal through both
resolution and preparation, and release a completed candidate if that owner has
departed. Format, URL and graph policies remain consumer-owned; see the
[referenced-content contract](contracts/browser-and-presentation.md#referenced-consumer-content).

Consumer documentation owns its asset list, retention configuration, resource-count
table and pause/retry workflow.

`imageAsset(id, url)` and `audioAsset(id, url)` return definitions for shared decoded data. List definitions in a scene's `assets`; setup receives a map of leased values keyed by stable IDs. `game.assets.acquire(definition)` gives a manually managed lease for platform setup. Release it when finished. The browser host uploads every listed image asset during preparation, and sprites refer to it by the same stable authored ID. Generated images use a custom `ImageAsset` loader:

```ts
const ships: ImageAsset = {
    id: "ships",
    kind: "image",
    load: () =>
        createImageBitmap(makeAtlas(), { premultiplyAlpha: "none", colorSpaceConversion: "none" }),
    dispose: (bitmap) => bitmap.close(),
};
// List `ships` in the scene's `assets`.

// In frame preparation: normalized UV coordinates, radians, center position.
frame.sprite({
    x: 100,
    y: 100,
    width: 24,
    height: 24,
    texture: "ships",
    u: 0,
    v: 0,
    uw: 0.125,
    vh: 1,
    layer: 2,
});
```

For audio:

- Call `await app.audio.unlock()` from a user gesture.
- During setup, create `app.audio.scene('room')` and immediately register its
  `.dispose` with scene cleanup.
- From systems, enqueue `scope.play({ frequency: 440, duration: .15 })` or
  `scope.play({ buffer, loop: true, volume: .2 })`. Requests flush after commit;
  never enqueue from render callbacks.
- Use `scope.volume(.5)` for an immediate level or `scope.fadeTo(0, 1)` for a
  one-second fade. Use `audio.duck(.25)` for the overall mix and `audio.duck(1)`
  to restore it.

The [audio contract](contracts/browser-and-presentation.md#audio-scopes-and-playback)
owns voice/request limits and cleanup failures. Starfall and the platformer lease
decoded looping music per gameplay scene alongside synthesized cues.

## Bounded decoded retention

For long-lived content consumers, opt in to decoded-cache limits through
`new BrowserGame({ ...options, assetRetention: { maxEntries: 32, maxBytes: 64 * 1024 * 1024 } })`.
Headless `Game` accepts the same option; direct services use
`new Assets({ retention: { maxEntries: 32, maxBytes: 64 * 1024 * 1024 } })`.
Omitting the policy preserves retention until disposal. Values still in use may
exceed these limits. Release every acquired lease, including dependency claims;
do not close a borrowed bitmap yourself. An evicted asset reloads on reacquisition.

Sample `app.game.assets.inspect(20)` and `app.renderer?.inspect(20)` on demand.
Use `protectedOverBudget` to distinguish a live working set from unused retention,
and `unknownSizes` to identify payloads excluded from byte estimates. Entry limits
also bound unknown-size entries. `trim()` applies configured limits;
`evict(id)` returns false for absent, loading or leased entries. Custom assets can
provide `estimateBytes(value)` and acquisitions may label a third argument
`"dependency"`; neither option creates a dependency registry. See the
[resource observation limits](contracts/ownership-and-inspection.md#resource-diagnostics)
before combining CPU and renderer totals.

## Entity lifetime and update order

Create schema components with `f32`, `f64`, `i32`, `u32`, `u8`, `bool`, and `entityRef` fields. Use `eachChunk()` for bulk work and `world.read()`/`write()` for sparse access. Numeric query views are writable typed arrays; boolean fields use `Uint8Array`, and entity references expose paired encoded index/generation arrays. Direct column writes follow typed-array coercion, while spawn and sparse writes validate values. Spawning and despawning are buffered: query membership changes only at the engine-owned commit after scheduled systems return. Entity composition is fixed at spawn; stale or foreign handles cannot address a different entity.

Chunk descriptors and component views are borrowed until the next world commit. A component view plus row may be retained across later queries in the same update, which supports spatial indexes. Clear and rebuild that derived cache before probing in the next update. Retained raw typed arrays cannot be revoked at runtime and must not be used after commit. `entityAt(row)` returns the canonical handle and accepts only live rows below `chunk.count`.

Systems receive `WorldAccess`, not commit or enumeration authority. For headless use,
create a `Game`, prepare/start a scene, then call `game.tick()`; the runtime owns world
commits. Direct `World` construction is internal. Component queries expose `size` and
`eachChunk`; `query()` with no components performs entity-only traversal.
[Starfall](https://github.com/that-webdev-dude/ngne/blob/main/demo/game.ts) and the [platformer](https://github.com/that-webdev-dude/ngne/blob/main/examples/platformer/game.ts) use schema components.

For diagnostics, read `game.scenes` and `game.enumerate()` after `game.tick()` returns;
both return detached read-only data, never live worlds or resources. Use explicitly
injected capabilities for gameplay writes. The
[inspection contract](contracts/ownership-and-inspection.md#public-inspection) defines what each
result contains and its limits.

Commit order is fixed by the [simulation contract](contracts/simulation.md#tick-commit-and-scene-command-failures). In practice: events emitted now become visible on the next ordinary update, frozen ordinary simulation retains events, and systems marked `runsDuringFreeze` can continue presentation effects.

## Lifecycle and ownership

| Operation                                                     | Meaning                                                         |
| ------------------------------------------------------------- | --------------------------------------------------------------- |
| `game.prepare(definition, { key, signal })`                   | Acquire scene assets asynchronously; does not publish a world   |
| `game.candidates.ensure(owner, purpose, definition, options)` | Keep one owner-scoped candidate ready for a repeated transition |
| `game.candidates.take(owner, purpose)`                        | Take once; refill while that owner remains mounted              |
| `game.candidates.release(owner, purpose?)`                    | Cancel/release one slot or every slot for that owner            |
| `app.start(candidate)`                                        | Start the browser host with its initial scene                   |
| `ctx.scenes.set(candidate)`                                   | Replace the entire scene stack at a tick boundary               |
| `ctx.scenes.push(candidate)` / `.pop()`                       | Change the scene stack at a tick boundary                       |
| `candidate.release()`                                         | Abandon an unused prepared candidate                            |
| `app.stop()` / `app.start()`                                  | Suspend and resume while preserving the mounted scene           |
| `app.dispose()`                                               | Terminal cleanup of owned services and scenes                   |

Bind resources, RNG streams and systems synchronously during setup. Register cleanup immediately with `scene.defer(() => service.dispose())`; the private mount owns rollback when setup fails. Do not add an alternative mount path or manually commit a scene world. Prepared candidates are single-use and belong to their preparing Game; stop invalidates unused candidates.

A `blocksUpdateBelow` scene suspends lower updates while retaining their rendering. Hitstop freezes ordinary systems for whole ticks. Render callbacks prepare presentation from committed state and must not drive gameplay, consume simulation RNG or enqueue sound.

`Game` supports headless simulation; `BrowserGame` adds input, rendering, audio and frame scheduling. A failed simulation enters `Failed`, where only disposal is supported. See [scene-command failures](contracts/simulation.md#tick-commit-and-scene-command-failures) and [startup rollback](contracts/browser-and-presentation.md#first-start) for their distinct behavior.

Await `app.start()` and `app.stop()` before issuing another start/stop call; overlaps reject. `app.dispose()` is terminal and may interrupt either operation. Use the browser host's lifecycle methods when it owns the Game. The [lifecycle contract](contracts/browser-and-presentation.md#platform-and-lifecycle) tabulates every overlap and cancellation case.

## Interpolation

- Spawn with previous and current coordinates equal. Before ordinary movement, copy current to previous; render with `lerp(previous, current, alpha)` using the alpha supplied to the render callback. NGNE snapshots the camera before ordinary systems.
- Teleport an actor by assigning both coordinates together, e.g. `p.px = p.x = x`; use `camera.cut(x, y)` for a camera cut. The two are independent; reset both axes when applicable.
- Register `scene.resetInterpolation(() => ...)` to copy ordinary current poses to previous. NGNE invokes it after mount commit and when freeze first activates, so a stale in-between pose is never rendered.
- Continuing effects own separate poses, copy them in a `runsDuringFreeze` system and stay outside the ordinary reset callback. They keep using the supplied alpha.
- Suspended scenes, and resumed scenes awaiting an update, receive alpha 1. Snapping rounds composed screen coordinates and never writes back to poses.

The [boundary table](contracts/browser-and-presentation.md#interpolation-and-discontinuities) defines what NGNE does at each discontinuity; `/validation.html` includes selectable transition frames.

### Scrolling camera and tile scenes

Keep authored tiles in a scene-owned `Uint8Array` copy. Inside `setup(scene)`, with authored `level` data and a scene-owned `player` position component, initialize the camera before the first render and register follow after movement:

```ts
import { clamp } from "@ngne/core";

// Inside setup; tile size 16, viewport width 480 logical pixels.
const tiles = scene.resource("tiles", level.tiles.slice());
const maxX = Math.max(0, level.widthTiles * 16 - 480);
scene.camera.x = clamp(player.x - 240, 0, maxX);
scene.system(() => {
    scene.camera.x = clamp(player.x - 240, 0, maxX);
});
```

The [camera coordinate contract](contracts/browser-and-presentation.md#camera-coordinates) defines the origin and mount cut. The [platformer](https://github.com/that-webdev-dude/ngne/blob/main/examples/platformer/README.md) adds vertical clamping, a horizontal dead-zone, visible-tile rendering and game-owned collision.

## Audio example

After unlocking audio from a click or other user gesture, list decoded clips as scene assets and register a scope inside setup:

```ts
const music = audioAsset("room-music", new URL("./music.wav", import.meta.url).href);

const room: SceneDefinition = {
    id: "room",
    assets: [music],
    setup(scene) {
        const sound = app.audio.scene("room");
        scene.defer(() => sound.dispose());
        sound.play({ buffer: scene.assets.get(music.id) as AudioBuffer, loop: true });
        scene.system(({ input }) => {
            if (input.pressed.includes("Space")) sound.play({ frequency: 440, duration: 0.15 });
        });
    },
};
```

The browser host flushes requests after simulation commit. Disposing the scene removes its queued and active voices before its asset leases release. Cleanup failures are aggregated and leave the scope terminal. For complete consumers, read [Starfall](https://github.com/that-webdev-dude/ngne/blob/main/demo/game.ts), its [browser entry](https://github.com/that-webdev-dude/ngne/blob/main/demo/main.ts), and the [platformer](https://github.com/that-webdev-dude/ngne/blob/main/examples/platformer/README.md).
