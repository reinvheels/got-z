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

If Zig fails because it cannot write to the global cache in a sandboxed environment, set the cache to a writable path:

```sh
ZIG_GLOBAL_CACHE_DIR=/private/tmp/zig-cache-0.17 zig build
```

## API Tests

The API tests expect a real server on `localhost:3001`; despite the README wording, there is no in-test dummy server setup.

Start the DB runtime in `ReleaseFast` mode before running API tests:

```sh
cd packages/db-runtime
ZIG_GLOBAL_CACHE_DIR=/private/tmp/zig-cache-0.17 zig build -Doptimize=ReleaseFast run
```

Then run the API tests from the repo root:

```sh
bun run test:api
```

Use `ReleaseFast` for these tests. The Debug build emits large JSON dumps during the performance tests and can block or time out.

Expected current result:

```text
22 pass
9 skip
0 fail
Ran 31 tests across 3 files
```

After the test run, stop the local runtime so port `3001` is not left occupied.

## Current Runtime Notes

- `packages/db-runtime/src/main.zig` owns process startup and the accept loop.
- `packages/db-runtime/src/server.zig` owns the HTTP parser/router and response shaping.
- `packages/db-runtime/src/graph_store.zig` owns graph mutation/query behavior.
- `packages/db-runtime/src/util/json.zig` wraps `std.json.ObjectMap`; this code follows the Zig 0.17 API where maps use `.empty` plus allocator-explicit `put`/`deinit`.
- `httpz` has been removed from the DB runtime; keep new runtime work aligned with stdlib `std.Io`/`Io.net` unless there is a deliberate dependency decision.
