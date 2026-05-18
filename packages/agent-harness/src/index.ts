import { $ } from "bun";

export type InitAgentHarnessOptions = {
  readonly targetDir?: string;
  readonly force?: boolean;
  readonly dryRun?: boolean;
};

export type InitAgentHarnessFileResult = {
  readonly source: string;
  readonly target: string;
  readonly action: "copied" | "skipped" | "would-copy" | "would-skip";
};

export type InitAgentHarnessResult = {
  readonly targetDir: string;
  readonly files: readonly InitAgentHarnessFileResult[];
};

const templateRoot = joinPath(import.meta.dir, "..", "templates", "client-workspace");

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

    await Bun.write(target, Bun.file(source));
    files.push({ source, target, action: "copied" });
  }

  return { targetDir, files };
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
