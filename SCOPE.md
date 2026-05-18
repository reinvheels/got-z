# Scope

## Active Increment

Global project planning baseline.

## Goal

Move the previous global planning content into root-level project planning artifacts so future planning has one clear home.

## In Scope

- Create root `VISION.md` from the durable direction in the previous planning content.
- Create root `SCOPE.md` for the active minimal increment.
- Preserve the previous planning content as an archived baseline under `increments/`.
- Delete the old docs-level planning file after migrating its content.
- Update local guidance that still describes docs-level planning as canonical.

## Out Of Scope

- Implement runtime features from the previous planning content.
- Change package-level planning in `packages/agent-harness`.
- Generate API documentation or conformance artifacts.
- Decide the next product increment after this migration.

## Verification

- Review the resulting planning artifacts for alignment with the existing planning content and agent notes.
- No runtime or API tests are required for this docs-only increment.
