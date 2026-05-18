---
name: got-project-planning
description: Use when planning this repository or one of its packages through VISION.md, SCOPE.md, and increments/ artifacts. Supports repo-root or package-root planning, reads and updates the active scope and vision in dialogue with the user, and creates completed increment records.
---

# got Project Planning

Use this skill for planning work through three artifacts at a selected planning root:

- `VISION.md`: long-term direction and boundaries.
- `SCOPE.md`: the active, minimal increment.
- `increments/`: completed or archived increment records.

The planning root may be the repository root or a package root. Use the path explicitly named by the user. If no path is named, choose the smallest root that owns the work: package root for package-specific work, repository root for cross-package work.

This skill is local to this workspace. The same structure can later be copied into global Codex skills, but this repository should not install it into client workspaces through the agent-harness templates.

## Required Workflow

1. Determine the planning root.
2. Read `VISION.md`, `SCOPE.md`, and the filenames in `increments/` if they exist.
3. If artifacts are missing and the user is starting planning there, create minimal scaffolds.
4. Discuss changes with the user before broadening vision or scope.
5. Keep `SCOPE.md` to the smallest active increment.
6. Ensure every scope item maps to `VISION.md`. If it does not, update `VISION.md` first in dialogue with the user.
7. When an increment is implemented, create an `increments/NNNN-slug.md` record and then rewrite `SCOPE.md` for the next increment.

## Artifact Rules

`VISION.md` is stable. Update it only when the long-term direction, boundaries, vocabulary, or product thesis changes.

`SCOPE.md` is active. It should describe one small increment, not the whole roadmap. It may mirror `VISION.md` headings as MVP subsets when that helps keep scope aligned.

`increments/` is history. Do not rewrite completed increment records except for factual corrections.

## Increment Record Format

Use the next zero-padded number:

```txt
increments/0001-short-slug.md
```

Use this structure:

```md
# 0001 Short Title

## Status

Completed.

## Scope

- What this increment promised.

## Delivered

- What was implemented or documented.

## Verification

- Commands, checks, or review performed.

## Commits

- Commit hashes and messages when available.

## Follow-Up

- What remains for later increments.
```

## Minimum Scaffolds

When initializing a planning root, create:

```md
# Vision

## Direction

- Not initialized.
```

```md
# Scope

## Active Increment

- Not initialized.
```

Create `increments/` as an empty directory.

## Constraints

- Do not store raw chat logs in planning artifacts.
- Do not expand scope beyond the vision.
- Do not put future roadmap history into `SCOPE.md`; use `increments/` for completed history and `VISION.md` for long-term direction.
- After a small planning update is accepted, suggest committing it as its own changeset.
