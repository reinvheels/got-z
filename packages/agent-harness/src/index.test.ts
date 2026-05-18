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

test("initAgentHarness copies memory management skill and bootstrap templates", async () => {
  const workspace = await createTempWorkspace();

  const result = await initAgentHarness({ targetDir: workspace });

  expect(result.files.every((file) => file.action === "copied")).toBe(true);
  expect(result.files.map((file) => relativePath(workspace, file.target)).sort()).toEqual([
    ".got/bin/got-agent-harness",
    ".codex/skills/got-memory-management/SKILL.md",
    ".got/memory/README.md",
    ".got/memory/current.md",
    ".got/runtime.json",
    "AGENTS.got-memory.md",
  ].sort());
  expect(await Bun.file(joinPath(workspace, ".codex/skills/got-memory-management/SKILL.md")).text()).toContain(
    "The got DB runtime should be queried throughout the agent lifecycle",
  );
  expect(await Bun.file(joinPath(workspace, ".got/memory/current.md")).text()).toContain("## got Runtime");
  expect(await Bun.file(joinPath(workspace, "AGENTS.got-memory.md")).text()).toContain(
    "The got DB runtime is the only memory source.",
  );
});

test("installed templates define the MVP memory lifecycle contract", async () => {
  const workspace = await createTempWorkspace();

  await initAgentHarness({ targetDir: workspace });

  const skill = await Bun.file(joinPath(workspace, ".codex/skills/got-memory-management/SKILL.md")).text();
  expect(skill).toContain("Runtime status: `./.got/bin/got-agent-harness runtime status`.");
  expect(skill).toContain("Runtime ensure: `./.got/bin/got-agent-harness runtime ensure`");
  expect(skill).toContain("Runtime start: `./.got/bin/got-agent-harness runtime start` is for an explicit foreground debug run.");
  expect(skill).toContain("Read: `./.got/bin/got-agent-harness pull` ensures the runtime and wraps `POST /pull`");
  expect(skill).toContain("Write: `./.got/bin/got-agent-harness push` ensures the runtime and wraps `POST /push`");
  expect(skill).toContain("new workspaces should use their own auto-selected localhost port");
  expect(skill).toContain("so concurrent chats do not start duplicate runtimes");
  expect(skill).toContain("stable node `got-memory`");
  expect(skill).toContain("Durable MVP memory should be written under that node");
  expect(skill).toContain("`facts`: general remembered statements treated as true.");
  expect(skill).toContain("`user_preferences`");
  expect(skill).toContain("Classify memory before writing");
  expect(skill).toContain('A statement like "Apples are red" is a `fact`, not a `user_preferences` entry.');
  expect(skill).toContain('A statement like "The user prefers short German answers" is a `user_preferences` entry.');
  expect(skill).toContain('"facts"');
  expect(skill).toContain('"type": "fact"');
  expect(skill).toContain('"type": "preference"');
  expect(skill).toContain("`id`: stable local identifier.");
  expect(skill).toContain("`type`: memory object type matching the slot.");
  expect(skill).toContain("`confidence`: high, medium, low, or unknown.");
  expect(skill).toContain("treat this skill as active by default");
  expect(skill).toContain("The user should not have to mention got memory management in every prompt");
  expect(skill).toContain("Run routine memory lifecycle work quietly");
  expect(skill).toContain("Do not announce every lifecycle hook");
  expect(skill).toContain("The got DB runtime is the only memory source");
  expect(skill).toContain("Do not answer memory questions from Markdown");
  expect(skill).toContain("Do not treat Markdown as memory");
  expect(skill).toContain("Use the workspace-local harness CLI instead of direct `curl`");
  expect(skill).toContain("request the client's permission");
  expect(skill).toContain("Only report memory unavailable after the permitted retry fails");
  expect(skill).toContain("reachable but not managed by this workspace");
  expect(skill).toContain("It belongs to another workspace or unmanaged process.");
  expect(skill).toContain("Do not read runtime storage files as a memory source");
  expect(skill).toContain("Never parse the WAL or snapshot files to recover memory");
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

  const runtimeConfig = await Bun.file(joinPath(workspace, ".got/runtime.json")).json();
  const current = await Bun.file(joinPath(workspace, ".got/memory/current.md")).text();
  expect(runtimeConfig.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  expect(current).toContain(`- URL: ${runtimeConfig.url}`);
  expect(current).toContain(`- Port: ${runtimeConfig.port}`);
  expect(current).toContain("- Working directory: .got/db");
  expect(current).toContain("- Runtime ensure: `./.got/bin/got-agent-harness runtime ensure`.");
  expect(current).toContain("- Runtime status: `./.got/bin/got-agent-harness runtime status`.");
  expect(current).toContain("- Runtime start: `./.got/bin/got-agent-harness runtime start` for an explicit foreground debug run.");
  expect(current).toContain("- Runtime lock path: .got/runtime.lock");
  expect(current).toContain("- Exchange format: raw got JSON.");
  expect(current).toContain("## Memory Source Rule");
  expect(current).toContain("got runtime is the only memory source");
  expect(current).toContain("Do not answer memory questions from markdown");
  expect(current).toContain("## Memory Contract");
  expect(current).toContain("Top-level slots: facts, user_preferences, workspace_context, procedures, decisions, open_questions, summaries, last_updated.");
  expect(current).toContain("Facts are general remembered statements.");
  expect(current).toContain("User preferences are stable user tendencies or instructions.");

  const agents = await Bun.file(joinPath(workspace, "AGENTS.got-memory.md")).text();
  expect(agents).toContain("got memory management is active in this workspace by default");
  expect(agents).toContain("The user does not need to mention it in each prompt");
  expect(agents).toContain("The got DB runtime is the only memory source");
  expect(agents).toContain("Do not answer memory questions from Markdown");
  expect(agents).toContain("Run routine memory lifecycle work quietly");
  expect(agents).toContain("write durable MVP memory under the stable `got-memory` node");
  expect(agents).toContain("Use `facts`, `user_preferences`, `workspace_context`, `procedures`, `decisions`, `open_questions`, `summaries`, and `last_updated`");
  expect(agents).toContain("Classify memory before writing");
  expect(agents).toContain('General remembered statements like "Apples are red" belong in `facts`.');
  expect(agents).toContain('Stable user tendencies or instructions like "The user prefers short German answers" belong in `user_preferences`.');
  expect(agents).toContain("`id`, `type`, `text`, `scope`, `source`, `confidence`, and `last_verified`");
  expect(agents).toContain("`pull` ensures the workspace singleton runtime");
  expect(agents).toContain("so concurrent chats do not start duplicate runtimes");
  expect(agents).toContain("If harness runtime commands fail in a sandboxed client");
  expect(agents).toContain("the got runtime URL is reachable but not managed by this workspace");
  expect(agents).toContain("do not substitute Markdown memory");
  expect(agents).toContain("Do not read runtime storage files as memory");
  expect(agents).not.toContain("fallback");
  expect(agents).not.toContain("Fallback");
});

test("initAgentHarness chooses distinct auto runtime ports per workspace", async () => {
  const firstWorkspace = await createTempWorkspace();
  const secondWorkspace = await createTempWorkspace();

  const first = await initAgentHarness({ targetDir: firstWorkspace });
  const second = await initAgentHarness({ targetDir: secondWorkspace });

  expect(first.runtime.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  expect(second.runtime.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  expect(first.runtime.url).not.toBe(second.runtime.url);
  expect(first.runtime.port).not.toBe(second.runtime.port);
  expect(await Bun.file(joinPath(firstWorkspace, ".got/runtime.json")).json()).toMatchObject({
    url: first.runtime.url,
    port: first.runtime.port,
  });
  expect(await Bun.file(joinPath(secondWorkspace, ".got/runtime.json")).json()).toMatchObject({
    url: second.runtime.url,
    port: second.runtime.port,
  });
});

test("initAgentHarness renders runtime config and creates runtime cwd", async () => {
  const workspace = await createTempWorkspace();

  const result = await initAgentHarness({
    targetDir: workspace,
    workspaceName: "memory lab",
    runtimeUrl: "http://127.0.0.1:3199",
    runtimeCwd: ".got/runtime-data",
    runtimeBin: "/opt/got/bin/db-runtime",
    persistent: true,
  });

  const current = await Bun.file(joinPath(workspace, ".got/memory/current.md")).text();
  expect(current).toContain("- Workspace: memory lab.");
  expect(current).toContain("- URL: http://127.0.0.1:3199");
  expect(current).toContain("- Port: 3199");
  expect(current).toContain("- Working directory: .got/runtime-data");
  expect(current).toContain("- Binary: /opt/got/bin/db-runtime");
  expect(current).toContain("- Persistence: enabled (--persistent expected).");
  expect(current).toContain("`./.got/bin/got-agent-harness runtime ensure`");
  expect(await directoryExists(joinPath(workspace, ".got/runtime-data"))).toBe(true);
  expect(await Bun.file(joinPath(workspace, ".got/runtime.json")).json()).toMatchObject({
    url: "http://127.0.0.1:3199",
    port: "3199",
    cwd: ".got/runtime-data",
    bin: "/opt/got/bin/db-runtime",
    persistent: true,
    lockFile: ".got/runtime.lock",
  });
  expect(await Bun.file(joinPath(workspace, ".got/bin/got-agent-harness")).text()).toContain("exec bun");
  expect(result.runtime.command).toBe("./.got/bin/got-agent-harness runtime ensure");
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
  expect(agents).toContain("The got DB runtime is the only memory source.");
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
  expect(await Bun.file(joinPath(workspace, ".got/runtime.json")).exists()).toBe(false);
  expect(await Bun.file(joinPath(workspace, ".got/bin/got-agent-harness")).exists()).toBe(false);
  expect(await directoryExists(joinPath(workspace, ".got/db"))).toBe(false);
  expect(result.runtime.command).toBe("./.got/bin/got-agent-harness runtime ensure");
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
