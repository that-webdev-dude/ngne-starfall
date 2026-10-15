# Ownership and inspection contracts

These contracts define authoritative state, diagnostic inspection and the limits of reconstruction.

## Simulation-state ownership inventory

### Content claims outside simulation

Consumer document-resolution attempts own their pending request claims, including
claims acquired before later validation fails. Cancellation relinquishes only that
attempt; shared work continues for surviving owners. A consumer may flatten a
validated graph into an immutable snapshot and explicit resource definitions, ending
temporary document claims without retaining a live dependency service in simulation.

`Game.prepare` immediately owns each acquired CPU lease before awaiting host
readiness. Its candidate owns those leases and GPU cleanup callbacks until mounting
transfers them to the scene, or abandonment releases them. Failure unwinds the
attempt; preparation constructs no world. A renderer image registration separately
retains one decoded source lease shared by its overlapping image consumers. Its last
consumer releases GPU resources before that retained source lease. Decoded cache
retention is a separate policy, not an outstanding scene claim; see the
[retention contract](browser-and-presentation.md#retention-policy).

Candidate slots can retain speculative preparations: `take` transfers the ready
candidate and starts a refill while the mounted owner still exists. Account for
mounted scenes, raw candidates, slots/refills, consumer dependency claims and renderer
sources separately; there is no universal literal reference count. Owner removal,
stop and disposal cancel slots. Recovery changes renderer generations, not scene
ownership; released sources and stale completions cannot become replacement members.

### Resource diagnostics

`Assets.inspect(limit = 100)` and `WebGPURenderer.inspect(limit = 100)` produce
detached, recursively frozen snapshots. Detail limits accept integers 0–1000;
`truncated` signals omitted entries, while every aggregate remains complete.
Details follow registry insertion order. Observing does not trim, wait for pending
work, retain resources or change simulation. No event history is retained.

Asset loaded/loading and leased/unleased counts refer to unique resident identities.
Claims count acquisitions separately: `scene` includes preparation, candidates,
refills and mounted ownership; `renderer` includes host acquisition and retained
upload/recovery sources; `dependency` and default `external` label explicit consumer
acquisitions. Per-entry claim counts show these relationships, not scene instance IDs
or a graph traversal. Failed/aborted entries leave the registry immediately even if
their external loader has not settled. Claims protect values regardless of label.

Decoded image estimates are width × height × 4; decoded audio estimates are sample
length × channel count × 4. Custom assets may supply `estimateBytes`; omitted sizes
are unknown, counted separately and excluded from byte totals. Invalid estimates
fail acquisition and clean up the returned value. `overBudget` includes all loaded
entries; `protectedOverBudget` identifies the live set that cannot be reclaimed.
`cleanupFailures` is a cumulative count, not retained exceptions or successful frees.

Renderer diagnostics count unique registered sources and textures, source claims,
manual snapshots, in-flight registered uploads and manual replacements. Texture
estimates use RGBA8 width × height × 4, including the four-byte white texture.
Manual snapshots belong only to the renderer. Asset-backed source estimates overlap
the asset service's image totals and must not be added to them. Registered images
in published or rebuilding generations are counted once per texture. Upload-local
allocations awaiting validation and unpublished manual snapshots are excluded;
pending counts expose that observation limit.

These are payload estimates, not process or driver memory: object/definition tables,
consumer snapshots retained by closures, compressed/network data, allocator padding,
GPU buffers, bindings, pipelines, render targets and driver allocations are excluded.
Service eviction releases its ownership; external JavaScript references may still
retain ordinary values. Inspection has no mutable registry, bitmap, AudioBuffer or
GPU handle and is intended for explicit diagnostic sampling, not every frame.

This inventory describes the state determining the next tick **given the same authored
code, input/display and host commands**. It is not a capture schema. Mutable authoritative
gameplay values belong to explicit owners; system closures retain injected owners and
fixed code.

### Global simulation state

`Game` owns the tick, root seed, committed state and next instance ID.
`enumerate()` includes these plus fixed `dt` in seconds and the engine, RNG and
authored compatibility string.

### Mounted scene state

Scene summaries preserve stack order, instance ID, definition ID, key, resolved
seed and blocking policy. Resources are keyed by unique nonempty names within each
mount.

### ECS values and identity

The world owns component columns, entity identity and allocator/iteration history.
Schema definitions are immutable authoring; query views and row caches are derived
borrows, never authoritative state.

The simulation contract owns [schemas](simulation.md#schema-definitions-and-fields),
[storage and order](simulation.md#storage-lifetime-and-order),
[borrowing](simulation.md#chunk-traversal-and-borrowing) and
[ECS inspection](simulation.md#inspection-and-empty-entities). Empty archetypes and
chunks carry history that cannot be reconstructed from live entities alone.

### Scene simulation state

Named RNG current uint32 states, resources, event inbox/outbox, pending/remaining
freeze and camera fields belong to the scene. Suspension and stop/resume preserve
mounted state; unmount releases it. Camera state is authoritative when gameplay
reads it.

### Tick-local work

Game owns the selected update plan, current updating scene, state/scene command
queues and busy flag; worlds own pending births/deaths. Ordinary local variables
such as aim search, collision iteration and spawn temporaries do not persist across
updates. Queues normally drain at completed commit; suspended event inboxes
intentionally persist.

### Starfall durable facts

Game state owns `best`, `runs`, `victories` and `lastScore`; finish commands capture
score and win before transition.

### Starfall gameplay

`run` owns phase, score, wave, seconds/ticks, hp, bomb, combo/countdown, stress,
spawn/shot timers, invulnerability, boss-wave and finished flag. The `player`
resource owns its handle. Schema components own the rest: `position` (`x`, `y`,
`px`, `py`: `f64`) and `body` (`vx`, `vy`, `radius`, `hp`, `age`, `cooldown`:
`f64`; `active`: `bool`; `kind`: `u8`). Systems locate the player's row from its
handle each update and never retain it. The `waves` RNG owns spawn/drop randomness.
The decoded `ships` atlas is an `ImageAsset` lease owned by each prepared scene; no
component field or resource holds it.

### Starfall derived cache

The `collision-grid` resource stores entries of entity handle, borrowed `position`
and `body` chunk component views, and chunk-relative row. Every continuing ordinary
gameplay update clears and rebuilds it before collision reads, so entries are probed
only in the commit epoch that created them. After commit, retained entries are
expired borrows that may name removed entities or moved rows: they are neither an
authority nor a list of current entities, and inspection shows their views as empty
records. Query match/column caches are likewise derived from definitions and
archetypes, preserving their order.

### Starfall presentation within simulation

`visual` (`sprite`: `u8`; `size`, `angle`: `f64`), previous poses, `particle`
(`vx`, `vy`, `life`, `maxLife`, `size`: `f64`; `color`: `u32`), the `effects` RNG,
`run.shake/flash`, camera shake and `stars` are scene-owned and inspectable. Particle
updates continue through freeze and share ECS allocation with gameplay: their
lifetime cannot be omitted when reproducing allocator identity. Stars are generated
once using `waves`, so mount-time draws are part of deterministic setup.

### Immutable authoring

Component schemas/names, scene setup/ID/policy, ordered systems and freeze flags,
reset/render callbacks, transition function, arena attract/stress/reduced-motion
options, dimensions, sprite/atlas definitions and texture key `ships` are
code/configuration, not serialized values. Treat supplied definitions/options as
fixed; readonly typing does not deep-freeze arbitrary authored objects or callback
captures.

### Host intent and preparation

Game owns raw candidate handles/status/leases, owner-scoped candidate slots, pending
abort controllers and queued host scene commands. Game hosts own authored purposes,
definitions and launch intent. These are external activation inputs, not hidden
gameplay progression. Availability and authored activation tick/key must also match
for repeatability; input snapshots alone do not record DOM launch, pause or
visibility commands.

### Platform input and timing

`Input` owns held/edge/pointer/gamepad state pending consumption. BrowserGame owns
display, scheduler/run token, lifecycle guards, clock, FixedStep accumulator/budget
and telemetry. These control later environmental input and platform frames, outside
simulation-state inspection. A game reading display data needs the same supplied
display values too.

### Assets and presentation services

Assets owns definitions, loads, decoded cache and refcounts; scene cleanup owns
leases. Renderer owns texture sources, GPU objects and context state; Frame owns
reusable draw buffers and sorting. Audio owns requests, voices, scope identity and
disposal, buses, mute/ducking and device. These are rebuilt or resumed through their
services, not simulation capture.

### Demo UI and hello

DOM `view`/`presentation`, prior phase, metrics/times and UI readiness are
host/presentation state. View copies do not grant gameplay mutation. Hello's
moving/previous X values are components; its query/callbacks contain no mutable
gameplay counters. Art generation has only call-local drawing work.

## Public inspection

Constructors operate on caller-owned values; inspection never returns a live camera
or RNG.

- `Game.lifecycle` and `simulationTick` are getter-only values backed by private
  fields. Browser faults use an internal capability, not a writable public field.
- `Game.scenes` returns a fresh frozen array of frozen summaries in stack order:
  instance `id`, definition ID string, authored `key`, seed, blocking policy,
  entity count/capacity and remaining freeze ticks. Compare `id`, not object identity,
  across reads. Old summaries remain unchanged after updates or unmount.
- `Game.enumerate()` returns detached, recursively frozen diagnostic data. Resource
  bindings, component values, camera, RNG, event data and game state cannot be
  mutated through this result. Dynamic values use `InspectionValue` and require
  narrowing. Enumeration copies on demand and is unsuitable for per-frame telemetry.
- Enumeration preserves enumerable string-keyed data and cycles. Arrays remain arrays;
  Maps become entry arrays, Sets become value arrays, and typed arrays become indexed
  records. Symbols become descriptions and functions become `"[Function]"`; prototypes,
  methods, non-enumerable and symbol-keyed properties are omitted. Opaque objects with
  no enumerable data inspect as empty records. This is neither a lossless snapshot nor
  a save/restore format, and it never grants entity ownership.

## Inspection boundary and limits

- Inspect after successful `tick()` returns and before new host commands or authored
  mutations for a completed commit; after initial `start()` mounting is also committed.
  `enumerate()` is allowed elsewhere but is not an atomic snapshot API. During update,
  setup, cleanup or failure it may expose intermediate/partial state; pending command
  payloads and candidate preparation are not enumerated. Lifecycle is read separately.
- Public `Game.enumerate()` is detached and frozen. Internal `World.enumerate()`
  builds metadata but borrows live component values; it must remain runtime-internal.
  Setup-injected world/resource/RNG/camera capabilities deliberately remain live.
- Inspection copies each category separately: aliases within a copied graph survive,
  but cross-category identity is not preserved. Entity owner symbols become the same
  `"world"` description across worlds; use the enclosing scene identity to interpret
  handles. An inspected handle cannot be passed back as an owned entity.
- The public copy is lossy: enumerable getters may execute, custom iterators may run,
  private fields and non-enumerable state are omitted, and built-ins lose their type
  as described above. Keep authoritative resource data inspectable; opaque closure or
  private-field-only resource state does not satisfy the ownership requirement.
  Inspection of arbitrary authored accessors is not guaranteed side-effect-free.
- Scene IDs, resource names, component names, mount keys and asset IDs are authored
  identities, not reconstruction resolvers. Scene IDs are not globally uniqueness-
  checked; authors must use compatible definitions for each ID. Default
  `unversioned-game` does not validate compatibility. Reconstruction requires authored
  schema/version checks, graph/handle reconstruction, service reacquisition and external
  activation records. The engine does not provide capture, serialization, restoration,
  replay control or a snapshot participant registry.

Diagnostic readers should never rebuild iteration order from only `world.entities`.
