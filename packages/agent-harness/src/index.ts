import { $ } from "bun";

export type InitAgentHarnessOptions = {
  readonly targetDir?: string;
  readonly force?: boolean;
  readonly dryRun?: boolean;
  readonly withAgents?: boolean;
  readonly workspaceName?: string;
  readonly runtimeUrl?: string;
  readonly runtimeCwd?: string;
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
  readonly persistent: boolean;
  readonly command: string;
};

const templateRoot = joinPath(import.meta.dir, "..", "templates", "client-workspace");
const defaultRuntimeUrl = "http://127.0.0.1:3001";
const defaultRuntimeCwd = ".got/db";
const agentsStartMarker = "<!-- got-memory-management:start -->";
const agentsEndMarker = "<!-- got-memory-management:end -->";

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
    source: ".got/memory/checkpoints.md",
    target: ".got/memory/checkpoints.md",
  },
  {
    source: ".got/memory/open-questions.md",
    target: ".got/memory/open-questions.md",
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
  const runtime = buildRuntimeConfig(runtimeUrl, runtimeCwd, persistent);

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

function resolvePath(path: string): string {
  if (path.startsWith("/")) return stripTrailingSlash(path);
  return joinPath(process.cwd(), path);
}

function joinPath(...parts: readonly string[]): string {
  const path = parts
    .filter((part) => part.length > 0)
    .join("/")
    .replaceAll(/\/+/g, "/")
    .replaceAll("/./", "/");

  const segments: string[] = [];
  const absolute = path.startsWith("/");

  for (const segment of path.split("/")) {
    if (segment.length === 0 || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return `${absolute ? "/" : ""}${segments.join("/")}`;
}

function stripTrailingSlash(path: string): string {
  if (path === "/") return path;
  return path.replace(/\/+$/, "");
}

function basename(path: string): string {
  const normalized = stripTrailingSlash(path);
  const parts = normalized.split("/");
  return parts[parts.length - 1] || "workspace";
}

function normalizeRuntimeUrl(value: string): string {
  const url = new URL(value);
  if (!url.port) url.port = "3001";
  return url.toString().replace(/\/$/, "");
}

function buildRuntimeConfig(runtimeUrl: string, runtimeCwd: string, persistent: boolean): InitAgentHarnessRuntime {
  const url = new URL(runtimeUrl);
  const port = url.port || "3001";
  const persistentFlag = persistent ? " --persistent" : "";
  const command = `(cd ${shellQuote(runtimeCwd)} && GOT_PORT=${port} db-runtime --port ${port}${persistentFlag})`;

  return {
    url: runtimeUrl,
    port,
    cwd: runtimeCwd,
    persistent,
    command,
  };
}

function renderCurrentState(input: { workspaceName: string; runtime: InitAgentHarnessRuntime }): string {
  const { workspaceName, runtime } = input;
  const persistence = runtime.persistent ? "enabled (--persistent expected)" : "disabled (ephemeral expected)";

  return `# Current State

## Workspace Identity

- Workspace: ${workspaceName}.
- Scope: workspace.
- Source: bootstrap init.
- Recency: initial setup.
- Last verified: not verified.

## Active Goal

- Not initialized.

## got Runtime

- Status: configured.
- URL: ${runtime.url}
- Port: ${runtime.port}
- Working directory: ${runtime.cwd}
- Persistence: ${persistence}.
- Readiness check: \`GET /\`.
- Read endpoint: \`POST /pull\`.
- Write endpoint: \`POST /push\`.
- Exchange format: raw got JSON.

## Lifecycle Hooks

- \`before_turn\`: query got before relying on markdown fallback.
- \`before_action\`: query got for constraints, decisions, procedures, and verification expectations.
- \`after_action\`: describe durable observations as raw got JSON candidate mutations.
- \`after_commit\`: record commit metadata, changed scope, and verification result.
- \`before_thread_switch\`: refresh markdown fallback from current got state.

## Current Implementation State

- Not initialized.

## Recent Decisions

- Not initialized.

## Open Questions

- Not initialized.

## Next Steps

- Start the got DB runtime before starting Codex:
  - \`${runtime.command}\`

## Last Verified

- Not initialized.

## Memory Metadata Defaults

- \`source\`: bootstrap init.
- \`scope\`: workspace.
- \`recency\`: initial setup.
- \`last_verified\`: not verified.
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

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}
