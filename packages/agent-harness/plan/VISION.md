# Agent Harness Vision

got memory management should make an agent harness feel like it has a living second brain. The missing piece is not only storing more data; it is a continuous memory lifecycle around the agent.

The lifecycle is outside the got runtime. got is the graph storage backend. The harness perceives, retrieves, reflects, writes, and maintains memory by querying and mutating got.

The LLM is the reasoner, the harness is the scheduler, and got is the memory backend. Lifecycle work should be invoked by deterministic harness orchestration around model calls and tool actions, not by relying on the LLM to remember memory-management instructions inside free-form reasoning.

got memory management should be client-agnostic. Codex-compatible skills and markdown bootstrap/configuration files are one installation shape, not the product boundary.

## Memory Lifecycle

A useful agent memory system needs recurring phases:

- Perceive: observe what was said, done, read, tested, changed, or decided.
- Classify: decide what kind of memory an observation may become.
- Retrieve: activate relevant memories for the current context.
- Use: render graph memory into compact working context for the LLM.
- Condense: summarize raw episodes into durable facts, procedures, decisions, or hypotheses.
- Correct: mark contradictions, supersede stale memories, and update confidence.
- Forget: decay, archive, or stop retrieving memory that is no longer useful.

## Memory Object Types

The harness should treat memories as graph objects, not chat logs:

- `observation`: something was seen, said, done, read, or produced.
- `fact`: a condensed statement currently treated as true.
- `preference`: a stable tendency of a user, agent, project, or team.
- `episode`: a concrete session, task, conversation, commit, error, or tool run.
- `artifact`: a file, commit, PR, document, test run, screenshot, or other produced object.
- `concept`: an abstract topic, model, domain idea, or named area of work.
- `procedure`: a known workflow, such as "after API changes, update contract, tests, and docs."
- `question`: an unresolved question or uncertainty.
- `hypothesis`: a plausible but unconfirmed interpretation.
- `decision`: an accepted direction with status and consequences.
- `summary`: a condensed memory derived from multiple episodes or observations.

## Query Lifecycle

The harness should not run one generic "search memory" step. It should run small query cycles throughout the agent lifecycle:

- Before task: load what is known about the user, workspace, goal, active task, open decisions, and open questions.
- During reasoning: fetch similar problems, constraints, procedures, and relevant prior decisions.
- Before action: check warnings, preferences, setup rules, affected files, and known failure modes.
- After observation: record what was newly learned from the user, tools, files, tests, or runtime behavior.
- After action: decide what should become an episode, fact, decision, procedure, artifact, or question.
- Periodic maintenance: find memory that is redundant, stale, contradictory, too specific, or no longer useful.

Memories should be reactivated by context throughout the turn, not only loaded once at the beginning.

## got-LLM Translation Layer

The harness needs a translation layer between LLM-friendly natural language and got-friendly graph JSON. Raw graph JSON should be treated as an intermediate representation, not as the final prompt format.

The translation layer has two asymmetric directions:

- Graph to LLM: render got query results into compact, typed, explainable natural-language context blocks.
- LLM to Graph: turn conversation, tool results, and observations into candidate graph mutations that can be validated, reviewed, and written to got.

Graph-to-LLM rendering should be as deterministic as possible. The renderer should use programmable text blocks for memory types such as preference, decision, episode, artifact, procedure, question, conflict, and evidence.

LLM-to-Graph translation may use an LLM, but should not write directly to got. It should produce candidate mutations with provenance, scope, source, confidence when available, and an explanation of why the candidate should be stored.

The translation layer should support query planning over time, but query planning is separate from rendering and mutation generation. A planner decides what to ask got; a renderer decides how got results enter the model context; a translator decides what candidate mutations should be proposed after observations.

## Memory Hygiene

The harness should track metadata that keeps memory useful over time:

- `salience`: how important or active a memory is.
- `confidence`: how certain the memory is.
- `recency`: when it was created, observed, or last used.
- `frequency`: how often it was confirmed or reused.
- `source`: where the memory came from.
- `scope`: global, project, repo, user, agent, session, thread, or task.
- `validity`: current, stale, superseded, disputed, or archived.
- `decay`: how retrieval priority weakens over time.
- `reinforcement`: how retrieval priority strengthens through repeated use.
- `merge`: how similar memories are consolidated.
- `supersede`: how newer memory replaces older memory.
- `contradiction`: how conflicts are surfaced instead of silently overwritten.

## Feature Direction

Second-brain quality requires these capabilities over time:

- Identity model: internal IDs, API keys, external IRIs, and aliases.
- Memory types and lifecycle status.
- Provenance: why the agent believes a memory.
- Temporal metadata: created, observed, last used, valid from, valid until.
- Semantic edge types: supports, contradicts, caused by, part of, refers to, supersedes, derived from.
- Traversal query language.
- Fulltext search.
- Embedding or semantic search.
- Hybrid retrieval across graph, text, and vectors.
- Scopes and namespaces for user, project, repo, agent, session, and task.
- Access control and rights later.
- Compaction and summarization.
- Background maintenance jobs.
- Explainable retrieval: why a memory was selected.
- Memory write policies: when an agent may store memory.
- Human review: which memory changes need confirmation.
- got-LLM translation layer for graph-to-context rendering and observation-to-mutation candidates.
- Client adapters for Codex-style and custom harness clients.
- Export and import through JSON-LD, RDF, Markdown, or other projections.

## Long-Term Harness Loops

The long-term harness should run four persistent loops:

```txt
perceive loop:
  collect observations from conversation, tools, files, tests, commits, and runtime behavior

retrieve loop:
  activate relevant memories for the current workspace, task, action, and user

reflect loop:
  derive new facts, patterns, contradictions, procedures, decisions, and hypotheses

maintain loop:
  condense, merge, decay, supersede, archive, and surface conflicts
```

Memory writes should not be raw chat logs. Chat logs and tool results are source material. Durable memory comes from reflection:

```txt
raw episode -> extracted observations -> candidate facts -> confirmed memory
```

## Contract Implications

got's API contract and future query primitives should eventually express enough structure for the harness to work reliably:

- Memory classes.
- Reserved system properties.
- Provenance modeling.
- Temporal modeling.
- Standard semantic edge types.
- Retrieval request patterns.
- Translation examples for rendered context blocks and candidate mutations.
- Maintenance-visible state.
- Testable conformance examples for lifecycle reads and writes.

The runtime should still remain storage and query infrastructure. The harness owns the lifecycle.
