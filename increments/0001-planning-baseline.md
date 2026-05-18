# 0001 Planning Baseline

## Status

Archived baseline.

## Scope

The previous docs-level planning file mixed active MVP work, harness-facing requirements, post-MVP ideas, deferred ideas, runtime non-goals, and a documentation rule in one file.

## Preserved Direction

got should become a local, durable graph storage service for an external AI agent harness. Agent memory lifecycle logic belongs outside got runtime; got provides storage and query behavior.

The MVP direction included runtime startup with configurable port and explicit persistence mode, durable mutation replay, core `/push` graph writes, core `/pull` graph reads, graceful API errors, a TypeScript contract source of truth, generated artifacts, integration/performance tests, an agent harness package, and high-level documentation.

Harness-facing requirements included a stable graph grammar, deterministic pull results, memory-shaped examples, a clear distinction between raw graph JSON, rendered prompt text, and candidate mutations, plus future room for scopes and identity metadata.

Post-MVP runtime work included strict Zig-side API validation, snapshots and compaction, deletion/supersede/history semantics, stronger traversal and query primitives, lifecycle-friendly metadata fields, query filters, cursor pagination, recency-band retrieval, exclusion filters, graph health queries, persistent-mode backpressure, generated conformance tests, and optional JSON-LD/RDF export or import.

Deferred ideas included internal integer IDs, external IRI identity, rights/actors/access control, fulltext or vector indexing, a query planner package, a graph-to-natural-language renderer package, an LLM-to-graph translator package, and autonomous memory maintenance loops.

Runtime non-goals included LLM reflection, prompt orchestration, human-like thinking loops, autonomous memory hygiene, and remember/forget/merge/review policy decisions.

## Delivered

- Root `VISION.md` now owns long-term direction and boundaries.
- Root `SCOPE.md` now owns the active minimal increment.
- The old docs-level planning file was removed so planning detail cannot drift from the root planning artifacts.

## Verification

- Source reviewed: previous docs-level planning content before migration.
- No runtime or API tests are required for this docs-only migration.

## Follow-Up

- After this increment is accepted, rewrite `SCOPE.md` to the next small product or documentation increment before implementation starts.
