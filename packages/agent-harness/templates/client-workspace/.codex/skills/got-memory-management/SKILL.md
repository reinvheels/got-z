---
name: got-memory-management
description: Use when working in a workspace that has got memory management installed. It continuously queries the got DB runtime before turns, before actions, after actions, after commits, and before thread switches; markdown state files are only bootstrap, fallback, and checkpoint material.
---

# got Memory Management

got memory management is the workspace-level lifecycle layer for keeping agent context compact and recoverable. It is not the got runtime, but it should use the got DB runtime as the primary memory backend whenever one is configured. Local markdown state files are bootstrap, fallback, and human-readable checkpoints.

## Activation And User Communication

When got memory management is installed through workspace `AGENTS.md`, treat this skill as active by default. The user should not have to mention got memory management in every prompt.

Run routine memory lifecycle work quietly. Do not announce every lifecycle hook, file read, runtime check, got query, got write draft, or sandbox retry. User-facing updates should focus on the user's task. Mention got memory management only when runtime access needs approval, a memory read/write fails, a durable memory write is the requested outcome, or retrieved memory materially changes the answer.

## Required Workflow

When this skill is active:

1. Read `.got/memory/current.md` to discover workspace identity, got runtime configuration, and fallback state.
2. Check the runtime with `./.got/bin/got-agent-harness runtime status` when a got runtime is configured.
3. If the runtime is not reachable, start it with `./.got/bin/got-agent-harness runtime start` and then check status again.
4. If the harness CLI is blocked in a sandboxed client, request the client's permission or escalation path for `./.got/bin/got-agent-harness` and retry before treating got as unavailable.
5. Query the got DB runtime with `./.got/bin/got-agent-harness pull` for the default `got-memory` anchor before using fallback files.
6. Use markdown state only as bootstrap, fallback, or human-readable checkpoint material.
7. Read `.got/memory/open-questions.md` when the task touches planning, architecture, or unresolved decisions.
8. Read `.got/memory/checkpoints.md` when reconstructing recent progress or preparing a thread handoff.
9. Read workspace `AGENTS.md` if it exists.
10. Before actions, query got for relevant constraints, decisions, next steps, and verification requirements.
11. After meaningful progress, describe durable observations as raw got JSON candidate mutations, push them to got with `./.got/bin/got-agent-harness push` when runtime access is available, and update markdown checkpoints with concise, actionable project state.

## Runtime Contract

The MVP assumes the got DB runtime is a local HTTP service:

- Runtime status: `./.got/bin/got-agent-harness runtime status`.
- Runtime start: `./.got/bin/got-agent-harness runtime start`.
- Runtime stop: `./.got/bin/got-agent-harness runtime stop`.
- Read: `./.got/bin/got-agent-harness pull` wraps `POST /pull` with raw got JSON projection requests.
- Write: `./.got/bin/got-agent-harness push` wraps `POST /push` with raw got JSON graph mutations.
- Persistence: explicit runtime mode, configured outside this skill.
- Data location: runtime working directory, configured outside this skill.

`runtime start` is a long-running command intended to stay open as a Codex background tool session. Use `runtime start --detach` only when explicitly starting it from a normal terminal where a detached process is desired.

Localhost access may be sandboxed in Codex-like clients. Use the workspace-local harness CLI instead of direct `curl`. If `runtime status`, `runtime start`, `pull`, or `push` fails with connection refused, operation not permitted, `EPERM`, `EACCES`, or a generic connection failure, do not conclude the runtime is down yet. First request the client's permission, escalation, or unsandboxed command path for `./.got/bin/got-agent-harness` and retry the same command. Only fall back to markdown after the permitted retry fails or the user declines.

If the runtime is still unavailable after that retry, continue from markdown fallback state and record that got-backed memory was not refreshed.

Do not read runtime storage files as a memory source. Files such as `.got/db/got.wal`, snapshots, checkpoints, or other DB runtime internals are implementation details. If `/pull` returns no relevant memory, report that the public got API did not return memory and use only the markdown fallback files. Never parse the WAL or snapshot files to recover memory.

## Memory Anchor

Because got pulls are explicit projections, `pull` without a body uses the harness default memory query for the stable node `got-memory`. Durable MVP memory should be written under that node so later turns can retrieve it without knowing ad hoc IDs.

Use these properties on `got-memory`:

- `user_preferences`: personal preferences the user wants remembered.
- `workspace_context`: durable workspace identity and setup facts.
- `active_goal`: current durable task direction.
- `current_state`: compact implementation state.
- `recent_decisions`: accepted decisions that affect future work.
- `open_questions`: unresolved questions.
- `procedures`: reusable working procedures.
- `summaries`: compact summaries over multiple observations.
- `last_updated`: timestamp or short verification note for the memory anchor.

Example durable preference write:

```json
{
  "got-memory": {
    "user_preferences": {
      "commit_timing": "Suggest commits only after a completed small work step, not in the middle of unfinished implementation."
    },
    "last_updated": "user-confirmed preference"
  }
}
```

## Memory Object Vocabulary

Use this minimal vocabulary when drafting memory writes:

- `observation`: something was seen, said, done, read, or produced.
- `episode`: a concrete task, conversation, tool run, commit, or error.
- `artifact`: a file, commit, document, test run, screenshot, or produced object.
- `decision`: an accepted direction with status and context.
- `question`: an unresolved question or uncertainty.
- `summary`: a compact memory derived from multiple observations or episodes.

Each durable memory should include the minimum MVP metadata when practical:

- `source`: where the memory came from.
- `scope`: workspace, project, repo, user, agent, session, thread, or task.
- `recency`: when it was observed or last used.
- `last_verified`: the last check, command, or human confirmation.

## got Runtime Queries

The got DB runtime should be queried throughout the agent lifecycle, not only at thread start:

- `before_turn`: query workspace anchors, user preferences, active task state, accepted decisions, open questions, procedures, and recent checkpoints.
- `before_action`: query constraints, relevant files/packages, setup rules, known failure modes, and verification expectations before running tools.
- `after_action`: summarize tool results and push useful observations, evidence, artifact state, questions, and candidate summaries into got.
- `after_commit`: push commit metadata and link it to task, files, decisions, and verification results.
- `before_thread_switch`: query current graph state, render a compact handoff, and update markdown fallback files.

## Translation Responsibilities

Raw got JSON is allowed as MVP prompt context and mutation draft format. Keep the following responsibilities distinct even though the MVP does not implement them as code:

- Query planning decides what to ask got.
- Graph-to-context rendering decides how got results enter model context.
- Observation-to-candidate-mutation translation decides what should be written after new observations.

## Long-Term Lifecycle Loops

The long-term harness should grow toward four loops:

- `perceive`: collect observations from conversation, tools, files, tests, commits, and runtime behavior.
- `retrieve`: activate relevant memories for the current workspace, task, action, and user.
- `reflect`: derive facts, patterns, contradictions, procedures, decisions, and hypotheses.
- `maintain`: condense, merge, decay, supersede, archive, and surface conflicts.

The MVP installs instructions only. It does not run autonomous background loops.

## State Update Rules

Write only durable working context to got and mirror the compact subset in markdown:

- Active goal.
- Current implementation state.
- Recent decisions.
- Open questions.
- Next steps.
- Last verified commands or checks.

Do not store raw chat logs, large tool output, full diffs, generated artifacts, or speculative notes without a concrete next action.

## Lifecycle Hooks

Use these hooks as a mental checklist:

- `before_turn`: query got and load fallback state.
- `before_action`: query got for constraints, decisions, procedures, and verification expectations.
- `after_action`: summarize useful observations from tool output and push them to got.
- `after_commit`: record the commit hash, changed scope, and verification result in got.
- `before_thread_switch`: render got state into compact markdown fallback so the next thread can resume without raw history.

## Files

- `.got/memory/current.md`: bootstrap and fallback current working state, including got runtime configuration.
- `.got/memory/open-questions.md`: unresolved questions mirrored from or queued for got.
- `.got/memory/checkpoints.md`: compact human-readable checkpoints rendered from got after commits or decisions.
