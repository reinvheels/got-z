# Architecture

got is organized as a Bun monorepo with a Zig database runtime.

## Packages

- `packages/db-runtime`: HTTP runtime and in-memory graph store, written in Zig.
- `packages/api-spec`: future source of truth for the API contract, grammar, examples, and generated artifacts.
- `packages/api-tests`: Bun integration, conformance, persistence, and performance tests against the built runtime.
- `packages/util`: shared TypeScript helpers used by tests and spec code.

## Runtime Shape

The runtime exposes a compact HTTP API for pushing graph mutations and pulling projected graph data. It keeps the active graph in memory and can optionally attach a storage engine.

Storage is behind `storage.Engine`. The default mode is ephemeral. Persistent mode is enabled explicitly and currently uses an asynchronous batched WAL writer.

## Documentation Shape

High-level intent lives in hand-written Markdown. Concrete API details should live in the TypeScript API contract and be generated into Markdown, JSON contract artifacts, and conformance tests.
