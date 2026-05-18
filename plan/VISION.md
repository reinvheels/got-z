# Vision

## Direction

got is a local-first graph database runtime for durable, queryable agent memory.

The project should provide the storage and query substrate for AI agent harnesses that need long-running memory. The runtime should stay small, explicit, and embeddable while supporting graph-shaped memory better than markdown-first note systems.

## Runtime Boundary

got runtime owns graph storage, the `/push` and `/pull` API, persistence, validation, query primitives, and contract conformance.

got runtime does not own LLM reflection, prompt orchestration, human-like thinking loops, autonomous memory hygiene, decay, reinforcement, summarization, or policy decisions about when an agent should remember, forget, merge, or ask for review. Those lifecycle concerns belong in external harness packages.

## Storage And API

got should be usable locally like SQLite: start the runtime in a working directory, choose a port, opt into persistence, write graph mutations, and pull deterministic graph projections.

The API should support nodes, relationships, node properties, connected node properties, and edge properties. Durable mode should write accepted mutations to disk in the runtime working directory and replay them on restart.

The API contract in `packages/api-spec` should be the source of truth for endpoint grammar, request and response shapes, examples, runtime modes, limitations, generated API docs, machine-readable contract output, conformance fixtures, and conformance tests.

## Harness-Facing Direction

got should expose a stable graph grammar that external query planners and memory lifecycle loops can generate reliably.

Pull results should be deterministic enough for external renderers to convert raw graph JSON into natural-language prompt context. The runtime should clearly separate raw graph JSON, rendered prompt text, and candidate graph mutations.

got should leave room for future memory scopes such as user, project, repo, session, and task. It should also leave room for identity metadata such as local node keys, internal IDs, aliases, and external IRIs.

## Long-Term Capabilities

After the minimal durable graph API is useful, got should grow toward stricter validation, WAL snapshots and compaction, deletion and supersede semantics, history, traversal/query primitives beyond projection reads, query filters, cursor pagination, recency-band retrieval, exclusion filters, graph health queries, persistent-mode backpressure, and optional web-standard export/import projections such as JSON-LD or RDF.

## Project Planning

Global project planning lives in `plan/` at the repository root:

- `plan/VISION.md` records long-term direction and boundaries.
- `plan/SCOPE.md` records the active, minimal increment.
- `plan/increments/` records completed or archived increments.

Package-specific planning may use the same structure inside the package root, such as `packages/agent-harness/plan/`, when the work is owned by one package.
