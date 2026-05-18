# Agent Harness Scope

## Active Increment

@got/agent-harness/0002 - workspace bootstrap.

## Goal

Reduce manual setup before starting Codex in a new workspace. A single init command should install the got memory-management artifacts, prepare local fallback state, wire the workspace agent notes, and record runtime configuration.

## In Scope

- Extend `got-agent-harness init` with explicit bootstrap options:
  - `--with-agents`: create or update `AGENTS.md` by appending the got memory-management include with idempotent markers.
  - `--workspace-name <name>`: write workspace identity into `.got/memory/current.md`; default to the target directory name.
  - `--runtime-url <url>`: write the configured got runtime URL into `.got/memory/current.md`.
  - `--runtime-cwd <path>`: create the runtime working directory, defaulting to `.got/db`.
  - `--persistent`: mark runtime persistence as expected in `.got/memory/current.md`.
- Preserve current template-copy behavior: skip existing files by default, overwrite templates only with `--force`, and support `--dry-run`.
- Render `.got/memory/current.md` from the chosen bootstrap options instead of leaving all runtime fields as `not configured`.
- Create `.got/db` or the configured runtime working directory during init unless `--dry-run` is used.
- Add a short CLI summary that tells the user the exact runtime command to run before starting Codex.
- Add tests for AGENTS.md creation, idempotent AGENTS.md update, runtime config rendering, runtime directory creation, `--force`, and `--dry-run`.

## Out Of Scope

- Starting, supervising, or installing the got DB runtime.
- Autonomous reasoning or background maintenance agents.
- Initial graph seeding via `/push`.
- Runtime readiness checks.
- Runtime process files.
- General runtime client module.
- Query planning.
- Graph-to-natural-language rendering.
- LLM-to-graph translation.
- Context block template systems.
- Fulltext, vector search, or hybrid retrieval.
- Global Codex app context control or native compaction control.

## Verification

- `bun run --filter='@got/agent-harness' test`
- `bun run --filter='@got/agent-harness' build`
- Manual dry-run example:
  - `got-agent-harness init <tmp-workspace> --with-agents --runtime-url http://127.0.0.1:3199 --runtime-cwd .got/db --persistent --dry-run`
