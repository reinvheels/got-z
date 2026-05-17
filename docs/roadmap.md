# Roadmap

## Near Term

- Replace the current loose `api-spec` package with a TypeScript contract that is the source of truth.
- Generate API Markdown, a machine-readable JSON contract, and conformance examples from that contract.
- Keep API tests aligned with generated examples.
- Clarify persistence durability modes and backpressure behavior.

## Later

- Add snapshot/compaction support on top of the WAL.
- Define deletion and history semantics.
- Revisit rights, actors, and identity as first-class graph concepts.
- Explore agent-memory workflows: retrieval, summarization, provenance, and long-term context management.

## Documentation Rule

Hand-written Markdown should explain direction and design intent. Concrete API examples should come from the contract and be generated.
