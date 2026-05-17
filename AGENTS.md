# Got-Z Agent Notes

## Project Overview

Got-Z is a Bun workspace for a graph data API backed by a Zig database runtime.

The repo is split into four workspace packages:

- `packages/db-runtime`: Zig HTTP runtime on port `3001`; implements `/push` and `/pull`.
- `packages/api-spec`: TypeScript API schema/types.
- `packages/api-tests`: Bun integration and performance tests against `localhost:3001`.
- `packages/util`: Shared TypeScript helpers and prototype extensions used by tests/spec code.

Planning and endpoint notes live under `plan/`. Sample request/response fixtures live under `test/`.

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
bun run --filter='@got-z/db-runtime' build
bun run --filter='@got-z/api-spec' test
bun run --filter='@got-z/api-tests' test
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
bun run --filter='@got-z/db-runtime' build
```

Run the server for manual testing:

```sh
cd packages/db-runtime
zig build run
```

The runtime listens on `localhost:3001`.
By default it is volatile and uses `storage.NoopEngine`. Enable disk persistence with `-p` or `--persistent`; this writes `got-z.wal` in the process working directory. Override the port with `GOT_Z_PORT=<port>` or `--port <port>`:

```sh
GOT_Z_PORT=3099 zig build run
zig-out/bin/db-runtime --port 3099
zig-out/bin/db-runtime --persistent --port 3099
```

If Zig fails because it cannot write to the global cache in a sandboxed environment, set the cache to a writable path:

```sh
ZIG_GLOBAL_CACHE_DIR=/private/tmp/zig-cache-0.17 zig build
```

## API Tests

The legacy API and error tests expect a real server on `localhost:3001`; despite the README wording, there is no in-test dummy server setup for those files.

Start the DB runtime in `ReleaseFast` mode before running API tests:

```sh
cd packages/db-runtime
ZIG_GLOBAL_CACHE_DIR=/private/tmp/zig-cache-0.17 zig build -Doptimize=ReleaseFast run
```

Then run the API tests from the repo root:

```sh
bun run test:api
```

Run the self-contained persistence or performance tests after building `packages/db-runtime/zig-out/bin/db-runtime`:

```sh
cd packages/api-tests
bun test persistence.test.ts
bun test performance.test.ts
```

The persistence and performance tests start the built runtime themselves, choose a free localhost port, run from a temporary data directory, and clean up their runtime process after the test run. The persistence test additionally restarts the process before verifying stored data.

Use `ReleaseFast` for these tests. The Debug build emits large JSON dumps during the performance tests and can block or time out.

Expected current result:

```text
22 pass
9 skip
0 fail
Ran 31 tests across 3 files
```

After running the legacy API/error tests, stop the local runtime so port `3001` is not left occupied.

## Current Runtime Notes

- `packages/db-runtime/src/main.zig` owns process startup and the accept loop.
- `packages/db-runtime/src/server.zig` owns the HTTP parser/router and response shaping.
- `packages/db-runtime/src/graph_store.zig` owns graph mutation/query behavior.
- `packages/db-runtime/src/storage.zig` defines the storage-engine interface: load existing state, append accepted `/push` mutations, checkpoint the current graph, and deinit.
- `packages/db-runtime/src/snapshot.zig` defines the snapshot serialization sink. Snapshot writers receive logical node and edge records instead of raw memory, so JSON, binary, and future offset-based engines can share the same graph traversal.
- `packages/db-runtime/src/util/json.zig` wraps `std.json.ObjectMap`; this code follows the Zig 0.17 API where maps use `.empty` plus allocator-explicit `put`/`deinit`.
- `httpz` has been removed from the DB runtime; keep new runtime work aligned with stdlib `std.Io`/`Io.net` unless there is a deliberate dependency decision.

The default storage backend is `storage.NoopEngine`; pass `-p` or `--persistent` to use `storage.JsonWalEngine`. The WAL engine writes accepted `/push` bodies as newline-delimited JSON to `got-z.wal` in the process working directory and replays that WAL during startup. Keep persistence work behind the `storage.Engine` and `snapshot.SnapshotSink` interfaces so the conservative WAL/snapshot path can later swap JSON, binary, or custom-layout implementations without changing HTTP routing or graph mutation logic.
