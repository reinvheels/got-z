# Storage Not Memory Lifecycle

## Status

Accepted.

## Decision

got is the graph storage layer, not the agent memory lifecycle.

got should provide a deterministic graph API, persistence, validation, and eventually query primitives that external agent harnesses can use. It should not implement LLM reflection, memory hygiene, autonomous query planning, summarization, decay, reinforcement, or human-like thinking loops inside the runtime.

The memory lifecycle belongs in an external harness layer. That layer may continuously plan queries, retrieve graph context, render graph results into natural language, translate observations back into graph mutations, and maintain memories over time by calling the got API.

## Context

The project vision is to support a second brain for AI agent harnesses. That requires active memory behavior, but coupling that behavior directly into the database runtime would make got less deterministic, harder to test, and harder to embed.

Separating storage from lifecycle keeps got small and composable. It also leaves room for multiple harness strategies: deterministic query planners, LLM-assisted graph translators, template-based renderers, human-reviewed memory writes, or fully automated maintenance loops.

## Consequences

- got should expose storage and query capabilities rather than agent policies.
- The API contract should describe graph grammar and retrieval primitives, not prompt orchestration.
- LLM-to-graph and graph-to-natural-language translation should live outside the runtime.
- A future harness package may provide query planning, graph rendering, candidate mutation generation, validation, review, and maintenance workflows on top of got.
- Renderer and translator work should treat raw JSON graph structures as an intermediate representation, not as the final prompt format for an LLM.
