import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "bun:test";
import { initAgentHarness } from "./index";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function createTempWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), "got-agent-harness-"));
  tempDirs.push(dir);
  return dir;
}

test("initAgentHarness copies skill and memory markdown templates", () => {
  const workspace = createTempWorkspace();

  const result = initAgentHarness({ targetDir: workspace });

  expect(result.files.every((file) => file.action === "copied")).toBe(true);
  expect(readFileSync(join(workspace, ".codex/skills/got-memory-management/SKILL.md"), "utf8")).toContain(
    "The got DB runtime should be queried throughout the agent lifecycle",
  );
  expect(readFileSync(join(workspace, ".got/memory/current.md"), "utf8")).toContain("## got Runtime");
  expect(readFileSync(join(workspace, "AGENTS.got-memory.md"), "utf8")).toContain(
    "The got DB runtime is the primary memory backend.",
  );
});

test("initAgentHarness skips existing files unless force is enabled", () => {
  const workspace = createTempWorkspace();
  const currentPath = join(workspace, ".got/memory/current.md");

  initAgentHarness({ targetDir: workspace });
  writeFileSync(currentPath, "custom state");

  const skipped = initAgentHarness({ targetDir: workspace });
  expect(skipped.files.some((file) => file.target === currentPath && file.action === "skipped")).toBe(true);
  expect(readFileSync(currentPath, "utf8")).toBe("custom state");

  const forced = initAgentHarness({ targetDir: workspace, force: true });
  expect(forced.files.some((file) => file.target === currentPath && file.action === "copied")).toBe(true);
  expect(readFileSync(currentPath, "utf8")).toContain("# Current State");
});
