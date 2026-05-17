# Decision Records

Use this directory for durable design decisions that future work should treat as project context.

## Schema

Each decision should use this structure:

- `Title`: short noun phrase in the top-level heading.
- `Status`: one of `Proposed`, `Accepted`, `Accepted / Deferred`, `Superseded`, or `Rejected`.
- `Decision`: the concrete rule or direction.
- `Context`: why the decision exists.
- `Consequences`: what future work must account for.

Use `Accepted / Deferred` when the direction is decided, but implementation is intentionally postponed. If a later decision replaces an earlier one, mark the older record as `Superseded` and link to the replacement.
