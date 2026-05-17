# API Contract Source of Truth

## Status

Accepted.

## Decision

got should use a TypeScript API contract in `packages/api-spec` as the source of truth for concrete API grammar, examples, generated Markdown, machine-readable JSON contract output, and conformance tests.

## Context

The API is not only a pair of HTTP endpoints. Most of its meaning lives in the JSON document grammar: node IDs, property keys, edge keys, edge property keys, and query projection semantics. Standard HTTP description formats can describe the transport, but they do not naturally capture this graph-specific language.

## Consequences

- Hand-written Markdown stays high-level and avoids concrete JSON examples.
- Generated API docs can embed examples from the TypeScript contract.
- Tests can execute the same examples shown in docs.
- `api-spec` needs to evolve from loose schemas into contract, grammar, parser, and generator code.
