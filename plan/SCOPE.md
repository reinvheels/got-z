# Scope

## Active Increment

root/0004 - generated API contract artifacts.

## Goal

Make `packages/api-spec` produce the first generated API artifacts so humans and agents can read the same contract output without duplicating examples by hand.

## In Scope

- Add a small generation entrypoint in `packages/api-spec`.
- Generate a machine-readable contract artifact from the TypeScript contract.
- Generate concise Markdown API documentation into `docs/api/`.
- Keep generated examples sourced from the TypeScript contract.
- Add or update scripts so the generated artifacts can be refreshed from Bun.

## Out Of Scope

- Change runtime behavior or Zig-side validation.
- Implement OpenAPI schema validation.
- Add conformance test generation.
- Advance `packages/agent-harness/plan/SCOPE.md` beyond its first increment.
- Build runtime clients, query planners, renderers, translators, or memory lifecycle loops.

## Verification

- Run the relevant `@got/api-spec` build or generation script.
- Verify generated files match the TypeScript contract.
- No runtime or API integration tests are required unless package scripts already include them.
