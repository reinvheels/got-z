## got Memory Management

Use got memory management in this workspace.

The got DB runtime is the primary memory backend. Markdown files under `.got/memory/` are bootstrap, fallback, and human-readable checkpoint material.

Before substantive work, read `.got/memory/current.md` to find workspace identity, runtime configuration, and fallback state, then query the got DB runtime for relevant workspace, user, task, decision, procedure, artifact, question, summary, and recent activity context. For architecture, planning, or handoff work, also read `.got/memory/open-questions.md` and `.got/memory/checkpoints.md`.

Query the got DB runtime at deterministic lifecycle boundaries:

- `before_turn`: retrieve workspace anchors, user preferences, active goals, decisions, open questions, procedures, and recent checkpoints.
- `before_action`: retrieve constraints, relevant files/packages, setup rules, known failure modes, and verification expectations.
- `after_action`: push durable observations, artifacts, evidence, questions, and candidate summaries learned from tools or edits.
- `after_commit`: push commit metadata, changed scope, decisions, and verification results.
- `before_thread_switch`: retrieve current memory state and refresh markdown fallback files.

Use raw got JSON as the MVP exchange format. Full query planning, graph-to-context rendering, and observation-to-candidate-mutation translation are named responsibilities, but not implemented here. Store only actionable project state: active goal, implementation state, recent decisions, open questions, next steps, and last verified checks. Do not store raw chat logs, large tool outputs, full diffs, or generated artifacts.

Every memory item should carry the minimum MVP metadata when practical: `source`, `scope`, `recency`, and `last_verified`.

If the Codex skill system supports workspace-local skills, use `.codex/skills/got-memory-management/SKILL.md` for the detailed workflow.
