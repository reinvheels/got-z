# API Validation Semantics

## Status

Accepted / Deferred.

## Decision

got should validate `/push` and `/pull` requests inside the Zig runtime before accepting them.

For `/push`, the runtime should perform full request validation during the first traversal or serialization pass. An invalid push should fail gracefully, should not be appended to persistence, and should not mutate the graph.

For `/pull`, an invalid query should fail gracefully without state effects, similar to how a database rejects an invalid query.

## Context

Validation needs to protect the runtime contract, not only TypeScript callers. The TypeScript API contract can help generate fixtures, documentation, and validation code, but runtime enforcement belongs on the Zig side.

Push requests are expected to be small in normal operation. Large imports can pay the validation cost explicitly. Performing validation during the first traversal keeps the initial implementation conservative and avoids separate speculative mutation or rollback machinery.

## Consequences

- Current persistence may continue storing accepted raw HTTP bodies in the WAL.
- Invalid pushes must be rejected before WAL append and graph mutation.
- Implementing this may add extra traversal cost for large pushes until a later canonical push plan or binary representation exists.
- The implementation is intentionally deferred while the contract and storage interfaces continue to settle.
