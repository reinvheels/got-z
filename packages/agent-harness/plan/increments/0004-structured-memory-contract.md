# 0004 Structured Memory Contract

## Status

Planned.

## Goal

Make memory writes predictable by defining a minimal contract for the `got-memory` anchor. The agent should classify what it stores before writing it, instead of placing every remembered statement into whichever top-level slot happens to exist.

## Problem

The runtime-backed cross-chat memory test worked, but it exposed a semantic weakness: a general fact such as "Aepfel sind rot" can be stored as a `user_preferences` value. That proves the storage path works, but it will make long-running memory noisy and harder to query.

The next increment should keep the working runtime path and add just enough structure to avoid that drift.

## In Scope

- Define the MVP top-level shape under the stable `got-memory` node.
- Keep the shape understandable to humans and easy for an LLM to write as raw got JSON.
- Clearly separate:
  - `facts`: general remembered statements treated as true.
  - `user_preferences`: stable user tendencies, instructions, or style choices.
  - `workspace_context`: durable facts about the current workspace.
  - `procedures`: reusable workflows or rules of action.
  - `decisions`: accepted directions that should affect future work.
  - `open_questions`: unresolved questions or uncertainties.
  - `summaries`: compact state derived from multiple observations.
  - `last_updated`: short verification or timestamp note for the anchor.
- Define the minimum entry fields:
  - `id`: stable local identifier where practical.
  - `type`: memory object type, matching the slot.
  - `text`: compact human-readable content.
  - `scope`: user, workspace, project, repo, thread, task, or global.
  - `source`: user, tool, file, commit, runtime, or derived.
  - `confidence`: high, medium, low, or unknown.
  - `last_verified`: timestamp, command, or human confirmation.
- Update the default memory pull query only if the new contract requires it.
- Update the installed skill and AGENTS template so agents classify writes before pushing to got.
- Add tests that verify the installed instructions:
  - got runtime remains the only memory source.
  - facts are not described as user preferences.
  - preferences are reserved for stable user tendencies or instructions.

## Out Of Scope

- Full schema generation from TypeScript.
- OpenAPI or JSON Schema output.
- Zig-side validation.
- Automatic migration of memories already written in old shapes.
- Natural-language rendering of memory into prompt blocks.
- LLM-based observation-to-mutation translation.
- Automated maintenance, merging, decay, or contradiction handling.
- New runtime endpoints.

## Acceptance Criteria

- A new install of `got-agent-harness init --with-agents` explains the memory contract clearly.
- The skill gives agents enough guidance to store "Aepfel sind rot" as a fact, not a user preference.
- The default `pull` command still retrieves the full MVP anchor state needed by a new chat.
- Package tests cover the contract text and slot distinction.
- Typecheck, tests, and build pass.

## Verification Plan

- `bunx tsc --noEmit -p packages/agent-harness/tsconfig.json`
- `bun run --filter='@got/agent-harness' test`
- `bun run --filter='@got/agent-harness' build`
- Manual tmp-workspace check:
  - ask one chat to remember a fact
  - ask another chat to remember a user preference
  - verify `pull` returns them in different slots

## Follow-Up

- Consider a small `memory remember` CLI only after the written contract has proven stable in manual tests.
