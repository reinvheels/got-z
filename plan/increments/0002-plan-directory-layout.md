# 0002 Plan Directory Layout

## Status

Completed.

## Scope

- Move repository-level planning artifacts to `plan/`.
- Move `packages/agent-harness` planning artifacts to `packages/agent-harness/plan/`.
- Update the local project-planning skill to resolve artifacts under `<planning-root>/plan/`.
- Update agent guidance to describe the new planning artifact locations.

## Delivered

- Root planning now lives under `plan/`.
- Agent harness package planning now lives under `packages/agent-harness/plan/`.
- The project-planning skill now treats `<planning-root>/plan/` as the artifact directory.
- `AGENTS.md` now points future agents at the `plan/` layout.

## Verification

- Verified no top-level `VISION.md`, `SCOPE.md`, or `increments/` planning artifacts remain.
- Verified planning references point to `plan/`.
- No runtime or API tests were required for this docs-only increment.

## Follow-Up

- Use `plan/SCOPE.md` for the next root-level increment.

