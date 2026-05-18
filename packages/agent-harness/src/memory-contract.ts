export const defaultMemoryNodeId = "got-memory";

export const memoryContractSlots = {
  facts: "General remembered statements treated as true.",
  user_preferences: "Stable user tendencies, instructions, or style choices.",
  workspace_context: "Durable facts about the current workspace.",
  procedures: "Reusable workflows or rules of action.",
  decisions: "Accepted directions that should affect future work.",
  open_questions: "Unresolved questions or uncertainties.",
  summaries: "Compact state derived from multiple observations.",
  last_updated: "Short verification or timestamp note for the memory anchor.",
} as const;

export const memoryEntryFields = [
  "id",
  "type",
  "text",
  "scope",
  "source",
  "confidence",
  "last_verified",
] as const;

export type MemoryContractSlot = keyof typeof memoryContractSlots;
export type MemoryEntryField = (typeof memoryEntryFields)[number];

export const defaultMemoryPullQuery = {
  [defaultMemoryNodeId]: {
    facts: true,
    user_preferences: true,
    workspace_context: true,
    procedures: true,
    decisions: true,
    open_questions: true,
    summaries: true,
    last_updated: true,
  },
} as const;
