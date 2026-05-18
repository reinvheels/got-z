# Scope

## Active Increment

root/0003 - harness runtime prerequisites.

## Goal

Make the concrete got runtime guarantees from `plan/VISION.md` documented and tested enough that `packages/agent-harness` can implement its first MVP increment against real runtime behavior, not assumptions.

## In Scope

- Keep `packages/agent-harness/plan/SCOPE.md` on its first MVP increment.
- Runtime startup contract: the harness may assume a built `db-runtime` binary can be started as a local HTTP service with a caller-selected port.
- Persistence contract: the harness may assume persistence is explicit via `-p` or `--persistent`, and persistent data is written relative to the runtime working directory.
- Write contract: the harness may assume `POST /push` accepts raw JSON graph mutations for node properties, outgoing edges, connected node properties, and edge properties.
- Read contract: the harness may assume `POST /pull` returns deterministic raw JSON graph projections for explicitly requested node keys and projection shapes.
- Error contract: the harness may assume invalid content type, invalid JSON, unsupported method, oversized body, and non-object request bodies fail gracefully with JSON responses.
- MVP exchange format: raw got JSON is the only required harness/runtime exchange format for this increment.
- Ensure root workspace scripts keep `@got/agent-harness` included in normal build and test flows.
- Clarify that the harness package owns installable skills and workspace templates, while got runtime remains storage/query infrastructure.
- Add missing API tests for the runtime contract where coverage is absent: invalid JSON, non-object request bodies, and oversized body rejection.
- Document that `GET /` is the current readiness check for the MVP; do not add a separate `/health` endpoint in this increment.
- Document that persistent data uses the runtime working directory; do not add `--data-dir` in this increment.

## Out Of Scope

- Change runtime behavior or Zig-side validation.
- Add a `/health` endpoint.
- Add a `--data-dir` runtime flag.
- Implement `packages/agent-harness` feature work inside the root increment.
- Generate API documentation or machine-readable contract artifacts.
- Add conformance test generation or OpenAPI validation.
- Advance `packages/agent-harness/plan/SCOPE.md` beyond its first increment.
- Build runtime clients, query planners, renderers, translators, or memory lifecycle loops.

## Verification

- Review `AGENTS.md`, `docs/architecture.md`, `docs/README.md`, root workspace scripts, runtime/API tests, and `packages/agent-harness/plan/SCOPE.md` for alignment with the runtime contracts above.
- Run `bun run --filter='@got/api-tests' test` after adding the missing API tests.
- Run `bun run --filter='@got/agent-harness' test` if package wiring or harness-facing docs change.
- No runtime behavior changes are expected unless a required contract fails under test.
