# Agent Harness Scope

This package owns got memory management for client workspaces. It is workspace-agnostic harness infrastructure that uses a got DB runtime as its memory backend.

## MVP Goal

The MVP should make got memory management installable into any workspace and define the mandatory runtime-backed lifecycle from the vision in a form that Codex-compatible clients or future custom harnesses can follow.

## MVP In Scope

- Client workspace init command that installs got memory management templates.
- Workspace-local skill template for Codex-compatible clients.
- Workspace markdown templates for bootstrap, fallback, and human-readable checkpoints.
- Runtime configuration placeholder in `.got/memory/current.md`.
- Clear rule that the got DB runtime is the primary memory backend.
- Clear rule that lifecycle hooks are invoked by a harness orchestrator around model calls and tool actions, not by the LLM as free-form reasoning discipline.
- Mandatory lifecycle hook `before_turn`: retrieve workspace anchors, active task state, decisions, open questions, and recent checkpoints from got.
- Mandatory lifecycle hook `before_action`: retrieve constraints, procedures, affected files/packages, and relevant decisions from got.
- Mandatory lifecycle hook `after_action`: perceive tool results, condense useful observations, and push them to got.
- Mandatory lifecycle hook `after_commit`: treat commit metadata, changed scope, and verification result as an episode/artifact update in got.
- Mandatory lifecycle hook `before_thread_switch`: retrieve got state, use it to render compact handoff context, and update markdown fallback files.
- Safe init behavior: skip existing files by default and overwrite only with `--force`.
- Tests for template installation and overwrite behavior.

## MVP Out Of Scope

- Replacing the got DB runtime.
- Implementing autonomous reasoning inside this package.
- Full query planner implementation.
- Full graph-to-natural-language renderer implementation.
- Full LLM-to-graph translator implementation.
- Background maintenance agents for dedupe, decay, salience, confidence, or conflict resolution.
- Fulltext or vector search.
- Global Codex app context control or native compaction control.

## Hook Execution Model

The LLM is the reasoner. The harness is the scheduler. got is the memory backend.

The lifecycle should run as deterministic orchestration around model calls:

```txt
receive user message
-> before_turn queries got and renders working context
-> model call
-> before_action guards or enriches tool calls
-> tool execution
-> after_action summarizes results and pushes observations to got
-> optional model call with compact action result
-> after_turn or before_thread_switch writes durable state
```

The LLM may request additional memory, but the mandatory lifecycle hooks must not depend on the LLM remembering to ask for them.

## Post-MVP

- Runtime client for `/push` and `/pull`.
- Query helpers for common lifecycle reads.
- Renderer helpers that convert got graph JSON into compact prompt context.
- Candidate mutation helpers for observations, decisions, procedures, commits, files, and checkpoints.
- Workspace identity detection.
- Runtime availability checks and fallback reporting.
- Adapter layer for Codex-style clients.
- Progressive retrieval with recency bands, exclusion sets, and query budgets.
