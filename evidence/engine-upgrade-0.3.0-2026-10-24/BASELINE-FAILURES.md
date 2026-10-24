# Existing test failures before the NGNE 0.3.0 migration

Date: 24 October 2026. Base: `e288ffe837582bc0e3a1d79628781f1eafd1fae1`.
Branch: `dev/ngne-030`. Baseline installed engine: exact `@ngne/core@0.2.2`.

The baseline has 39 tests: 37 pass and 2 fail. Both failures are in
`tests/motion.test.ts`, which imports local movement code and configuration rather
than NGNE. They were reproduced before changing the dependency and are outside
this migration's scope. No test, movement code or tuning value was changed.

| Test | Existing failure |
| --- | --- |
| release glides a visible but short distance, then settles exactly | The integrated glide exceeds the test's less-than-16-pixel ceiling with the current movement tuning. |
| full-speed reversal overshoots less than three pixels | After 10 frames velocity is -155; the test expects -175. |

See `baseline-tests.log` for assertions and stack traces and `baseline-checks.json`
for the complete counts. Typechecking and production build pass on this baseline.
All three normal-rules headless campaign seeds (17, 41, 83) clear all three sectors
without diagnostics. Headless runs use stub sound and empty fixture assets.

For migration acceptance, require the same failure names/counts and no new failing,
skipped or cancelled tests, plus unchanged campaign results and browser checks.
The overall unit suite remains failing until the movement behavior and its intended
acceptance limits are reconciled in separate work.
