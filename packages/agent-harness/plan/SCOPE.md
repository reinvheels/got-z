# Agent Harness Scope

## Active Increment

@got/agent-harness/0002 - runtime client boundary.

## Goal

Add the smallest package-owned runtime client boundary so future harness code can check readiness, pull memory, and push candidate mutations through got without embedding fetch details in templates.

## In Scope

- Add a Bun-native runtime client module for `GET /`, `POST /pull`, and `POST /push`.
- Keep raw got JSON as the request and response format.
- Accept explicit runtime configuration instead of discovering or starting the runtime.
- Surface graceful errors from failed HTTP calls and non-OK responses.
- Add focused unit tests for successful readiness, pull, push, and failed runtime responses.

## Out Of Scope

- Starting, supervising, or installing the got DB runtime.
- Autonomous reasoning or background maintenance agents.
- Query planning.
- Graph-to-natural-language rendering.
- LLM-to-graph translation.
- Context block template systems.
- Fulltext, vector search, or hybrid retrieval.
- Global Codex app context control or native compaction control.
