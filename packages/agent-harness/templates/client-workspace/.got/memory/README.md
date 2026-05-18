# got Memory Bootstrap

This directory contains runtime bootstrap notes for got memory management. It is not a memory store.

The got DB runtime is the only memory source. Agents must not answer memory questions from these Markdown files and must not treat Markdown as memory. If the runtime cannot be reached after the configured retry/escalation path, report that memory is unavailable.

## Runtime Contract

- Runtime status: `./.got/bin/got-agent-harness runtime status`.
- Runtime ensure: `./.got/bin/got-agent-harness runtime ensure` starts or reuses the workspace singleton runtime under a lock.
- Runtime start: `./.got/bin/got-agent-harness runtime start` is for an explicit foreground debug run.
- Runtime stop: `./.got/bin/got-agent-harness runtime stop`.
- Read path: `./.got/bin/got-agent-harness pull` ensures the runtime, wraps `POST /pull` with raw got JSON, and defaults to the `got-memory` anchor projection when no body is provided.
- Write path: `./.got/bin/got-agent-harness push` ensures the runtime and wraps `POST /push` with raw got JSON.
- Persistence mode and working directory are configured outside this file.
- `runtime ensure` is the normal agent path. Use `runtime start --detach` only when explicitly debugging detached process behavior.
- If harness runtime commands fail in a sandboxed client, request the available permission, escalation, or unsandboxed command path for `./.got/bin/got-agent-harness` and retry before declaring memory unavailable.
- Do not read runtime storage internals such as `.got/db/got.wal`, snapshots, or checkpoints as a memory source.

## Memory Anchor

Durable MVP memory should be stored under the stable `got-memory` node because got pulls are explicit projections. The default `pull` command queries these properties: `facts`, `user_preferences`, `workspace_context`, `procedures`, `decisions`, `open_questions`, `summaries`, and `last_updated`.

General remembered statements belong in `facts`. Stable user tendencies or instructions belong in `user_preferences`. Individual memory entries should carry `id`, `type`, `text`, `scope`, `source`, `confidence`, and `last_verified` when practical.

## Files

- `current.md`: runtime configuration bootstrap only.

Do not store memory, raw chat logs, tool output, summaries, checkpoints, decisions, or personal preferences in this directory. Store them in got.
