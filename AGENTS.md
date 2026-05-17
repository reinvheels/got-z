# Got Agent Notes

## Project Overview

Got is a Bun workspace for a graph data API backed by a Zig database runtime.

The repo is split into four workspace packages:

- `packages/db-runtime`: Zig HTTP runtime on port `3001`; implements `/push` and `/pull`.
- `packages/api-spec`: TypeScript API schema/types.
- `packages/api-tests`: Bun integration and performance tests that start the DB runtime on free localhost ports.
- `packages/util`: Shared TypeScript helpers and prototype extensions used by tests/spec code.

High-level documentation lives under `docs/`. Sample request/response fixtures live under `test/`.

## Vision

Got should become a graph database that can act as a second brain for an AI agent harness. The long-term goal is to provide durable, queryable memory for agents: a structured replacement for Obsidian-style note graphs, optimized for relationships, retrieval, and long-running context rather than human-facing markdown documents.

## Setup

Install JS dependencies from the repo root:

```sh
bun install
```

Use Bun for workspace scripts. Root-level commands:

```sh
bun run build
bun run test
bun run test:api
bun run clean
```

For narrower work, prefer package filters:

```sh
bun run --filter='@got/db-runtime' build
bun run --filter='@got/api-spec' test
bun run --filter='@got/api-tests' test
```

## Zig Toolchain

- The DB runtime is built with Zig `0.17.0-dev.251+0db721ec2`.
- The repo root contains `.zigversion` with the expected Zig version.
- `packages/db-runtime/build.zig` has a guard that rejects older Zig versions before compiling.
- Do not treat `build.zig.zon`'s `.version` field as the Zig compiler version; it is the package version.

Check the active compiler:

```sh
zig version
```

Expected:

```text
0.17.0-dev.251+0db721ec2
```

## DB Runtime

Build from the DB runtime package:

```sh
cd packages/db-runtime
zig build
```

Build from the repo root:

```sh
bun run --filter='@got/db-runtime' build
```

Run the server for manual testing:

```sh
cd packages/db-runtime
zig build run
```

The runtime listens on `localhost:3001`.
By default it is ephemeral and uses `storage.NoopEngine`. Enable disk persistence with `-p` or `--persistent`; this writes `got.wal` in the process working directory via an asynchronous batched WAL writer. Override the port with `GOT_PORT=<port>` or `--port <port>`:

```sh
GOT_PORT=3099 zig build run
zig-out/bin/db-runtime --port 3099
zig-out/bin/db-runtime --persistent --port 3099
```

If Zig fails because it cannot write to the global cache in a sandboxed environment, set the cache to a writable path:

```sh
ZIG_GLOBAL_CACHE_DIR=/private/tmp/zig-cache-0.17 zig build
```

## API Tests

Build the DB runtime in `ReleaseFast` mode before running API tests:

```sh
cd packages/db-runtime
ZIG_GLOBAL_CACHE_DIR=/private/tmp/zig-cache-0.17 zig build -Doptimize=ReleaseFast
```

Then run the API tests from the repo root:

```sh
bun run test:api
```

Run individual suites after building `packages/db-runtime/zig-out/bin/db-runtime`:

```sh
cd packages/api-tests
bun test src/api.test.ts
bun test src/error.test.ts
bun test src/persistence.test.ts
bun test src/performance.test.ts
```

All API test suites use `src/runtime-harness.ts`: they start the built runtime themselves, choose a free localhost port, run from a temporary data directory, and clean up their runtime process after the test run. The persistence test additionally restarts the process before verifying stored data.

Use `ReleaseFast` for these tests. The Debug build emits large JSON dumps during the performance tests and can block or time out.

Expected current result:

```text
24 pass
9 skip
0 fail
Ran 33 tests across 4 files
```

The harness should leave no runtime listening after tests finish.

## Commit Flow

Prefer small, focused changesets with clear commit messages. After a small coherent step is implemented, tested, and the user is satisfied with the direction, proactively suggest committing before moving on to the next step. Keep unrelated edits out of the same commit unless they are necessary for the change to work.

## Documentation Flow

Keep hand-written Markdown high-level: vision, architecture, roadmap, and design decisions. Do not manually maintain concrete API examples in Markdown. The API contract in `packages/api-spec` should become the source of truth for generated API docs, machine-readable contract output, and conformance examples.

Use `docs/decisions/` by default for durable design decisions. Add or update a decision whenever work establishes an architectural direction, source-of-truth rule, storage semantic, API grammar rule, or workflow convention that future agents should not have to rediscover from chat history. Keep each decision small, numbered, and structured with Status, Decision, Context, and Consequences. Follow the decision status schema in `docs/decisions/README.md`; use `Accepted / Deferred` for decisions whose direction is settled but whose implementation is intentionally on hold.

## Current Runtime Notes

- `packages/db-runtime/src/main.zig` owns process startup and the accept loop.
- `packages/db-runtime/src/server.zig` owns the HTTP parser/router and response shaping.
- `packages/db-runtime/src/graph_store.zig` owns graph mutation/query behavior.
- `packages/db-runtime/src/storage.zig` defines the storage-engine interface: load existing state, append accepted `/push` mutations, checkpoint the current graph, and deinit.
- `packages/db-runtime/src/snapshot.zig` defines the snapshot serialization sink. Snapshot writers receive logical node and edge records instead of raw memory, so JSON, binary, and future offset-based engines can share the same graph traversal.
- `packages/db-runtime/src/util/json.zig` wraps `std.json.ObjectMap`; this code follows the Zig 0.17 API where maps use `.empty` plus allocator-explicit `put`/`deinit`.
- `httpz` has been removed from the DB runtime; keep new runtime work aligned with stdlib `std.Io`/`Io.net` unless there is a deliberate dependency decision.

The default storage backend is `storage.NoopEngine`; pass `-p` or `--persistent` to use `storage.JsonWalEngine`. The WAL engine queues accepted `/push` bodies, writes length-framed raw JSON records to `got.wal` from a background thread, syncs once per drained batch, and replays that WAL during startup. Keep persistence work behind the `storage.Engine` and `snapshot.SnapshotSink` interfaces so the conservative WAL/snapshot path can later swap JSON, binary, or custom-layout implementations without changing HTTP routing or graph mutation logic.
