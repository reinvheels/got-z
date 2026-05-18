## got Memory Management

got memory management is active in this workspace by default. The user does not need to mention it in each prompt.

The got DB runtime is the only memory source. Markdown files under `.got/memory/` are runtime bootstrap/configuration only. Do not answer memory questions from Markdown and do not treat Markdown as memory.

Before substantive work, read `.got/memory/current.md` only to find workspace identity and runtime configuration. Then use `./.got/bin/got-agent-harness runtime status` to check the runtime, `./.got/bin/got-agent-harness runtime start` if it is not reachable, and `./.got/bin/got-agent-harness pull` to query the default `got-memory` anchor.

If harness runtime commands fail in a sandboxed client, request the available permission, escalation, or unsandboxed command path for `./.got/bin/got-agent-harness` and retry before declaring memory unavailable. If the runtime still cannot be reached, say that got memory is unavailable; do not substitute Markdown memory.

`./.got/bin/got-agent-harness runtime start` is a long-running command intended to stay open as a Codex background tool session. Use `runtime start --detach` only when explicitly starting it from a normal terminal.

Do not read runtime storage files as memory. Files such as `.got/db/got.wal`, snapshots, checkpoints, or other DB runtime internals are implementation details.

Because got pulls are explicit projections, write durable MVP memory under the stable `got-memory` node. Use `user_preferences`, `workspace_context`, `active_goal`, `current_state`, `recent_decisions`, `open_questions`, `procedures`, `summaries`, and `last_updated` as the retrievable memory properties.

Run routine memory lifecycle work quietly. Do not announce every lifecycle hook, file read, runtime check, got query, got write draft, or sandbox retry. Mention got memory management only when runtime access needs approval, a memory read/write fails, a durable memory write is the requested outcome, or retrieved memory materially changes the answer.

Query the got DB runtime at deterministic lifecycle boundaries:

- `before_turn`: retrieve workspace anchors, user preferences, active goals, decisions, open questions, procedures, and recent summaries.
- `before_action`: retrieve constraints, relevant files/packages, setup rules, known failure modes, and verification expectations.
- `after_action`: push durable observations, artifacts, evidence, questions, and candidate summaries learned from tools or edits with `./.got/bin/got-agent-harness push`.
- `after_commit`: push commit metadata, changed scope, decisions, and verification results.
- `before_thread_switch`: push current handoff state into got.

Use raw got JSON as the MVP exchange format. Store only actionable project state in got: active goal, implementation state, recent decisions, open questions, next steps, and last verified checks. Do not store raw chat logs, large tool outputs, full diffs, or generated artifacts.

Every memory item should carry the minimum MVP metadata when practical: `source`, `scope`, `recency`, and `last_verified`.

If the Codex skill system supports workspace-local skills, use `.codex/skills/got-memory-management/SKILL.md` for the detailed workflow.
