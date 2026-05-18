import { $ } from "bun";
export {
  defaultMemoryNodeId,
  defaultMemoryPullQuery,
  memoryContractSlots,
  memoryEntryFields,
  type MemoryContractSlot,
  type MemoryEntryField,
} from "./memory-contract";
import {
  basename,
  buildRuntimeWorkspaceConfig,
  defaultRuntimeCwd,
  defaultRuntimeUrl,
  joinPath,
  normalizeRuntimeUrl,
  resolvePath,
  shellQuote,
  writeRuntimeWorkspaceConfig,
  type RuntimeWorkspaceConfig,
} from "./runtime";

export type InitAgentHarnessOptions = {
  readonly targetDir?: string;
  readonly force?: boolean;
  readonly dryRun?: boolean;
  readonly withAgents?: boolean;
  readonly workspaceName?: string;
  readonly runtimeUrl?: string;
  readonly runtimeCwd?: string;
  readonly runtimeBin?: string;
  readonly persistent?: boolean;
};

export type InitAgentHarnessFileResult = {
  readonly source: string;
  readonly target: string;
  readonly action: "copied" | "updated" | "skipped" | "would-copy" | "would-update" | "would-skip";
};

export type InitAgentHarnessResult = {
  readonly targetDir: string;
  readonly files: readonly InitAgentHarnessFileResult[];
  readonly runtime: InitAgentHarnessRuntime;
};

export type InitAgentHarnessRuntime = {
  readonly url: string;
  readonly port: string;
  readonly cwd: string;
  readonly bin: string;
  readonly persistent: boolean;
  readonly pidFile: string;
  readonly logFile: string;
  readonly stateFile: string;
  readonly lockFile: string;
  readonly cliCommand: string;
  readonly command: string;
};

const templateRoot = joinPath(import.meta.dir, "..", "templates", "client-workspace");
const agentsStartMarker = "<!-- got-memory-management:start -->";
const agentsEndMarker = "<!-- got-memory-management:end -->";
const harnessShimPath = ".got/bin/got-agent-harness";

const templateFiles = [
  {
    source: ".codex/skills/got-memory-management/SKILL.md",
    target: ".codex/skills/got-memory-management/SKILL.md",
  },
  {
    source: ".got/memory/README.md",
    target: ".got/memory/README.md",
  },
  {
    source: ".got/memory/current.md",
    target: ".got/memory/current.md",
  },
  {
    source: "AGENTS.got-memory.md",
    target: "AGENTS.got-memory.md",
  },
] as const;

export async function initAgentHarness(options: InitAgentHarnessOptions = {}): Promise<InitAgentHarnessResult> {
  const targetDir = resolvePath(options.targetDir ?? process.cwd());
  const force = options.force ?? false;
  const dryRun = options.dryRun ?? false;
  const workspaceName = options.workspaceName ?? basename(targetDir);
  const runtimeUrl = normalizeRuntimeUrl(options.runtimeUrl ?? defaultRuntimeUrl);
  const runtimeCwd = options.runtimeCwd ?? defaultRuntimeCwd;
  const persistent = options.persistent ?? false;
  const runtimeConfig = await buildRuntimeWorkspaceConfig({
    runtimeUrl,
    runtimeCwd,
    runtimeBin: options.runtimeBin,
    persistent,
  });
  const runtime = buildInitRuntime(runtimeConfig);

  if (!(await directoryExists(targetDir))) {
    throw new Error(`Target workspace does not exist: ${targetDir}`);
  }

  const files: InitAgentHarnessFileResult[] = [];

  for (const file of templateFiles) {
    const source = joinPath(templateRoot, file.source);
    const target = joinPath(targetDir, file.target);
    const exists = await Bun.file(target).exists();

    if (dryRun) {
      files.push({
        source,
        target,
        action: exists && !force ? "would-skip" : "would-copy",
      });
      continue;
    }

    if (exists && !force) {
      files.push({ source, target, action: "skipped" });
      continue;
    }

    const content =
      file.target === ".got/memory/current.md"
        ? renderCurrentState({ workspaceName, runtime })
        : Bun.file(source);

    await Bun.write(target, content);
    files.push({ source, target, action: "copied" });
  }

  files.push(await writeRuntimeConfigFile(targetDir, runtimeConfig, force, dryRun));
  files.push(await writeHarnessShim(targetDir, force, dryRun));

  if (options.withAgents) {
    files.push(await applyAgentsInclude(targetDir, force, dryRun));
  }

  const runtimeCwdPath = joinPath(targetDir, runtime.cwd);
  if (!dryRun) {
    await $`mkdir -p ${runtimeCwdPath}`.quiet();
  }

  return { targetDir, files, runtime };
}

async function directoryExists(path: string): Promise<boolean> {
  const result = await $`test -d ${path}`.quiet().nothrow();
  return result.exitCode === 0;
}

function buildInitRuntime(config: RuntimeWorkspaceConfig): InitAgentHarnessRuntime {
  return {
    url: config.url,
    port: config.port,
    cwd: config.cwd,
    bin: config.bin,
    persistent: config.persistent,
    pidFile: config.pidFile,
    logFile: config.logFile,
    stateFile: config.stateFile,
    lockFile: config.lockFile,
    cliCommand: `./${harnessShimPath}`,
    command: `./${harnessShimPath} runtime ensure`,
  };
}

function renderCurrentState(input: { workspaceName: string; runtime: InitAgentHarnessRuntime }): string {
  const { workspaceName, runtime } = input;
  const persistence = runtime.persistent ? "enabled (--persistent expected)" : "disabled (ephemeral expected)";

  return `# Current State

## Workspace Identity

- Workspace: ${workspaceName}.
- Scope: workspace.

## got Runtime

- Status: configured.
- URL: ${runtime.url}
- Port: ${runtime.port}
- Working directory: ${runtime.cwd}
- Binary: ${runtime.bin}
- Persistence: ${persistence}.
- Runtime ensure: \`${runtime.cliCommand} runtime ensure\`.
- Runtime status: \`${runtime.cliCommand} runtime status\`.
- Runtime start: \`${runtime.cliCommand} runtime start\` for an explicit foreground debug run.
- Runtime stop: \`${runtime.cliCommand} runtime stop\`.
- Runtime lock path: ${runtime.lockFile}
- Read endpoint: \`${runtime.cliCommand} pull\` ensures the runtime and wraps \`POST /pull\`.
- Write endpoint: \`${runtime.cliCommand} push\` ensures the runtime and wraps \`POST /push\`.
- Exchange format: raw got JSON.

## Lifecycle Hooks

- \`before_turn\`: query got before answering memory-sensitive questions.
- \`before_action\`: query got for constraints, decisions, procedures, and verification expectations.
- \`after_action\`: describe durable observations as raw got JSON candidate mutations.
- \`after_commit\`: record commit metadata, changed scope, and verification result.
- \`before_thread_switch\`: push compact handoff state into got.

## Next Steps

- Let Codex start or check the got DB runtime through the harness CLI:
  - \`${runtime.command}\`
  - \`${runtime.cliCommand} pull\`
  - \`${runtime.cliCommand} runtime status\`

## Memory Source Rule

- got runtime is the only memory source.
- Markdown files are runtime bootstrap/configuration only.
- Do not answer memory questions from markdown.
- If got is unavailable, report memory unavailable.

## Memory Contract

- Stable memory anchor: got-memory.
- Top-level slots: facts, user_preferences, workspace_context, procedures, decisions, open_questions, summaries, last_updated.
- Facts are general remembered statements.
- User preferences are stable user tendencies or instructions.
`;
}

async function writeRuntimeConfigFile(
  targetDir: string,
  runtime: RuntimeWorkspaceConfig,
  force: boolean,
  dryRun: boolean,
): Promise<InitAgentHarnessFileResult> {
  const target = joinPath(targetDir, ".got/runtime.json");
  const exists = await Bun.file(target).exists();

  if (dryRun) {
    return {
      source: "generated",
      target,
      action: exists && !force ? "would-skip" : "would-copy",
    };
  }

  if (exists && !force) {
    return { source: "generated", target, action: "skipped" };
  }

  await writeRuntimeWorkspaceConfig(targetDir, runtime);
  return { source: "generated", target, action: "copied" };
}

async function writeHarnessShim(
  targetDir: string,
  force: boolean,
  dryRun: boolean,
): Promise<InitAgentHarnessFileResult> {
  const target = joinPath(targetDir, harnessShimPath);
  const exists = await Bun.file(target).exists();

  if (dryRun) {
    return {
      source: "generated",
      target,
      action: exists && !force ? "would-skip" : "would-copy",
    };
  }

  if (exists && !force) {
    return { source: "generated", target, action: "skipped" };
  }

  await Bun.write(target, createHarnessShim(await resolveHarnessCliPath()));
  await $`chmod +x ${target}`.quiet();
  return { source: "generated", target, action: "copied" };
}

async function resolveHarnessCliPath(): Promise<string> {
  const candidates = [joinPath(import.meta.dir, "cli.ts"), joinPath(import.meta.dir, "cli.js")];

  for (const candidate of candidates) {
    if (await Bun.file(candidate).exists()) return candidate;
  }

  return "got-agent-harness";
}

function createHarnessShim(cliPath: string): string {
  return `#!/usr/bin/env sh
exec bun ${shellQuote(cliPath)} "$@"
`;
}

async function applyAgentsInclude(
  targetDir: string,
  force: boolean,
  dryRun: boolean,
): Promise<InitAgentHarnessFileResult> {
  const source = joinPath(templateRoot, "AGENTS.got-memory.md");
  const target = joinPath(targetDir, "AGENTS.md");
  const include = await Bun.file(source).text();
  const block = `${agentsStartMarker}\n${include.trim()}\n${agentsEndMarker}`;
  const exists = await Bun.file(target).exists();
  const current = exists ? await Bun.file(target).text() : "";
  const next = renderAgentsFile(current, block);
  const changed = next !== current;

  if (dryRun) {
    return {
      source,
      target,
      action: !exists ? "would-copy" : changed || force ? "would-update" : "would-skip",
    };
  }

  if (exists && !changed && !force) {
    return { source, target, action: "skipped" };
  }

  await Bun.write(target, next);
  return { source, target, action: exists ? "updated" : "copied" };
}

function renderAgentsFile(current: string, block: string): string {
  const start = current.indexOf(agentsStartMarker);
  const end = current.indexOf(agentsEndMarker);

  if (start >= 0 && end >= start) {
    const before = current.slice(0, start).trimEnd();
    const after = current.slice(end + agentsEndMarker.length).trimStart();
    return joinSections(before, block, after);
  }

  if (current.trim().length === 0) {
    return `# Agent Notes\n\n${block}\n`;
  }

  return joinSections(current.trimEnd(), block);
}

function joinSections(...sections: readonly string[]): string {
  return `${sections.filter((section) => section.length > 0).join("\n\n")}\n`;
}
