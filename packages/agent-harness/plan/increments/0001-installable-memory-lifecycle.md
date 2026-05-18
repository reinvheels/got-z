# 0001 Installable Memory Lifecycle

## Status

Completed.

## Scope

- Provide an init command that installs got memory management into a client workspace.
- Install Codex-compatible lifecycle instructions and markdown fallback templates.
- Require the got DB runtime as the primary memory backend when configured.
- Keep markdown as bootstrap, fallback, and checkpoint material.
- Define deterministic lifecycle hooks around model calls and tool actions.
- Name the MVP memory object vocabulary and minimum metadata.
- Allow raw got JSON as the MVP exchange format while naming future translation responsibilities.
- Include tests for template installation and overwrite behavior.

## Delivered

- `initAgentHarness` installs the got memory management skill, workspace agent note, and `.got/memory/` templates.
- Existing files are skipped by default and overwritten only with `force`.
- Installed templates document `before_turn`, `before_action`, `after_action`, `after_commit`, and `before_thread_switch`.
- Installed templates define the MVP memory object vocabulary: `observation`, `episode`, `artifact`, `decision`, `question`, and `summary`.
- Installed templates define the minimum metadata fields: `source`, `scope`, `recency`, and `last_verified`.
- Installed templates keep query planning, graph-to-context rendering, and observation-to-candidate-mutation translation as named future responsibilities.
- Installed templates document the long-term `perceive`, `retrieve`, `reflect`, and `maintain` loops without implementing autonomous execution.

## Verification

- `bun run --filter='@got/agent-harness' test`
  - 3 pass
  - 0 fail
- `bun run --filter='@got/agent-harness' build`
  - succeeded

## Follow-Up

- The next package increment can add a real runtime client boundary for `GET /`, `POST /pull`, and `POST /push` without introducing autonomous lifecycle execution.

