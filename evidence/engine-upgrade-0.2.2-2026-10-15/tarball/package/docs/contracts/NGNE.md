# NGNE implementation contracts

This index lists the supported package exports and their owning contracts. The
[architecture](../architecture.md) owns the high-level model; detailed contracts own
exact semantics, ordering, failures and limits. The [guide](../guide.md) owns usage.

## Contract map

| Contract                                                | Scope                                                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Ownership and inspection](ownership-and-inspection.md) | Authoritative state, inspection boundaries, reconstruction limits and consumer ownership |
| [Simulation](simulation.md)                             | ECS, scenes, committed state, events, freeze and deterministic randomness                |
| [Browser and presentation](browser-and-presentation.md) | Browser lifecycle, input, rendering, camera interpolation, assets and audio              |

Read this file first for the supported package boundary. Read only the detailed contract that owns the behavior being changed; broad ownership or architecture work may require all three.

## Public API and inspection

The package entry point is the supported boundary. Runtime modules are internal;
the package export map exposes no subpaths. The consumer inventory is:

### Authoring

Public symbols: `component`, `f32`, `f64`, `i32`, `u32`, `u8`, `bool`,
`entityRef`; types `SchemaComponent`, `SchemaComponentValue`, `SchemaFields`,
`SchemaValues`, `SchemaQuery`, `SchemaChunk`, `SchemaComponentView`,
`SchemaQueryViews`, `FieldDescriptor`, `FieldKind`, `EntityReferenceView`,
`Entity`, `AllQuery`, `WorldAccess`, `SceneDefinition`, `SceneSetup`,
`SystemContext`, `SceneCommands`, `SceneEvent`, `StateAccess`, `DeepReadonly` and
`PreparedScene`.

Hello, Starfall, the platformer and authoring tests consume this surface. See
[ECS authority](simulation.md#storage-lifetime-and-order) and
[prepared scenes](simulation.md#scenes-and-state) for capability and handle rules.

### Authoring and presentation

Public symbols: `Camera`, `Random`, `clamp`, `lerp`, `seedOf`, `down`, `pressed`,
`imageAsset`, `audioAsset`; types `Asset`, `ImageAsset`, `Lease`, `Sprite`, `Sound`
and `Clip`.

Scene authors use this surface for explicitly acquired or injected values. See
[state ownership](ownership-and-inspection.md#simulation-state-ownership-inventory).

### Platform integration

Public symbols: `Game`, `BrowserGame`, `Assets`, `Input`, `Frame`,
`WebGPURenderer`, `Audio`, `FixedStep`, `emptyInput`; types `GameOptions`,
`SceneCandidates`, `SceneCandidateOptions`, `BrowserOptions`, `FrameScheduler`,
`DisplaySnapshot`, `InputSnapshot`, `Stats`, `RendererStatus`, `AssetRetention`,
`AssetsOptions` and `AssetClaim`.

The browser host, headless runners, renderer/audio/asset tests and benchmarks
consume this surface. Host lifecycle, candidate coordination, tick, render and
service operations are intentional integration APIs.

### Inspection

Public types: `Lifecycle`, `SceneInspection`, `SceneStateInspection`,
`GameInspection`, `InspectionValue`, `AssetInspection`, `AssetEntryInspection`
and `RendererResourceInspection`.

Public resource operations: `Assets.inspect`, `WebGPURenderer.inspect`,
`Assets.trim` and `Assets.evict`.

Tests, benchmark capacity reporting and diagnostics consume this surface. See
[public inspection](ownership-and-inspection.md#public-inspection),
[resource diagnostics](ownership-and-inspection.md#resource-diagnostics) and
[retention operations](browser-and-presentation.md#retention-policy).

### Internal only

`World`, the query runtime, `SceneInstance`, candidate runtime, `Cleanup`,
`immutable`, browser failure and preparation capabilities, and GPU
runtime/context/quad/registry modules are internal. Runtime modules, direct ECS
tests and the benchmark import them deliberately. There is no public runtime
constructor for scenes, queries or prepared candidates.
