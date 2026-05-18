## got Memory Management

got memory management is active in this workspace by default. The user does not need to mention it in each prompt.

The got DB runtime is the only memory source. Markdown files under `.got/memory/` are runtime bootstrap/configuration only. Do not answer memory questions from Markdown and do not treat Markdown as memory.

Before substantive work, read `.got/memory/current.md` only to find workspace identity and runtime configuration. Then use `./.got/bin/got-agent-harness pull` to query the default `got-memory` anchor; `pull` ensures the workspace singleton runtime before it sends `POST /pull`.

If harness runtime commands fail in a sandboxed client, request the available permission, escalation, or unsandboxed command path for `./.got/bin/got-agent-harness` and retry before declaring memory unavailable. If the runtime still cannot be reached, say that got memory is unavailable; do not substitute Markdown memory.

Use `./.got/bin/got-agent-harness runtime ensure` for an explicit runtime check/start. It uses workspace PID/state metadata and a runtime lock so concurrent chats do not start duplicate runtimes. Use `runtime start --detach` only when explicitly debugging detached process behavior.

If the CLI reports that the got runtime URL is reachable but not managed by this workspace, do not use that runtime. Report the workspace/runtime conflict and ask the user to stop the other runtime or choose a different runtime URL.

Do not read runtime storage files as memory. Files such as `.got/db/got.wal`, snapshots, checkpoints, or other DB runtime internals are implementation details.

Because got pulls are explicit projections, write durable MVP memory under the stable `got-memory` node. Use `facts`, `user_preferences`, `workspace_context`, `procedures`, `decisions`, `open_questions`, `summaries`, and `last_updated` as the retrievable memory properties.

Classify memory before writing. General remembered statements like "Apples are red" belong in `facts`. Stable user tendencies or instructions like "The user prefers short German answers" belong in `user_preferences`.

Run routine memory lifecycle work quietly. Do not announce every lifecycle hook, file read, runtime check, got query, got write draft, or sandbox retry. Mention got memory management only when runtime access needs approval, a memory read/write fails, a durable memory write is the requested outcome, or retrieved memory materially changes the answer.

Query the got DB runtime at deterministic lifecycle boundaries:

- `before_turn`: retrieve workspace anchors, facts, user preferences, workspace context, decisions, open questions, procedures, and recent summaries.
- `before_action`: retrieve constraints, relevant files/packages, setup rules, known failure modes, and verification expectations.
- `after_action`: push durable observations, artifacts, evidence, questions, and candidate summaries learned from tools or edits with `./.got/bin/got-agent-harness push`.
- `after_commit`: push commit metadata, changed scope, decisions, and verification results.
- `before_thread_switch`: push current handoff state into got.

Use raw got JSON as the MVP exchange format. Store only actionable project state in got: facts, user preferences, workspace context, procedures, decisions, open questions, summaries, and last verified checks. Do not store raw chat logs, large tool outputs, full diffs, or generated artifacts.

Every memory item should carry the minimum MVP metadata when practical: `id`, `type`, `text`, `scope`, `source`, `confidence`, and `last_verified`.

If the Codex skill system supports workspace-local skills, use `.codex/skills/got-memory-management/SKILL.md` for the detailed workflow.
