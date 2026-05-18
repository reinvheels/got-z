# 0003 Runtime CLI Boundary

## Status

Completed.

## Scope

- Add a package-owned runtime client boundary for `GET /`, `POST /pull`, and `POST /push`.
- Export stable CLI commands for `pull`, `push`, `runtime ensure`, `runtime start`, `runtime status`, and `runtime stop`.
- Make `pull` and `push` ensure the workspace runtime before using the HTTP API.
- Keep runtime process metadata in workspace-local files under `.got/`.
- Protect runtime startup with a workspace lock so concurrent chats do not launch duplicate runtimes.
- Start ensured runtimes as detached host processes that survive the CLI invocation.
- Keep got runtime as the only memory source; Markdown files are bootstrap/configuration only.

## Delivered

- `GotRuntimeClient` wraps readiness, pull, and push with raw got JSON.
- `runtime ensure` starts or reuses a workspace singleton runtime.
- `pull` and `push` automatically call `ensureRuntime` before exchanging JSON.
- Runtime metadata is stored under `.got/runtime.pid`, `.got/runtime.state.json`, `.got/runtime.log`, and `.got/runtime.lock`.
- Workspace templates, `AGENTS.got-memory.md`, and the got memory skill document the runtime-only memory flow.
- `got-agent-harness init` writes the runtime lock path into `.got/runtime.json`.
- Older runtime config files without `lockFile` default to `.got/runtime.lock`.

## Verification

- `bunx tsc --noEmit -p packages/agent-harness/tsconfig.json`
- `bun run --filter='@got/agent-harness' test`
  - 13 pass
  - 0 fail
- `bun run --filter='@got/agent-harness' build`
  - succeeded
- `git diff --check`
- Manual singleton smoke test on a tmp workspace:
  - first `./.got/bin/got-agent-harness runtime ensure` returned `started`
  - second `./.got/bin/got-agent-harness runtime ensure` returned `already-running` with the same PID
  - `./.got/bin/got-agent-harness pull` returned `{}` through the public API
  - `lsof` showed exactly one `db-runtime` listener
  - `./.got/bin/got-agent-harness runtime stop` stopped the runtime cleanly
- Manual cross-chat memory test:
  - one chat stored "Aepfel sind rot"
  - another chat retrieved that memory through got
  - a second chat stored "Bananen sind gelb" and "Aepfel und Bananen sind Obst"
  - the first chat later retrieved all three statements

## Follow-Up

- Decide the next explicitly started increment before adding more harness behavior.
