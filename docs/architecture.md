# Architecture

got is organized as a Bun monorepo with a Zig database runtime.

## Packages

- `packages/db-runtime`: HTTP runtime and in-memory graph store, written in Zig.
- `packages/api-spec`: future source of truth for the API contract, grammar, examples, and generated artifacts.
- `packages/api-tests`: Bun integration, conformance, persistence, and performance tests against the built runtime.
- `packages/agent-harness`: utilities and templates for installing got memory management into client workspaces.
- `packages/util`: shared TypeScript helpers used by tests and spec code.

## Runtime Shape

The runtime exposes a compact HTTP API for pushing graph mutations and pulling projected graph data. It keeps the active graph in memory and can optionally attach a storage engine.

Storage is behind `storage.Engine`. The default mode is ephemeral. Persistent mode is enabled explicitly and currently uses an asynchronous batched WAL writer.

For the first agent harness increment, the runtime contract is intentionally small:

- A built `db-runtime` binary can run as a local HTTP service on a caller-selected port.
- `GET /` is the MVP readiness check.
- `POST /push` accepts raw JSON graph mutations for node properties, outgoing edges, connected node properties, and edge properties.
- `POST /pull` returns deterministic raw JSON projections for requested node keys and projection shapes.
- Persistence is explicit through `-p` or `--persistent`; persistent data is written relative to the runtime working directory.
- Invalid content type, invalid JSON, unsupported method, oversized body, and non-object request bodies fail with JSON responses.

The MVP does not include a separate `/health` endpoint, a `--data-dir` flag, a runtime client package, or Zig-side graph-shape validation.

## Documentation Shape

High-level intent lives in hand-written Markdown. Concrete API details should live in the TypeScript API contract and be generated into Markdown, JSON contract artifacts, and conformance tests.

## Harness Shape

Harness behavior stays outside the DB runtime. The `agent-harness` package owns workspace templates such as got memory management skills and markdown state files. Its init command copies those templates into client workspaces so future harness workflows can be standardized without coupling them to runtime storage code.
