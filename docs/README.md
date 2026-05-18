# got Documentation

got is a graph database project for durable, queryable agent memory. The intended role is a second brain for AI agent harnesses: a structured alternative to Obsidian-style note graphs, optimized for relationships, retrieval, and long-running context.

This directory contains high-level documentation only. Concrete API grammar, request/response examples, and conformance examples should be generated from the API contract in `packages/api-spec` so the docs, types, and tests do not drift apart.

## Current Direction

- Keep the runtime small and embeddable.
- Model memory as a graph of nodes, relationships, and properties.
- Make persistence explicit: ephemeral by default, durable when requested.
- Treat the API contract as the source of truth for generated API docs and conformance tests.

## Documentation Layout

- `architecture.md`: system shape and package responsibilities.
- `decisions/`: durable design decisions, including the decision record schema.
- `api/`: reserved for generated API documentation.
