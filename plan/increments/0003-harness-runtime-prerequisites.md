# 0003 Harness Runtime Prerequisites

## Status

Completed.

## Scope

- Keep `packages/agent-harness/plan/SCOPE.md` on its first MVP increment.
- Make the runtime contracts needed by that harness increment explicit.
- Add missing API tests for invalid JSON, non-object request bodies, and oversized body rejection.
- Document `GET /` as the MVP readiness check.
- Document that persistent data uses the runtime working directory.
- Avoid adding `/health`, `--data-dir`, generated API artifacts, runtime clients, query planners, renderers, translators, or memory lifecycle loops.

## Delivered

- `docs/architecture.md` now documents the minimal runtime contract for the first agent harness increment.
- `packages/api-tests/src/error.test.ts` now covers invalid JSON for `/push` and `/pull`.
- `packages/api-tests/src/error.test.ts` now covers non-object request bodies for `/push` and `/pull`.
- `packages/api-tests/src/error.test.ts` now covers oversized body rejection.
- The test harness remains Bun-native for port probing and runtime process management.

## Verification

- `bun run --filter='@got/api-tests' test`
  - 29 pass
  - 9 skip
  - 0 fail
- `bun run --filter='@got/agent-harness' test`
  - 2 pass
  - 0 fail

The API test command must run with permission to bind localhost ports.

## Follow-Up

- `@got/agent-harness/0001` can now be implemented against the documented runtime contract.
- Generated API contract artifacts remain a separate root-level increment.

