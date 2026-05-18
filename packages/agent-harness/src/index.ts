import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

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

const templateRoot = resolve(import.meta.dir, "..", "templates", "client-workspace");

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

export function initAgentHarness(options: InitAgentHarnessOptions = {}): InitAgentHarnessResult {
  const targetDir = resolve(options.targetDir ?? process.cwd());
  const force = options.force ?? false;
  const dryRun = options.dryRun ?? false;

  if (!existsSync(targetDir)) {
    throw new Error(`Target workspace does not exist: ${targetDir}`);
  }

  const files = templateFiles.map((file): InitAgentHarnessFileResult => {
    const source = join(templateRoot, file.source);
    const target = join(targetDir, file.target);
    const exists = existsSync(target);

    if (dryRun) {
      return {
        source,
        target,
        action: exists && !force ? "would-skip" : "would-copy",
      };
    }

    if (exists && !force) {
      return { source, target, action: "skipped" };
    }

    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    return { source, target, action: "copied" };
  });

  return { targetDir, files };
}
