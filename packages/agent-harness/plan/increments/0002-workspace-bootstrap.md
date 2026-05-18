# 0002 Workspace Bootstrap

## Status

Completed.

## Scope

- Extend `got-agent-harness init` with bootstrap options for workspace name, runtime URL, runtime working directory, persistence mode, and AGENTS.md wiring.
- Render `.got/memory/current.md` from bootstrap options instead of leaving runtime fields unconfigured.
- Create the runtime working directory during init unless `--dry-run` is used.
- Preserve template skip behavior by default and overwrite only with `--force`.
- Keep runtime startup, process supervision, readiness checks, graph seeding, and runtime clients out of scope.

## Delivered

- `initAgentHarness` now accepts `withAgents`, `workspaceName`, `runtimeUrl`, `runtimeCwd`, and `persistent` options.
- `got-agent-harness init` now supports `--with-agents`, `--workspace-name`, `--runtime-url`, `--runtime-cwd`, and `--persistent`.
- `AGENTS.md` can be created or updated idempotently with got memory-management markers.
- `.got/memory/current.md` is rendered with workspace identity, runtime URL, port, working directory, persistence expectation, lifecycle hooks, and runtime commands.
- The configured runtime working directory defaults to `.got/db` and is created during init.
- Dry-run reports intended actions without writing files or creating directories.

## Verification

- `bun run --filter='@got/agent-harness' test`
  - 7 pass
  - 0 fail
- `bun run --filter='@got/agent-harness' build`
  - succeeded
- Manual dry-run:
  - `got-agent-harness init <tmp-workspace> --with-agents --runtime-url http://127.0.0.1:3199 --runtime-cwd .got/db --persistent --dry-run`

## Follow-Up

- Add a package-owned runtime client boundary for readiness, pull, and push using raw got JSON.
