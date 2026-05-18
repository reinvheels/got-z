# Roadmap

This roadmap tracks concrete work for got itself. Agent memory lifecycle logic lives outside got; got should provide the storage and query substrate that an external harness can use.

## MVP

The MVP should make got usable as a local, durable graph storage service for an agent harness.

- Runtime startup: built Zig runtime can be started locally with configurable port and explicit persistence mode.
- Persistence: durable mode writes accepted mutations to disk in the runtime working directory and replays them on restart.
- Core graph writes: `/push` supports node properties, outgoing edges, connected node properties, and edge properties.
- Core graph reads: `/pull` supports deterministic projection of stored node properties, outgoing edges, connected node properties, and edge properties.
- Error behavior: invalid content type, invalid JSON, unsupported method, and invalid request shapes fail gracefully.
- Contract source of truth: `packages/api-spec` describes endpoints, graph key grammar, examples, runtime modes, limitations, and conformance cases.
- Generated artifacts: API Markdown, machine-readable contract JSON, and conformance fixtures are generated from `packages/api-spec`.
- API tests: integration tests start the built runtime on free ports and cover core API behavior, persistence, errors, and performance thresholds.
- Documentation: hand-written docs explain architecture, roadmap, decisions, setup, and runtime behavior without duplicating generated API examples.

## Harness-Facing Requirements

These are requirements got should support for an external lifecycle layer, but they are not lifecycle behavior inside got.

- Stable graph grammar that a query planner can generate.
- Pull results that are deterministic enough for a renderer to convert into natural language prompt context.
- Examples shaped around memory use cases: preferences, decisions, episodes, evidence, procedures, conflicts, and artifacts.
- Clear distinction between raw graph JSON, rendered prompt text, and candidate graph mutations.
- Explicit room for future scopes such as user, project, repo, session, and task.
- Explicit room for future identity metadata such as local node keys, internal IDs, aliases, and external IRIs.

## Post-MVP

- Strict Zig-side API validation during the first traversal or serialization pass.
- Snapshot and compaction support on top of the WAL.
- Deletion, supersede, and history semantics.
- Better traversal/query primitives beyond current projection reads.
- Query metadata fields for lifecycle-friendly retrieval, including `created_at`, `observed_at`, `last_used_at`, `salience`, `confidence`, `scope`, and `status`.
- Query filters for scope, status, edge type, property values, and time ranges.
- Query sorting and pagination with cursors so external harnesses can fetch disjoint result bands without repeating already-seen nodes.
- Recency-band retrieval support so callers can progressively fetch current-session, recent, older, and archived knowledge instead of relying on one global top-k result set.
- Exclusion filters such as `exclude_ids` so multi-stage retrieval can expand search coverage without duplicating prior candidates.
- Graph health query primitives for orphan nodes, weakly connected components, missing provenance, and stale active tasks.
- Backpressure and durability guarantees for persistent mode.
- Generated conformance tests wired directly to contract examples.
- Optional export/import projections for JSON-LD, RDF, or other web-standard formats.

## Deferred

- Internal integer ID storage layout.
- External IRI identity model.
- Rights, actors, and access control.
- Fulltext or vector indexing.
- Query planner package.
- Graph-to-natural-language renderer package.
- LLM-to-graph translator package.
- Autonomous memory maintenance loops.

## Non-Goals For got Runtime

- LLM reflection.
- Prompt orchestration.
- Human-like thinking loops.
- Autonomous memory hygiene, decay, reinforcement, or summarization.
- Policy decisions about when an agent should remember, forget, merge, or ask for review.

## Documentation Rule

Hand-written Markdown should explain direction and design intent. Concrete API examples should come from the contract and be generated.
