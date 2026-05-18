# Scope

## Active Increment

root/0002 - plan directory layout.

## Goal

Collect planning artifacts under a local `plan/` directory at each planning root.

## In Scope

- Move repository-level planning artifacts to `plan/`.
- Move `packages/agent-harness` planning artifacts to `packages/agent-harness/plan/`.
- Update the local project-planning skill to resolve artifacts under `<planning-root>/plan/`.
- Update agent guidance to describe the new planning artifact locations.

## Out Of Scope

- Change the planning schema beyond the artifact location.
- Implement runtime, API, or harness product features.
- Add completed increment records for packages that do not have completed package-level increments yet.

## Verification

- Verify no top-level `VISION.md`, `SCOPE.md`, or `increments/` planning artifacts remain.
- Verify planning references point to `plan/`.
- No runtime or API tests are required for this docs-only increment.
