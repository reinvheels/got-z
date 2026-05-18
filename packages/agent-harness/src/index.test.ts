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
  expect(result.files.map((file) => relativePath(workspace, file.target)).sort()).toEqual([
    ".codex/skills/got-memory-management/SKILL.md",
    ".got/memory/README.md",
    ".got/memory/checkpoints.md",
    ".got/memory/current.md",
    ".got/memory/open-questions.md",
    "AGENTS.got-memory.md",
  ]);
  expect(await Bun.file(joinPath(workspace, ".codex/skills/got-memory-management/SKILL.md")).text()).toContain(
    "The got DB runtime should be queried throughout the agent lifecycle",
  );
  expect(await Bun.file(joinPath(workspace, ".got/memory/current.md")).text()).toContain("## got Runtime");
  expect(await Bun.file(joinPath(workspace, "AGENTS.got-memory.md")).text()).toContain(
    "The got DB runtime is the primary memory backend.",
  );
});

test("installed templates define the MVP memory lifecycle contract", async () => {
  const workspace = await createTempWorkspace();

  await initAgentHarness({ targetDir: workspace });

  const skill = await Bun.file(joinPath(workspace, ".codex/skills/got-memory-management/SKILL.md")).text();
  expect(skill).toContain("Readiness check: `GET /`.");
  expect(skill).toContain("Read: `POST /pull` with raw got JSON projection requests.");
  expect(skill).toContain("Write: `POST /push` with raw got JSON graph mutations.");
  expect(skill).toContain("`before_turn`");
  expect(skill).toContain("`before_action`");
  expect(skill).toContain("`after_action`");
  expect(skill).toContain("`after_commit`");
  expect(skill).toContain("`before_thread_switch`");
  expect(skill).toContain("`observation`");
  expect(skill).toContain("`episode`");
  expect(skill).toContain("`artifact`");
  expect(skill).toContain("`decision`");
  expect(skill).toContain("`question`");
  expect(skill).toContain("`summary`");
  expect(skill).toContain("Query planning decides what to ask got.");
  expect(skill).toContain("Graph-to-context rendering decides how got results enter model context.");
  expect(skill).toContain("Observation-to-candidate-mutation translation decides what should be written");
  expect(skill).toContain("`perceive`");
  expect(skill).toContain("`retrieve`");
  expect(skill).toContain("`reflect`");
  expect(skill).toContain("`maintain`");

  const current = await Bun.file(joinPath(workspace, ".got/memory/current.md")).text();
  expect(current).toContain("- URL: not configured.");
  expect(current).toContain("- Port: not configured.");
  expect(current).toContain("- Working directory: not configured.");
  expect(current).toContain("- Readiness check: `GET /`.");
  expect(current).toContain("- Exchange format: raw got JSON.");
  expect(current).toContain("## Memory Metadata Defaults");
  expect(current).toContain("`source`");
  expect(current).toContain("`scope`");
  expect(current).toContain("`recency`");
  expect(current).toContain("`last_verified`");
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

function relativePath(root: string, path: string): string {
  const normalizedRoot = root.replaceAll(/\/+/g, "/").replace(/\/+$/, "");
  const normalizedPath = path.replaceAll(/\/+/g, "/");
  return normalizedPath.slice(normalizedRoot.length + 1);
}
