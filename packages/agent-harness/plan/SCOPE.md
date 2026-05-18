# Agent Harness Scope

## Active Increment

@got/agent-harness/0004 - structured memory contract. Completed; awaiting an explicitly started next increment.

## Goal

Define the smallest practical memory contract for the `got-memory` anchor so agents store facts, preferences, procedures, decisions, questions, and summaries in predictable places instead of treating the anchor as an unstructured JSON bucket.

## In Scope

- Define a minimal runtime-backed memory shape for the stable `got-memory` anchor.
- Separate general facts from user preferences so observations like "Aepfel sind rot" are not stored as preferences.
- Document the intended meaning of the initial top-level memory slots:
  - `facts`
  - `user_preferences`
  - `workspace_context`
  - `procedures`
  - `decisions`
  - `open_questions`
  - `summaries`
  - `last_updated`
- Define minimum fields for individual memory entries where practical:
  - `id`
  - `type`
  - `text`
  - `scope`
  - `source`
  - `confidence`
  - `last_verified`
- Update the installed got memory skill and `AGENTS.got-memory.md` so agents classify memory writes into the contract before pushing.
- Update the default pull query if the contract needs a different shape.
- Add focused tests that installed templates teach the contract and keep facts/preferences distinct.

## Out Of Scope

- A full generated TypeScript schema or OpenAPI contract for harness memory.
- Runtime-side validation in Zig.
- Query planning.
- Graph-to-natural-language rendering.
- LLM-to-graph translation.
- Embedding, fulltext, or hybrid retrieval.
- Autonomous maintenance loops.
- Human review workflows.
- Migration of existing ad hoc memory stored in test workspaces.

## Verification

- `bunx tsc --noEmit -p packages/agent-harness/tsconfig.json`
- `bun run --filter='@got/agent-harness' test`
- `bun run --filter='@got/agent-harness' build`
- Manual tmp-workspace check that a fact and a preference are written to different slots.
