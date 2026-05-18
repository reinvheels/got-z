---
name: got-memory-management
description: Use when working in a workspace that has got memory management installed. It continuously queries the got DB runtime before turns, before actions, after actions, after commits, and before thread switches; markdown state files are only bootstrap, fallback, and checkpoint material.
---

# got Memory Management

got memory management is the workspace-level lifecycle layer for keeping agent context compact and recoverable. It is not the got runtime, but it should use the got DB runtime as the primary memory backend whenever one is configured. Local markdown state files are bootstrap, fallback, and human-readable checkpoints.

## Required Workflow

When this skill is active:

1. Read `.got/memory/current.md` to discover workspace identity, got runtime configuration, and fallback state.
2. Query the got DB runtime for relevant workspace, user, task, decision, procedure, and recent activity context.
3. Read `.got/memory/open-questions.md` when the task touches planning, architecture, or unresolved decisions.
4. Read `.got/memory/checkpoints.md` when reconstructing recent progress or preparing a thread handoff.
5. Read workspace `AGENTS.md` if it exists.
6. Before actions, query got for relevant constraints, decisions, next steps, and verification requirements.
7. After meaningful progress, write durable observations back to got and update markdown checkpoints with concise, actionable project state.

## got Runtime Queries

The got DB runtime should be queried throughout the agent lifecycle, not only at thread start:

- `before_turn`: query workspace anchors, user preferences, active task state, accepted decisions, open questions, and recent checkpoints.
- `before_action`: query constraints, procedures, affected files/packages, and relevant decisions before running tools.
- `after_action`: summarize tool results and push useful observations, evidence, and changed state into got.
- `after_commit`: push commit metadata and link it to task, files, decisions, and verification results.
- `before_thread_switch`: query current graph state, render a compact handoff, and update markdown fallback files.

If the got runtime is unavailable, use markdown state files as fallback and record that runtime-backed memory was not refreshed.

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
