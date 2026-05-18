---
name: got-project-planning
description: Use when planning this repository or one of its packages through plan/VISION.md, plan/SCOPE.md, and plan/increments/ artifacts. Supports repo-root or package-root planning, reads and updates the active scope and vision in dialogue with the user, and creates completed increment records.
---

# got Project Planning

Use this skill for planning work through three artifacts in `plan/` below a selected planning root:

- `plan/VISION.md`: long-term direction and boundaries.
- `plan/SCOPE.md`: the active, minimal increment.
- `plan/increments/`: completed or archived increment records.

The planning root may be the repository root or a package root. Use the path explicitly named by the user. If no path is named, choose the smallest root that owns the work: package root for package-specific work, repository root for cross-package work.

The planning directory is always `<planning-root>/plan`. Do not place planning artifacts directly at the planning root.

This skill is local to this workspace. The same structure can later be copied into global Codex skills, but this repository should not install it into client workspaces through the agent-harness templates.

## Required Workflow

1. Determine the planning root.
2. Read `plan/VISION.md`, `plan/SCOPE.md`, and the filenames in `plan/increments/` if they exist.
3. If artifacts are missing and the user is starting planning there, create minimal scaffolds.
4. Discuss changes with the user before broadening vision or scope.
5. Keep `plan/SCOPE.md` to the smallest active increment.
6. Ensure every scope item maps to `plan/VISION.md`. If it does not, update `plan/VISION.md` first in dialogue with the user.
7. When an increment is implemented, create a `plan/increments/NNNN-slug.md` record and then rewrite `plan/SCOPE.md` for the next increment.

## Artifact Rules

`plan/VISION.md` is stable. Update it only when the long-term direction, boundaries, vocabulary, or product thesis changes.

`plan/SCOPE.md` is active. It should describe one small increment, not the whole long-term plan. It may mirror `plan/VISION.md` headings as MVP subsets when that helps keep scope aligned.

`plan/increments/` is history. Do not rewrite completed increment records except for factual corrections.

## Increment Record Format

Use the next zero-padded number:

```txt
plan/increments/0001-short-slug.md
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

## Follow-Up

- What remains for later increments.
```

## Commit Message Convention

Commit messages should reference the increment id when a change belongs to a planned increment. Use `root/NNNN` for repository-level planning and the package name plus increment number for package-level planning, for example `root/0002: migrate planning artifacts` or `@got/agent-harness/0001: add init templates`.

Do not track commit hashes inside increment records. Git history should point to increments, not the other way around.

## Minimum Scaffolds

When initializing a planning root, create `plan/VISION.md`:

```md
# Vision

## Direction

- Not initialized.
```

Create `plan/SCOPE.md`:

```md
# Scope

## Active Increment

- Not initialized.
```

Create `plan/increments/` as an empty directory.

## Constraints

- Do not store raw chat logs in planning artifacts.
- Do not expand scope beyond the vision.
- Do not put future backlog history into `plan/SCOPE.md`; use `plan/increments/` for completed history and `plan/VISION.md` for long-term direction.
- After a small planning update is accepted, suggest committing it as its own changeset using the relevant increment id when one exists.
