# got Memory Management

This directory contains bootstrap and fallback workspace state for got memory management.

The primary memory backend should be the got DB runtime. These markdown files keep agent work recoverable when starting a thread, handing off context, or operating while the runtime is unavailable.

got memory management should query the got DB runtime continuously during the agent lifecycle: before turns, before actions, after actions, after commits, and before thread switches. Markdown mirrors only the compact state needed for recovery.

## MVP Runtime Contract

- Runtime readiness check: `GET /`.
- Read path: `POST /pull` with raw got JSON.
- Write path: `POST /push` with raw got JSON.
- Persistence mode and working directory are configured outside these markdown files.
- If localhost runtime checks fail in a sandboxed client, request the available permission, escalation, or unsandboxed command path for localhost and retry before declaring the runtime unavailable.
- If the runtime is still unavailable after that retry, use these markdown files as fallback and record that memory was not refreshed.

## Lifecycle Hooks

- `before_turn`: retrieve workspace anchors, user preferences, active goal, decisions, questions, procedures, and recent checkpoints.
- `before_action`: retrieve constraints, setup rules, affected files/packages, known failure modes, and verification expectations.
- `after_action`: push durable observations, artifacts, evidence, questions, and candidate summaries learned from tools or edits.
- `after_commit`: push commit metadata, changed scope, decisions, and verification results.
- `before_thread_switch`: retrieve current got state and refresh markdown fallback files.

## Memory Vocabulary

Use these minimal memory object types in the MVP: `observation`, `episode`, `artifact`, `decision`, `question`, and `summary`.

Each durable memory should include the minimum metadata that keeps fallback state useful: `source`, `scope`, `recency`, and `last_verified`.

## Translation Responsibilities

Raw got JSON is acceptable for MVP prompt context and mutation drafts. Keep the future responsibilities distinct:

- Query planning decides what to ask got.
- Graph-to-context rendering decides how got results enter model context.
- Observation-to-candidate-mutation translation decides what should be written after new observations.

## Long-Term Loops

The long-term harness should grow toward `perceive`, `retrieve`, `reflect`, and `maintain` loops. This MVP installs instructions and state templates only; it does not run background loops.

## Files

- `current.md`: runtime configuration plus compact current goal, implementation state, decisions, open questions, next steps, and verification.
- `open-questions.md`: unresolved questions mirrored from or queued for got.
- `checkpoints.md`: concise progress checkpoints rendered from got after commits, decisions, or larger work blocks.

Do not store raw chat logs, large command output, full diffs, or generated artifacts here.
