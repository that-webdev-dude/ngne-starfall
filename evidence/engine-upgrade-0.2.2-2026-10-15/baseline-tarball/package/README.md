# NGNE

A TypeScript engine for retro 2D games, with WebGPU rendering and zero runtime dependencies.

> **Experimental release.** NGNE is an early-stage engine for retro 2D games.
> APIs may change between releases. Pin an exact version and review changes before
> upgrading.

[Play Starfall '89](https://that-webdev-dude.github.io/ngne/) · [Engine guide](https://github.com/that-webdev-dude/ngne/blob/main/docs/guide.md) · [First scene](https://github.com/that-webdev-dude/ngne/tree/main/examples/hello)

![Starfall '89, a game built with NGNE](https://raw.githubusercontent.com/that-webdev-dude/ngne/main/docs/assets/starfall.png)

## Engine capabilities

- Fixed-step simulation and scene-owned entity/component worlds.
- Instanced WebGPU rendering for sprites, with cameras and render interpolation.
- Scene preparation, transitions and resource cleanup.
- Image assets, browser input and scoped audio.
- An installed sprite and animation previewer using the engine's renderer.

NGNE supplies the engine as ESM with TypeScript declarations. You own the application
setup, assets and game logic, including movement, collision and progression.

## Install

For registry installation, pin an exact version in your application:

```sh
npm install --save-exact @ngne/core@0.2.1
```

Normal releases use `latest`; prereleases use `next`. Pin the version and commit
your lockfile; upgrade deliberately as the experimental API evolves. Use Node.js
24 or newer for package tooling (`npm.cmd` in Windows PowerShell).

Upgrading from `@that-webdev-dude/ngne`? See the
[migration steps](https://github.com/that-webdev-dude/ngne/blob/main/docs/guide.md#migrate-from-that-webdev-dudengne).

For unpublished local packages today, follow the
[local installation guide](https://github.com/that-webdev-dude/ngne/blob/main/docs/guide.md#install-a-local-package).

## First scene

Add a `<canvas></canvas>` to your page and run this from your application's TypeScript
module. Serve it over HTTPS or localhost in a WebGPU-capable browser; the example
uses top-level `await` and draws a square at the center of a 320 × 180 canvas.

```ts
import { BrowserGame } from "@ngne/core";

const canvas = document.querySelector("canvas");
if (!canvas) throw new Error("Canvas missing");

const app = new BrowserGame({
    canvas,
    width: 320,
    height: 180,
    seed: "first-scene",
    state: {},
    transition: (state) => state,
    diagnostic: console.error,
});

window.addEventListener("pagehide", () => void app.dispose().catch(console.error), { once: true });

try {
    const scene = await app.game.prepare(
        {
            id: "hello",
            setup(scene) {
                scene.render((frame) => frame.rect(160, 90, 16, 16, 0xffffff));
            },
        },
        { key: "first-scene" },
    );
    await app.start(scene);
} catch (error) {
    console.error(error);
}
```

Draw positions are centers in logical pixels. In an application with its own mounting
lifecycle, await `app.dispose()` when removing the game. The
[complete hello example](https://github.com/that-webdev-dude/ngne/tree/main/examples/hello)
shows startup, diagnostics, image loading, ECS movement and interpolation. See the
[guide](https://github.com/that-webdev-dude/ngne/blob/main/docs/guide.md) for TypeScript
and build settings, scene lifecycle and asset ownership.

## Inspect sprites and animations

The package includes `ngne-preview`, a local tool for inspecting frames and animation
timing through the installed engine's WebGPU renderer.

Create `preview.config.mjs` beside your application's `package.json`, using the
[adapter example](docs/guide.md#sprite-and-animation-inspection).
Your application supplies local images, frame rectangles and animation timings.
Add this npm script:

```json
{
    "scripts": {
        "preview:assets": "ngne-preview ./preview.config.mjs"
    }
}
```

Run `npm run preview:assets` and open the printed local URL. The previewer requires
Node 24+ and a WebGPU-capable desktop browser; it has no Vite dependency. Restart
the previewer and reload the page after changing artwork or metadata. Ctrl+C stops it.

## Status and platform support

NGNE is experimental. Public APIs and behavior may change during `0.x`; a default
release does not imply a `1.0` stability commitment.

Rendering requires WebGPU with hardware acceleration on a secure origin (HTTPS or
localhost). Browser Web Audio, fetch and image decoding are also platform requirements;
audio playback requires a user gesture.

The documented desktop validation envelope is **Chrome 152 on Windows 11**, with
**Intel UHD (`gen-12lp`) or NVIDIA RTX 4060 Laptop graphics**, using **keyboard and
mouse**. Other browsers, operating systems, GPUs and physical touch/gamepad operation
remain unverified. CI's SwiftShader checks provide software WebGPU evidence, separate
from physical-device validation. These existing observations do not establish new
physical-device acceptance for `0.2.1`.

## Documentation and examples

- [Engine guide](https://github.com/that-webdev-dude/ngne/blob/main/docs/guide.md) — installation, scenes, assets, input and audio.
- [Architecture](https://github.com/that-webdev-dude/ngne/blob/main/docs/architecture.md) — runtime structure and ownership.
- [API and runtime contracts](https://github.com/that-webdev-dude/ngne/blob/main/docs/contracts/NGNE.md) — precise semantics.
- [Hello example](https://github.com/that-webdev-dude/ngne/tree/main/examples/hello) — a small first scene.
- [Platformer example](https://github.com/that-webdev-dude/ngne/blob/main/examples/platformer/README.md) — a two-level game and its controls.

## Contributing

Keep changes focused and game-specific behavior in games. Read the
[repository rules](https://github.com/that-webdev-dude/ngne/blob/main/RULES.md) and
[development and verification guidance](https://github.com/that-webdev-dude/ngne/blob/main/tooling/README.md)
before contributing. Include reproduction steps for bugs and relevant checks for fixes.

## License

[MIT](https://github.com/that-webdev-dude/ngne/blob/main/LICENSE), including the engine
and original showcase assets.
