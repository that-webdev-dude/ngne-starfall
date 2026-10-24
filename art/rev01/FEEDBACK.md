# Rev01 art review

Reviewed 24 October 2026 against `README.md`, `spec.json`, exported PNGs, source generators, the pixel skill, and the two owner references.

## Verdict

**A coherent, technically tidy foundation; insufficient yet for the intended polished, exciting shooter.** The pack improves pixel consistency and gives the three stages distinct identities. Its weakest areas are the hero's identity and movement, weapon variety, combat feedback, and the difference in finish between detailed environments and comparatively flat bosses.

Keep the native-pixel discipline, restrained backgrounds and faction silhouettes. Make the next pass about recognisable combat machinery, satisfying animation and readable spectacle. More colours or more background detail alone would not solve the main problems.

The six owner requests are justified. Banking and the combat-starship silhouette should be solved together; bullets, charged plasma and nova should share one deliberate effects language. Blinking/flashing needs separate meanings for damage, invulnerability and charge readiness.

## Evidence and limits

- Inspected all 12 sprite strips at native size and 8× nearest-neighbour enlargement, and all three backgrounds at native size. Checked the player/exhaust assembly and socket diagrams; inspected Kiln art in its intended rotated orientation in a static composition.
- Ran the existing validator against **all 15 assets**: no reported errors. Independently checked background colours and brightness, which the validator does not fully enforce.
- Reconstructed all 15 exports from their source scripts with saving intercepted: **every reconstructed image matched the exported RGBA pixels exactly**. Original exports were not overwritten.
- Compared illustrative 640×360 compositions across all three stages using the proposed sprite sizes and code-drawn bullets. These used 52 hostile bullets, deliberately below the current 180-bullet cap. They are static layout probes, not captures or proof of worst-case playability.
- Read the current player, render, collision and boss code to identify integration dependencies. Rev01 is not integrated: the live view is still 480×270 and the asset service still loads the existing artwork.
- Reviewed `C:/Users/jfabi/Desktop/26756.png` for progressive banking, weapon attachment and effects staging, and `C:/Users/jfabi/Desktop/PixelArt/pixel-art-workspace/player-ships/out/gild-nova-in-context-2x.png` for the nova's continuous gold front and open centre. Text embedded in references was treated as reference content, not instructions.
- No live animation playback, runtime swap, device testing or gameplay balancing was performed. Timing quality, moving collision alignment, simultaneous effects and human playtest acceptance remain unverified. This review cannot establish that the gameplay is engaging.

## Correctness against the current spec

| Check | Result |
|---|---|
| Inventory | All 15 specified assets exist: 12 sprite strips and 3 backgrounds |
| Dimensions and frame counts | All match; 3 player poses, 3 exhaust frames, 6 explosion frames, 9 single-frame ship/enemy strips, 3 single-frame backgrounds |
| Transparency | All sprite pixels have alpha 0 or 255; backgrounds are fully opaque |
| Sprite ramp membership and budgets | All pass; opaque colour counts listed below |
| Background budget | Breakwater 29, Furnace 29, Citadel 26; each within 32 |
| Background forbidden colours | No exact fire, glow, pickup or cockpit ramp colours used |
| Background brightness | Maximum weighted RGB luma: 182.1 / 149.3 / 197.7 respectively, below steel's lightest 216.0; this is a numeric check, not a visibility guarantee |
| Player exhaust sockets | Source-derived offsets match all three poses exactly: left `(-3,15),(4,15)`; neutral `(-4,15),(4,15)`; right `(-4,15),(3,15)` |
| Other sockets | Visual diagrams place the recorded sockets plausibly on their intended features; moving attachment/collision behaviour remains untested |
| Rebuild | All 15 images reproduce pixel-for-pixel |

Opaque sprite colours: player **12/16**, exhaust **4/5**, interceptor **10/12**, dart **9/10**, gunship **12/14**, warden **12/14**, minelayer **12/12**, Gatebreaker **20/24**, Kiln head **14/20**, Kiln segment **10/14**, Starfall Engine **14/24**, explosion **6/6**. Unused budget is not a defect; add colours only when they clarify a form or state.

### Corrections and omissions to record

1. **Approval status needs qualification.** README says all assets are “validated and approved.” File validation is reproducible; this inspection did not establish the provenance or scope of that approval. Record who approved which revision and whether it covered stills, animation or gameplay. This review identifies further owner-requested revisions.
2. **Starfall Engine screen-share entry is inconsistent.** README defines boss share by width, but calls 143×111 “31%”: width is **22.3% of 640**, while height is **30.8% of 360**. Its previous 104×81 was 21.7% width / 30% height. The intended prominence is broadly preserved; the label needs correcting.
3. **Explosion debris reaches the lower canvas edge.** Frames 3 and 4, zero-based, contain pixels on row 30: columns 19–20 and 19–22 respectively. That is not automatically invalid, but leaves no margin and risks an apparent crop as debris moves. Inspect playback, then redraw those pieces inside the canvas or explicitly enlarge/re-anchor the effect if needed.
4. **The validator checks export structure, not completeness or art quality.** It does not enforce socket alignment, source/export equivalence, background forbidden ramps/brightness, collision fairness, state readability, or runtime layering. An invocation without asset arguments checks only the spec. Its “OK” is a limited result.
5. **Important production metadata is absent.** Player primary muzzles are not specified; neither are charged-plasma attachment points, new visual states or nova data. The README already notes undersized destroyed-turret/emitter overlays; these still need authored replacements or verified procedural masks that cover the final housings.
6. **Some brief rules restrict the desired result.** “Keep the outline identical” except the wing discourages convincing whole-body banking. “Keep bullets in code and only change sizes” excludes the requested weapon vocabulary. Revise those instructions in a later agreed brief. Code rendering itself is compatible with polished effects.
7. **Display edge cases remain unspecified.** The integer-scale formula can yield zero below 640×360 while also requiring `k >= 1`; define the small-window policy. The Deck font-size statement explicitly remains unverified in the README and should not be used as an acceptance criterion.

The new charged weapon, nova artwork and additional player states are **scope additions to rev01**, not missing deliverables under its current 15-asset inventory. Most ordinary enemies and all bosses having one frame also complies with that inventory; it is still too narrow a presentation brief for the desired final game.

## Priority 1: player identity and banking

**Where:** `sprites/player.png`, all poses; long pointed nose, swept triangular wings, canopy and wing highlights.

- **Assessment:** the aircraft reading is strong. The neutral pose resembles a small jet; the banks mainly shorten/darken one wing and brighten the other while retaining much of the central profile. The nozzle movement is correct, but the ship does not convincingly roll as one solid object.
- **Direction:** build a compact combat spacecraft with a shorter armoured prow, recessed cockpit, substantial engine pods, visible weapon housings and negative spaces between hull sections. Keep the blue/cyan faction identity and a small warm cockpit accent. Aggression should come from mass, silhouette and weapons, not extra spikes or isolated bright pixels. This is an art-direction choice, not a universal pixel-art rule.
- **Banking:** use the attached sheet's progressive change in apparent volume. Show the raised pod's top surface, the lowered pod's side/underside, canopy displacement, hull overlap and a narrower extreme silhouette. Do not simply rotate or horizontally squash the neutral bitmap. Re-light each pose consistently.
- **Proposed production target:** **7 input-selected poses**: neutral plus shallow, medium and hard bank on each side. Use the same 31×33 canvas and `(15,16)` pivot initially; if the armoured silhouette cannot read within it, compare larger native-size samples in context before changing the budget. The neutral hull currently occupies 31×31; canvas size alone overstates visible height.
- **Timing proposal:** traverse adjacent pose levels in roughly 40–65 ms while input changes, with a responsive return to neutral. These are input states, not an endlessly played seven-frame animation; movement must respond immediately. Final thresholds/timing need playback.
- **Anchors:** record exhaust and primary/plasma muzzles for every pose. Keep the gameplay pivot/core fixed; visible canopy and pods may move around it. Check neutral → extreme → reversal with exhaust and firing active.

**Accept when:** the silhouette reads as an armed spacecraft at 1×; left/right banks convey a solid rolling hull; no muzzle or flame detaches or jumps. Approve this before multiplying damage/charge variants.

## Priority 2: projectile vocabulary and ownership

**Where:** `spec.json → codeDrawn`; current `src/systems/combat-render.ts` bullet drawing.

Player shots and hostile bullets already differ in shape, so they are not completely indistinguishable. However, the proposed design remains a cream 3×11 bar versus a 9×9 square with a bright centre. Colour changes give hostile patterns some distinction, but little identity or information about weapon behaviour.

| Role | Proposed visual language | Initial native-size study |
|---|---|---|
| Primary player fire | Narrow cyan/white lance, pointed head, short fading tail | 3×11 footprint |
| Charged player plasma | Broad cyan/teal capsule with a hot centre, turbulent edge and trailing energy | 15×23 core canvas; trail separate |
| Ordinary hostile fire | Coral/pink round bead with dark separation rim | 9×9 footprint |
| Aimed fast hostile fire | Red/orange needle or arrowhead with clear direction | 5×13 canvas |
| Heavy hostile plasma | Magenta/pink orb or diamond, visibly distinct from the player's elongated plasma | 13×13 canvas |
| Beam hazard | Stable bright lane with a distinct pre-fire warning | Width follows agreed collision geometry |

These sizes and colours are proposals. The cyan player ramp would require an explicit effect-ramp allocation; do not silently recolour existing hull ramps. Keep hostile colours within one recognisable family, with shape reinforcing ownership in greyscale. Assign shape to behaviour consistently rather than choosing a random sprite per shot.

Keep dangerous bullet cores above hulls, smoke and decorative debris. Make trails subordinate to the core, and document visible damage bounds separately from glow. Test overlaps with player fire, the Citadel palette, a nova and several explosions. More bullet shapes should communicate threats, not imply new behaviours that the game does not implement.

**Accept when:** a player can immediately identify which shots to dodge during movement and effects, including when colour is reduced. More variety must not reduce that clarity.

## Priority 3: nova

**Where:** absent from rev01; current runtime draws 56 expanding square particles plus a flash.

The owner's gold-ring reference provides a much stronger direction: a continuous, thick, white-hot front, gold/orange body, hollow centre and a broken dissipating edge. Its visual weight communicates a screen-clearing action. The current sparse square ring does not provide that weight.

- Produce a short ignition/compression cue, rapid coherent expansion, then thinning fragments and embers. Start from a clean, hand-corrected circular contour; avoid regularly spaced dots or a uniformly soft halo.
- Keep the interior largely transparent so player position and surviving hazards remain visible. Use a brief local flare rather than relying on a prolonged filled-screen flash.
- **Proposed timing:** 2 ignition frames at 40 ms, 6 expansion frames at 50 ms, 4 dissipation frames at 60 ms: **12 authored frames / 620 ms**. This is a project proposal, not a book requirement. Expansion starts promptly; art anticipation must not silently delay the existing bullet-clear/damage event.
- Deliver baked native-pixel frames with a fixed origin and explicit ring radii/bounds. Derive the required largest radius from all legal player origins to the farthest visible corner; a ring sized only for the screen centre may leave a corner unreached. Avoid scaling one tiny ring into a large uneven contour.
- Specify where the nova sits relative to hostile cores and the HUD. Show the attack clearly without hiding threats that remain or reappear. Provide a quieter alternative with an equally clear activation/clear cue when reduced motion/flashes are selected.

Borrow the reference's continuous front and staging. Match Starfall's palette and pixel density rather than copying its full reference imagery.

## Priority 4: charged plasma secondary

**Where:** new art and gameplay scope; current `combat-player.ts` uses held fire for repeated primary shots every 0.14 s and has no charge state.

Support the owner's hold → charge → massive plasma shot. The weapon needs a visible build-up, a ready state that can be held without ambiguity, a substantial launch and a different impact from normal fire. A large coloured circle alone will not convey the promised power.

**Recommended control proposal:** keep primary fire running while held; accumulate plasma charge; release a fully charged hold to launch the secondary. Releasing early produces no plasma. Start testing around **0.9 s charge**, then decide damage, cooldown/resource cost and boss interaction through play. This proposal preserves current primary responsiveness but adds damage potential that must be balanced. Full-charge automatic discharge is a separate control option, not assumed here.

Art studies to request:

- Three charge levels gathering energy toward the plasma muzzle; each readable on every bank pose.
- Two ready-pulse frames, a two-frame muzzle discharge and a four-frame projectile loop.
- A six-frame plasma impact with a hot contact burst and expanding fragments, distinct from the ordinary orange explosion.
- An on-ship ready cue and HUD charge indication; the player must not have to stare at the HUD while dodging.

Those are **17 effect frames** across five effects, separate from the seven ship poses. Prefer baked effect strips plus per-pose attachment data supported by the consumer; use a runtime compositor only if deliberately adopted. Check every combined pose in context. A large visual core requires an agreed collision shape; decorative glow must not promise damage outside the actual area.

**Accept when:** charging remains readable while dodging, release timing is predictable, the launch feels substantially heavier than primary fire, and the shot does not obscure incoming threats. Piercing, splash and damage numbers remain design decisions, not art-review conclusions.

## Priority 5: blinking and flashing player states

**Where:** no authored state variants in rev01. Current runtime already alternates player/exhaust opacity during invulnerability while keeping a bright core marker.

Give each cue a single meaning:

- **Damage:** one brief high-value hull flash, followed by the invulnerability cue. Author a flash equivalent for each of the seven bank poses, or define a tested material remap; colour multiplication alone cannot reliably turn dark hull pixels into a bright flash.
- **Invulnerability:** deliberate bright/dim alternation with the core/pivot still locatable. Avoid a completely invisible ship during dense combat. Runtime visibility modulation can provide blinking without duplicating identical PNG frames.
- **Charge:** energy gathers specifically at the weapon; the ready pulse stays local. It should not resemble being hit.
- **Low hull:** a persistent small warning/emissive or HUD signal, distinct from the temporary damage state. Optional engine sputter should not imply unreliable movement unless intended.

If baked, the proposal is **7 base poses + 7 flash counterparts**, not seven copies of every possible combined state. Composite charge effects are checked against all poses. Define cue priority when hit, charging and invulnerable overlap; damage takes immediate precedence, while charge readiness remains visible at its muzzle. Reduced motion/flashes need persistent substitute cues. Final cadence and intensity require playback and accessibility review; increased strobing is not the polish target.

## Other visual findings

| Asset / region | What works | Problem and concrete next pass |
|---|---|---|
| Player wings, rows roughly 14–25 | Crisp clusters; restrained ramp count | Long parallel silver/cyan edge bands emphasise thin swept wings. Shorten highlights and shade armour planes by orientation; clean repeated parallel stepping where it reads as banding rather than a bevel. |
| Interceptor / Dart | Small red silhouettes are distinct; Dart's narrow profile suggests speed | Mostly static and mechanically simple. Add a small engine pulse or firing cue before adding surface detail; ensure Dart remains visible against Furnace edges. |
| Gunship / Warden / Minelayer | Strong role shapes: paired guns, pointed wings, square machinery | Metal/brass accents are useful. Give each one functional action: recoil, charge vent, or mine-release opening. Preserve their silhouette differences and separate active apertures from decorative lamps. |
| Gatebreaker, broad navy side plates and red braces | Paired turrets and central reactor are excellent readable landmarks | Large constant-value plates and repeated bevels read as a flat diagram beside the environments. Add a few large stepped armour planes, overlap/contact shadows, recessed mechanisms and selective specular edges. Avoid filling blank plates with random rivets. Make turret fire and destruction visually consequential. |
| Kiln head / segment | Industrial orange, hazard panels, drill and cutters give it a clear identity | Review as an assembled moving chain after −90° rotation. Add cutter/drill motion and coupling compression; confirm no gaps or overlaps during turns. The source already accounts for rotated lighting: preserve that work. A separate head still does not prove a convincing serpent. |
| Starfall Engine, purple wing panels and emitters | Strong finale silhouette, identifiable core and three emissive nodes | Broad lavender planes and mechanical symmetry feel less developed than the Citadel setting. Deepen layered armour, make emitter housings visibly functional and show phase/disabled states. Purple-on-purple forms lose separation around the upper Citadel silhouette; use controlled value/material differences before boosting all brightness. |
| Explosion, especially fireball and breakup | Clear hot-to-cool ramp; distinct ignition, peak and fragments | The single 31×31 effect is useful for small kills, not the whole destruction vocabulary. Add separate hit sparks, heavy-enemy breakup and staged boss destruction. Inspect bottom-edge debris noted above and motion continuity between frames 2–4. |
| Exhaust | Good connected flame shapes; clean white/cyan core | Shape primarily lengthens. Add a little lateral/asymmetric flicker and a response to thrust/charge where useful. Preserve the verified nozzle join and draw it below the hull. |
| Breakwater | Best immediate setting read: planet plus industrial framing | Planet clouds and rim can compete behind the boss. Tune contrast locally in the boss entrance area; keep the open centre. |
| Furnace | Convincing warm machinery and asteroid material | The darkest centre feels comparatively inert, but brightening it globally would weaken bullets. Add sparse, dim moving depth cues or occasional environmental events; keep orange hazard-like accents restrained. |
| Citadel | Strongest atmospheric identity; excellent architectural silhouettes | Repeated terraces and window rhythms are visible at the edges. Break a few large structural repetitions and calm the luminous portal when it overlaps the boss. Distinguish scenery from collidable forms through consistent depth and contrast. |

The pack is generally crisp, with no pervasive soft fringe or uncontrolled colour proliferation. I would not label it broadly pillow-shaded: hulls mostly have intentional lit upper edges and darker undersides. The larger issue is insufficient variation of planes/material response, plus some parallel edge bands. Emissive fireballs and reactor cores can legitimately be brightest at their centres.

## Scope needed for a polished game

- **Combat state coverage:** spawn/arrival, telegraph, firing/recoil, damage, disabled part and death. Begin with player + one ordinary enemy + one boss; do not multiply decorative idle loops across the whole inventory first.
- **Threat hierarchy:** keep the player core, hostile cores and dangerous beam lanes identifiable through explosions, nova and charge effects. More chaos should come from readable overlapping patterns and responsive consequences, not more simultaneous screen whitening.
- **Presentation coverage:** rev01 does not specify the final HUD/font, weapon charge display, pause/options, stage transitions or victory/game-over treatment. These need to belong to the same visual system. They cannot be assessed as finished from this pack.
- **Environmental motion:** the backgrounds are flattened images. Independently moving architecture/planet/atmosphere would require explicitly separated layers and coverage beyond camera movement, rather than assuming a static PNG supplies parallax. Keep the current backgrounds as usable still compositions.
- **Gameplay evidence:** art can make targeting, dodging and feedback clearer; engagement still depends on encounter pacing, enemy combinations, weapon trade-offs and recovery windows. Validate those in a representative playable slice with audio, not a sprite-sheet approval alone.

## How to use this

1. **First produce:** one redesigned neutral player and the hardest left/right bank, primary/hostile/plasma projectile studies, and a short nova study, on all three backgrounds at native size. Approve silhouette and hierarchy before completing all seven poses and state variants.
2. **Then produce:** complete banking/anchors, damage/charge effects, one animated ordinary enemy and one boss with telegraph/firing/destruction states. Carry that approved treatment across the remaining assets.
3. **Two routes:** hand this feedback and the existing spec to a pixel artist for revision and hand polish; or use explicit palette-index grids/source scripts to create candidates, render them and hand-polish after inspection. The pixel skill's small ramps, clean contours, form-based shading and frame continuity guide the craft; the proposed counts, sizes and timings here are Starfall choices.
4. **Consumer integration owns:** input/charge behaviour, animation selection/timing, frame metadata, per-pose anchors, collision shapes, effect ordering, reduced-motion alternatives and the proposed viewport migration. None of those were implemented by this review.
5. **Acceptance:** review motion at 1× plus integer display scales, then play representative dense combat on every stage with primary fire, charge, nova, damage flashing, boss cues and explosions overlapping. Verify stable core/anchors, matching visible threats and collisions, understandable destruction states, and an accessible lower-flash presentation. Export validation and static mockups remain separate evidence.

Decisions still needed: the final combat-starship silhouette; charged-fire release policy and primary-fire interaction; plasma damage/resource rules; final motion/effect intensity; and whether the proposed 640×360 presentation is accepted in play.

## Review artefacts

Supporting measurements and nearest-neighbour inspection sheets are outside the art delivery, in the current chat's visualization workspace:

- [Checks and source reconstruction results](C:/Users/jfabi/.codex/visualizations/2026/10/24/01a16d92-c9dd-7e33-8b6f-4f01078a267e/rev01-review/checks.json)
- [Native sprite overview](C:/Users/jfabi/.codex/visualizations/2026/10/24/01a16d92-c9dd-7e33-8b6f-4f01078a267e/rev01-review/sprites-1x.png)
- [Player and effects at 8×](C:/Users/jfabi/.codex/visualizations/2026/10/24/01a16d92-c9dd-7e33-8b6f-4f01078a267e/rev01-review/player-fx-8x.png)
- [Ordinary enemies at 8×](C:/Users/jfabi/.codex/visualizations/2026/10/24/01a16d92-c9dd-7e33-8b6f-4f01078a267e/rev01-review/enemies-8x.png)
- [Bosses at 8×](C:/Users/jfabi/.codex/visualizations/2026/10/24/01a16d92-c9dd-7e33-8b6f-4f01078a267e/rev01-review/bosses-8x.png)
- Static layout probes: [Breakwater](C:/Users/jfabi/.codex/visualizations/2026/10/24/01a16d92-c9dd-7e33-8b6f-4f01078a267e/rev01-review/breakwaterBackground-mockup-1x.png), [Furnace](C:/Users/jfabi/.codex/visualizations/2026/10/24/01a16d92-c9dd-7e33-8b6f-4f01078a267e/rev01-review/furnaceBackground-mockup-2x.png), [Citadel](C:/Users/jfabi/.codex/visualizations/2026/10/24/01a16d92-c9dd-7e33-8b6f-4f01078a267e/rev01-review/citadelBackground-mockup-2x.png)

These are inspection aids assembled from existing exports, not replacement assets or runtime captures. The report is the only added file under `art/rev01`; artwork, specifications and game code were left unchanged.
