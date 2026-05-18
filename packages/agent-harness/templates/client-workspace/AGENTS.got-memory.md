## got Memory Management

Use got memory management in this workspace.

The got DB runtime is the primary memory backend. Markdown files under `.got/memory/` are bootstrap, fallback, and checkpoint material.

Before substantive work, read `.got/memory/current.md` to find runtime configuration and fallback state, then query the got DB runtime for relevant workspace, user, task, decision, procedure, and recent activity context. For architecture, planning, or handoff work, also read `.got/memory/open-questions.md` and `.got/memory/checkpoints.md`.

Query the got DB runtime before turns, before actions, after actions, after commits, and before thread switches. After meaningful progress, push durable observations to got and update `.got/memory/current.md` as a compact fallback. Store only actionable project state: active goal, implementation state, recent decisions, open questions, next steps, and last verified checks. Do not store raw chat logs, large tool outputs, full diffs, or generated artifacts.

If the Codex skill system supports workspace-local skills, use `.codex/skills/got-memory-management/SKILL.md` for the detailed workflow.
