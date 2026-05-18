# Agent Harness Scope

## Active Increment

@got/agent-harness/0003 - runtime CLI boundary. Completed; awaiting an explicitly started next increment.

## Goal

Add the smallest package-owned runtime CLI boundary so future harness code can ensure a workspace-singleton got runtime, then pull and push memory through stable `got-agent-harness` commands instead of embedding `curl` details or requiring the runtime binary in `PATH`.

## In Scope

- Add a Bun-native runtime client module for `GET /`, `POST /pull`, and `POST /push`.
- Export CLI commands for `pull` and `push` using raw got JSON.
- Export `runtime ensure`, `runtime start`, `runtime status`, and `runtime stop` commands.
- Make `pull` and `push` ensure the workspace runtime before using the HTTP API.
- Keep runtime process metadata in workspace-local files under `.got/`.
- Protect workspace runtime startup with a lock path so concurrent chats do not launch duplicate runtimes.
- Start ensured runtimes as detached host processes that survive the CLI invocation.
- Keep raw got JSON as the request and response format.
- Accept explicit runtime configuration from the initialized workspace state.
- Support a configurable runtime binary path so client workspaces do not depend on `db-runtime` being in `PATH`.
- Surface graceful errors from failed HTTP calls and non-OK responses.
- Add focused tests for successful readiness, pull, push, failed runtime responses, and runtime process command behavior.

## Out Of Scope

- Installing or building the got DB runtime.
- Autonomous reasoning or background maintenance agents.
- Query planning.
- Graph-to-natural-language rendering.
- LLM-to-graph translation.
- Context block template systems.
- Fulltext, vector search, or hybrid retrieval.
- Global Codex app context control or native compaction control.

## Verification

- `bun run --filter='@got/agent-harness' test`
- `bun run --filter='@got/agent-harness' build`
