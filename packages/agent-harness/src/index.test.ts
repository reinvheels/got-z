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
  expect(skill).toContain("treat this skill as active by default");
  expect(skill).toContain("The user should not have to mention got memory management in every prompt");
  expect(skill).toContain("Run routine memory lifecycle work quietly");
  expect(skill).toContain("Do not announce every lifecycle hook");
  expect(skill).toContain("Localhost access may be sandboxed");
  expect(skill).toContain("request the client's permission");
  expect(skill).toContain("Only fall back to markdown after the permitted retry fails");
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
  expect(current).toContain("- URL: http://127.0.0.1:3001");
  expect(current).toContain("- Port: 3001");
  expect(current).toContain("- Working directory: .got/db");
  expect(current).toContain("- Readiness check: `GET /`.");
  expect(current).toContain("- Exchange format: raw got JSON.");
  expect(current).toContain("## Memory Metadata Defaults");
  expect(current).toContain("`source`");
  expect(current).toContain("`scope`");
  expect(current).toContain("`recency`");
  expect(current).toContain("`last_verified`");

  const agents = await Bun.file(joinPath(workspace, "AGENTS.got-memory.md")).text();
  expect(agents).toContain("got memory management is active in this workspace by default");
  expect(agents).toContain("The user does not need to mention it in each prompt");
  expect(agents).toContain("Run routine memory lifecycle work quietly");
  expect(agents).toContain("If localhost runtime checks fail in a sandboxed client");
  expect(agents).toContain("Treat markdown fallback as the last step");
});

test("initAgentHarness renders runtime config and creates runtime cwd", async () => {
  const workspace = await createTempWorkspace();

  const result = await initAgentHarness({
    targetDir: workspace,
    workspaceName: "memory lab",
    runtimeUrl: "http://127.0.0.1:3199",
    runtimeCwd: ".got/runtime-data",
    persistent: true,
  });

  const current = await Bun.file(joinPath(workspace, ".got/memory/current.md")).text();
  expect(current).toContain("- Workspace: memory lab.");
  expect(current).toContain("- URL: http://127.0.0.1:3199");
  expect(current).toContain("- Port: 3199");
  expect(current).toContain("- Working directory: .got/runtime-data");
  expect(current).toContain("- Persistence: enabled (--persistent expected).");
  expect(current).toContain("`(cd .got/runtime-data && GOT_PORT=3199 db-runtime --port 3199 --persistent)`");
  expect(await directoryExists(joinPath(workspace, ".got/runtime-data"))).toBe(true);
  expect(result.runtime.command).toBe(
    "(cd .got/runtime-data && GOT_PORT=3199 db-runtime --port 3199 --persistent)",
  );
});

test("initAgentHarness can wire AGENTS.md idempotently", async () => {
  const workspace = await createTempWorkspace();

  const first = await initAgentHarness({ targetDir: workspace, withAgents: true });
  expect(first.files.some((file) => relativePath(workspace, file.target) === "AGENTS.md" && file.action === "copied")).toBe(
    true,
  );

  const agentsPath = joinPath(workspace, "AGENTS.md");
  const agents = await Bun.file(agentsPath).text();
  expect(agents).toContain("<!-- got-memory-management:start -->");
  expect(agents).toContain("The got DB runtime is the primary memory backend.");
  expect(agents).toContain("<!-- got-memory-management:end -->");

  const second = await initAgentHarness({ targetDir: workspace, withAgents: true });
  expect(second.files.some((file) => relativePath(workspace, file.target) === "AGENTS.md" && file.action === "skipped")).toBe(
    true,
  );

  const updated = await Bun.file(agentsPath).text();
  expect(countOccurrences(updated, "<!-- got-memory-management:start -->")).toBe(1);
});

test("initAgentHarness appends AGENTS.md include to existing notes", async () => {
  const workspace = await createTempWorkspace();
  const agentsPath = joinPath(workspace, "AGENTS.md");
  await Bun.write(agentsPath, "# Project Notes\n\nKeep this intro.\n");

  const result = await initAgentHarness({ targetDir: workspace, withAgents: true });

  expect(result.files.some((file) => relativePath(workspace, file.target) === "AGENTS.md" && file.action === "updated")).toBe(
    true,
  );
  const agents = await Bun.file(agentsPath).text();
  expect(agents).toContain("Keep this intro.");
  expect(agents).toContain("<!-- got-memory-management:start -->");
});

test("initAgentHarness dry run reports bootstrap actions without writing", async () => {
  const workspace = await createTempWorkspace();

  const result = await initAgentHarness({
    targetDir: workspace,
    withAgents: true,
    runtimeUrl: "http://127.0.0.1:3199",
    runtimeCwd: ".got/db",
    persistent: true,
    dryRun: true,
  });

  expect(result.files.every((file) => file.action.startsWith("would-"))).toBe(true);
  expect(await Bun.file(joinPath(workspace, "AGENTS.md")).exists()).toBe(false);
  expect(await Bun.file(joinPath(workspace, ".got/memory/current.md")).exists()).toBe(false);
  expect(await directoryExists(joinPath(workspace, ".got/db"))).toBe(false);
  expect(result.runtime.command).toBe("(cd .got/db && GOT_PORT=3199 db-runtime --port 3199 --persistent)");
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

async function directoryExists(path: string): Promise<boolean> {
  const result = await $`test -d ${path}`.quiet().nothrow();
  return result.exitCode === 0;
}

function countOccurrences(value: string, search: string): number {
  return value.split(search).length - 1;
}
