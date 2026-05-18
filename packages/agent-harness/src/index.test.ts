import { $ } from "bun";
import { afterEach, expect, test } from "bun:test";
import { initAgentHarness } from "./index";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await $`rm -rf ${dir}`;
  }
});

async function createTempWorkspace(): Promise<string> {
  const dir = `${Bun.env.TMPDIR ?? "/tmp"}/got-agent-harness-${crypto.randomUUID()}`;
  await $`mkdir -p ${dir}`;
  tempDirs.push(dir);
  return dir;
}

test("initAgentHarness copies memory management skill and markdown templates", async () => {
  const workspace = await createTempWorkspace();

  const result = await initAgentHarness({ targetDir: workspace });

  expect(result.files.every((file) => file.action === "copied")).toBe(true);
  expect(await Bun.file(joinPath(workspace, ".codex/skills/got-memory-management/SKILL.md")).text()).toContain(
    "The got DB runtime should be queried throughout the agent lifecycle",
  );
  expect(await Bun.file(joinPath(workspace, ".got/memory/current.md")).text()).toContain("## got Runtime");
  expect(await Bun.file(joinPath(workspace, "AGENTS.got-memory.md")).text()).toContain(
    "The got DB runtime is the primary memory backend.",
  );
});

test("initAgentHarness skips existing files unless force is enabled", async () => {
  const workspace = await createTempWorkspace();
  const currentPath = joinPath(workspace, ".got/memory/current.md");

  await initAgentHarness({ targetDir: workspace });
  await Bun.write(currentPath, "custom state");

  const skipped = await initAgentHarness({ targetDir: workspace });
  expect(skipped.files.some((file) => file.target === currentPath && file.action === "skipped")).toBe(true);
  expect(await Bun.file(currentPath).text()).toBe("custom state");

  const forced = await initAgentHarness({ targetDir: workspace, force: true });
  expect(forced.files.some((file) => file.target === currentPath && file.action === "copied")).toBe(true);
  expect(await Bun.file(currentPath).text()).toContain("# Current State");
});

function joinPath(...parts: readonly string[]): string {
  return parts
    .filter((part) => part.length > 0)
    .join("/")
    .replaceAll(/\/+/g, "/");
}
