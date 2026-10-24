# T2 Codex read-only review

REQUEST CHANGES — one P2 blocker. Reviewer Codex gpt-6.1-sol/xhigh.

- player-fx-model.ts:190 caps beam core at5px; player-fx.ts:103 draws it. Spec codeDrawn.beamLane requires6px. Restore6 with deterministic half-pixel centering bias so all edges remain whole pixels inside unchanged15/13px lanes. Pulse positions derive from actual core bounds. Test both widths, integer/fractional centers, exactly6core columns, unchanged lane bounds, integer edges and calm statics; current5px assertion codifies mismatch.
- Live73/73tests and typecheck pass.114/114art unchanged. Compared exact acceptedT1 baseline, no additional gameplay changes beyond approved muzzle geometry. Large-kill freeze/shake/sound unchanged. Tests cover damage/death timing, fixed nova origin,11frames560ms,sparse pixels/no fade-3,cue priority,16lossless needle directions. Real engine0.3 confirms upload limit guard and late cancellation disposal.
- T5 tracked: mine below minelayer hull, remove obsolete asset claims/font shim. Shared derivedImageAsset close-on-error hardening needs throwing-canvas cleanup check. Not a new T2 delta.
- Spec/README neutral-return wording differs; implementation follows immediate start toward neutral. Presentation table supersedes older nova/HUD prose. DECISION2 approves muzzle coverage changes.
- No writes/commits/memory/servers/browser/subagents; commands complete. Build checked implementer log, no build rerun. No browser/GPU/device/dense-play/human acceptance.
