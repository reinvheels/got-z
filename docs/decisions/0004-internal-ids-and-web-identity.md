# Internal IDs and Web Identity

## Status

Accepted / Deferred.

## Decision

got should separate internal storage identity from external web identity.

The runtime may use compact internal integer IDs for nodes and edges to keep memory layout, indexing, traversal, snapshots, and persistence efficient.

The public API may continue accepting human-readable JSON node keys. Nodes may also carry optional external identities such as IRIs for compatibility with web standards, linked data, import/export flows, and future JSON-LD or RDF projections.

Internal IDs, API node keys, and external IRIs must not be treated as the same concept.

## Context

got is intended to be a local graph memory database for AI agent harnesses, so low-overhead local reads and writes matter. Integer IDs are a good fit for internal graph storage and future custom layouts.

At the same time, long-term memory should not become isolated from the broader web data ecosystem. IRIs and linked-data-compatible identifiers can make exported memories easier to connect with standard vocabularies, external systems, and web semantics later.

## Consequences

- Runtime internals can later optimize around integer IDs without forcing those IDs into the public API.
- The API contract should eventually describe the distinction between local node keys, internal IDs, and optional external identifiers.
- Persistence formats should preserve enough identity metadata to support future import/export and projection workflows.
- JSON-LD, RDF, SPARQL, or standard ontology support should be added as optional projections or bridges, not as required internal runtime representation.
