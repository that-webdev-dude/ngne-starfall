# Owner play checks

The development launcher is implemented. Run these after the orchestrator's browser checks and source review. They check physical display scaling, input/audio feedback and human play feel that the bot and screenshots cannot establish.

Start the development server once:

```powershell
Set-Location C:\Users\jfabi\Documents\Projects\tests\ngne-starfall
npm.cmd run build
npm.cmd run dev -- --port 5173 --strictPort
```

The development-only `manual=1` launcher starts the selected production stage at its normal beginning, with sound enabled after the first canvas key/pointer interaction, normal controls and unmodified clocks/HP/rules. Use a browser content area of 1280x720 device pixels for 2x, or 1920x1080 for 3x. At Windows display scaling, CSS pixels differ from device pixels: confirm status `READY`, setup `NORMAL RULES / ordinary stage beginning`, `backing: [640,360]`, your `dpr`, actual `css` dimensions and `k: 2` or `k: 3`. H hides/restores this diagnostic panel; hide it before judging play. O exports current native pixels as PNG. `capture=1` also hides diagnostics. Under-sized windows clip instead of shrinking. Test a physical gamepad if available and report unavailable separately.

Each card below covers four runs: k=2/calm=0, k=2/calm=1, k=3/calm=0, k=3/calm=1. To restart a stage directly with calm enabled, change its URL to `calm=1`. The selector's PLAY STAGE button also launches an ordinary stage; LOAD PRESET instead seeds presentation state and must not be used for these play checks. Fixture controls sit outside the game canvas.

CHECK 1 — Orbital Breakwater at 2x and 3x, motion on and off ~12 min

Why: screenshots and a prediction bot cannot judge readable threats, physical input or handling.

Setup (open after starting the server):

`http://127.0.0.1:5173/tests/browser-integration.html?stage=1&manual=1&calm=0`

Steps:

1. Confirm the displayed scale is k=2. Move with WASD/arrows, hold Space, use B, and test banking, damage and repairs through the waves and Gatebreaker.
2. Press Escape, open SETTINGS, switch REDUCED MOTION on, return to RESUME FLIGHT and repeat overlapping fire/Nova/damage cues. Check CONTROLS and the result screen.
3. Repeat at k=3, first with reduced motion off and then on. Use the gamepad's left stick/X/A/Start through the same actions if available.

Expected:

- Crisp, even pixels; clear bars/letterboxing; readable text and stage card; stable player core, exhaust and muzzle joins in every pose.
- Shots and lanes remain readable over HUD/Nova/explosions; turrets show firing and disabled states; no visible hitbox surprises. Primary firing cadence and movement feel acceptable.
- Reduced motion replaces flashing/pulsing with understandable static cues. Pause and result controls respond at their visible rectangles.

Reply: "1 pass: k2/off,on; k3/off,on; DPR <n>; gamepad pass/unavailable", or "1 fail: <scale, motion setting, step, what you saw>".

CHECK 2 — Furnace Belt at 2x and 3x, motion on and off ~12 min

Why: the assembled moving Kiln chain, its collision feel and lower-flash presentation need human play.

Setup:

`http://127.0.0.1:5173/tests/browser-integration.html?stage=2&manual=1&calm=0`

Steps:

1. At k=2 with reduced motion off, play the waves and Kiln Serpent. Shoot sections, use Nova around mines/lanes, and inspect the head, links, damaged phase and destroyed section husks.
2. Use Escape -> SETTINGS -> REDUCED MOTION, resume and repeat with it on. Inspect pause, card and result readability.
3. Repeat at k=3 with reduced motion off and on. Repeat movement/fire/Nova/pause on a physical gamepad if available.

Expected:

- Dim scenery leaves threats legible; mines/pickups and beam warnings have clear silhouettes.
- Kiln rotation and couplings read consistently; chain motion avoids the approved under-34px overlaps; a destroyed husk has no collision or fire. Head movement and attack pacing feel unchanged apart from the approved geometry/radii.
- HUD, stage/result plates, low-hull cue and calm substitutes remain understandable at both scales.

Reply: "2 pass: k2/off,on; k3/off,on; DPR <n>; gamepad pass/unavailable", or "2 fail: <scale, motion setting, step, what you saw>".

CHECK 3 — Midnight Citadel at 2x and 3x, motion on and off ~12 min

Why: dense final-boss overlap and real input/display behavior cannot be accepted from stills.

Setup:

`http://127.0.0.1:5173/tests/browser-integration.html?stage=3&manual=1&calm=0`

Steps:

1. At k=2 with reduced motion off, play to the Starfall Engine; destroy emitters, cross phase thresholds, and combine primary fire/Nova with lanes and damage effects.
2. Turn REDUCED MOTION on through pause SETTINGS and repeat the dense patterns. Check low hull, disabled emitters, defeat and THE SKY IS YOURS result plate.
3. Repeat at k=3 with reduced motion off and on, including physical gamepad actions if available.

Expected:

- Engine phases retain their damage while surging; emitters attach and fire from their sockets; disabled machinery stays visually distinct.
- Threat cores, beam lanes and the player core stay readable over effects and HUD. No uneven scaling or texture seams appear at either scale.
- Calm cues remain readable without blinking; movement/aim timing, audio feedback, pause and final result feel acceptable.

Reply: "3 pass: k2/off,on; k3/off,on; DPR <n>; gamepad pass/unavailable", or "3 fail: <scale, motion setting, step, what you saw>".

## Decisions outside this integration

- Plasma hold-to-charge control, damage/resource/boss rules remain undecided; the bar is empty and the mechanic is excluded.
- Optional 16:10 tall mode and further title-screen redesign remain excluded.
- Record any new art problems here during final verification; do not edit the supplied pack.
