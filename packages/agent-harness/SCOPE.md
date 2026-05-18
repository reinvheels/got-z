# Agent Harness Scope

This package owns got memory management for client workspaces. The MVP is the smallest installable shape of the vision: a workspace can opt into a mandatory, runtime-backed memory lifecycle, with markdown only as bootstrap and fallback state.

## MVP Goal

Install got memory management into any workspace and define the minimum lifecycle contract a Codex-compatible client or future custom harness can follow.

## MVP: Memory Lifecycle

- Implement only the installable lifecycle instructions, not autonomous lifecycle execution.
- Require the got DB runtime as the primary memory backend when configured.
- Use markdown only for bootstrap, fallback, and human-readable checkpoints.
- Require deterministic hook boundaries around model calls and tool actions.

## MVP: Memory Object Types

- Name the minimal object vocabulary the harness should write later: `observation`, `episode`, `artifact`, `decision`, `question`, and `summary`.
- Do not implement schemas, validation, or automatic classification in the MVP.

## MVP: Query Lifecycle

- Define the minimum hooks: `before_turn`, `before_action`, `after_action`, `after_commit`, and `before_thread_switch`.
- Require `before_turn` and `before_action` to query got before relying on markdown fallback.
- Require `after_action` and `after_commit` to describe what should be pushed to got, even if the MVP template cannot execute the push itself.

## MVP: got-LLM Translation Layer

- Defer the full translation layer.
- Allow raw got JSON as MVP prompt context and mutation draft format.
- Name the three translation responsibilities: query planning, graph-to-context rendering, and observation-to-candidate-mutation translation.
- Do not implement a planner, renderer, translator, context block template system, or LLM call pipeline in the MVP.

## MVP: Memory Hygiene

- Track only the minimum metadata fields in templates: `source`, `scope`, `recency`, and `last_verified`.
- Do not implement decay, reinforcement, merge, supersede, contradiction handling, salience, or confidence in the MVP.

## MVP: Feature Direction

- Provide an init command that installs the got memory management skill and markdown templates into a client workspace.
- Skip existing files by default and overwrite only with `--force`.
- Include runtime configuration placeholders in `.got/memory/current.md`.
- Include tests for template installation and overwrite behavior.

## MVP: Long-Term Harness Loops

- Document the four long-term loops: perceive, retrieve, reflect, and maintain.
- Implement no background loop runner in the MVP.
- Keep Codex-compatible skills and markdown files as one installation shape, not the product boundary.

## MVP: Contract Implications

- State that future got API contracts should support memory classes, provenance, time, standard edge types, retrieval patterns, translation examples, and maintenance-visible state.
- Do not implement contract generation, query helpers, renderers, translators, or runtime clients in the MVP.

## MVP Out Of Scope

- Replacing the got DB runtime.
- Autonomous reasoning or background maintenance agents.
- Full query planner.
- Full graph-to-natural-language renderer.
- Full LLM-to-graph translator.
- Runtime client for `/push` and `/pull`.
- Fulltext, vector search, or hybrid retrieval.
- Global Codex app context control or native compaction control.
