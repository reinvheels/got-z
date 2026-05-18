import { expect, test } from "bun:test";
import {
  defaultMemoryNodeId,
  defaultMemoryPullQuery,
  memoryContractSlots,
  memoryEntryFields,
} from "./memory-contract";

test("memory contract defines the stable MVP anchor slots", () => {
  expect(defaultMemoryNodeId).toBe("got-memory");
  expect(Object.keys(memoryContractSlots)).toEqual([
    "facts",
    "user_preferences",
    "workspace_context",
    "procedures",
    "decisions",
    "open_questions",
    "summaries",
    "last_updated",
  ]);
  expect(memoryContractSlots.facts).toContain("General remembered statements");
  expect(memoryContractSlots.user_preferences).toContain("Stable user tendencies");
  expect(memoryContractSlots).not.toHaveProperty("recent_decisions");
});

test("default memory pull query follows the memory contract slots", () => {
  expect(defaultMemoryPullQuery).toEqual({
    "got-memory": {
      facts: true,
      user_preferences: true,
      workspace_context: true,
      procedures: true,
      decisions: true,
      open_questions: true,
      summaries: true,
      last_updated: true,
    },
  });
});

test("memory entries expose the MVP metadata fields", () => {
  expect(memoryEntryFields).toEqual([
    "id",
    "type",
    "text",
    "scope",
    "source",
    "confidence",
    "last_verified",
  ]);
});
