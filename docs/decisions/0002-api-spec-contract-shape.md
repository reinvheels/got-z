# API Spec Contract Shape

## Status

Accepted.

## Decision

The API contract starts as an OpenAPI-inspired TypeScript data object in `packages/api-spec/src/contract.ts`, authored through small helper types from `packages/api-spec/src/define.ts`.

The HTTP surface uses familiar OpenAPI-style sections such as `paths` and `components`. Got specific graph semantics live in explicit extension sections such as `xGotKeyGrammar`, `xGotSemantics`, `xGotRuntimeModes`, and `xGotConformance`.

The existing public exports from `@got/api-spec` remain compatible while the contract is introduced. Runtime parsers, generated Markdown, machine-readable JSON contract output, and generated conformance tests will be layered on top in later changes.

## Context

Got's API is more than HTTP paths. The important semantics live in the JSON key grammar used by `/push` and `/pull`. We want one source of truth that can be read by humans, imported by TypeScript code, and used later for generation.

OpenAPI and JSON Schema may still be useful projections, but neither is sufficient on its own for the graph-specific key language. The TypeScript contract keeps the authoring experience type-safe while staying close enough to OpenAPI to generate a standard HTTP description later.

## Consequences

- `packages/api-spec` becomes the place where API grammar, endpoint metadata, examples, runtime modes, limitations, and status live.
- The initial contract stays declarative and diff-friendly.
- Contract sections with stable identity should use keyed records rather than arrays.
- Existing tests can keep importing `PushRequest`, `PullRequest`, `EdgeDirection`, `Prefixes`, and the current schemas while the contract grows.
- Generated docs and conformance tests should come from this contract rather than hand-maintained examples.
