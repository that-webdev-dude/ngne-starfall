# Rev01 integration evidence

Implemented on `codex/starfall-rev01-integration`. Main remains `840fc0a1d518240e8e1bbd0e0ad1af99c4fd420d`; supplied art hashes are preserved. The commit includes the supplied approved README/spec decisions required by the integration, without modifying their bytes.

- Native rev01 sprites/backgrounds, 640×360 device-pixel integer scaling, approved spatial/radius/socket geometry, player effects/nova, enemies/boss parts, font/HUD/menu/screens integrated. Legacy rasters/loaders/metadata removed; audio unchanged.
- 108 tests and production build/typechecks pass. Seeds 17/41/83 clear all three stages: 9/9, identical to the accepted combined implementation. Independent ticket reviews and all focused fixes accepted.
- Browser evidence: 30 required plus 38 supplemental captures, verified image dimensions and states, two native PNG exports, production-bundle smoke and normal-stage/menu input smoke. Images and detailed state/hash metadata are gitignored in `.test-output/integration/`; compact results are in [browser-summary.json](browser-summary.json) and [T5-automated.json](T5-automated.json).
- [Visual comparison and limits](../../docs/rev01-integration/BROWSER-REVIEW.md), [owner play cards](../../docs/rev01-integration/MANUAL-CHECKS.md), [decisions/cost ledger](../../docs/rev01-integration/DECISIONS.md).

Owner acceptance (24 Oct 2026): gameplay feels good enough for this iteration; graphics look much better and appear correctly replaced. Owner authorized committing the integration. This does not establish completion of every physical-device check: each stage at 2x and 3x with reduced motion off/on, real Windows/DPR scaling, gamepad and audio. Browser presets are labelled seeded presentation, not ordinary-rules reachability. Nonfatal dropped-tick diagnostics are retained; no performance claim.

Existing limitations: pause taps during Nova hit-stop can be missed in both baseline and integration; faint HUD text can show through the modal footer; some boss cues still use code/existing-pixel composites. Historical `sample_colors.py` expects deleted legacy inputs. No new art was required. Plasma charging, tall mode and further title redesign remain outside this integration.

A formatting-only spec rewrite before T5 was restored after semantic/hash guards; final original art bytes match exactly. The audit records this explicitly.

The task browser tab and its two loopback test servers were closed after verification. Start the server using the owner-card commands for play checks.
