# got Memory Management

This directory contains bootstrap and fallback workspace state for got memory management.

The primary memory backend should be the got DB runtime. These markdown files keep agent work recoverable when starting a thread, handing off context, or operating while the runtime is unavailable.

got memory management should query the got DB runtime continuously during the agent lifecycle: before turns, before actions, after actions, after commits, and before thread switches. Markdown mirrors only the compact state needed for recovery.

## Files

- `current.md`: runtime configuration plus compact current goal, implementation state, decisions, open questions, next steps, and verification.
- `open-questions.md`: unresolved questions mirrored from or queued for got.
- `checkpoints.md`: concise progress checkpoints rendered from got after commits, decisions, or larger work blocks.

Do not store raw chat logs, large command output, full diffs, or generated artifacts here.
