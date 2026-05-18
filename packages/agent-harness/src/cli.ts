#!/usr/bin/env bun
import { initAgentHarness } from "./index";

type CliOptions = {
  command?: string;
  targetDir?: string;
  force: boolean;
  dryRun: boolean;
  help: boolean;
  withAgents: boolean;
  workspaceName?: string;
  runtimeUrl?: string;
  runtimeCwd?: string;
  persistent: boolean;
};

function parseArgs(args: readonly string[]): CliOptions {
  const options: CliOptions = {
    force: false,
    dryRun: false,
    help: false,
    withAgents: false,
    persistent: false,
  };

  const remaining = [...args];
  options.command = remaining.shift();

  while (remaining.length > 0) {
    const arg = remaining.shift();

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--with-agents") {
      options.withAgents = true;
      continue;
    }

    if (arg === "--persistent") {
      options.persistent = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--target") {
      options.targetDir = readRequiredValue(remaining, arg);
      continue;
    }

    if (arg?.startsWith("--target=")) {
      options.targetDir = arg.slice("--target=".length);
      continue;
    }

    if (arg === "--workspace-name") {
      options.workspaceName = readRequiredValue(remaining, arg);
      continue;
    }

    if (arg?.startsWith("--workspace-name=")) {
      options.workspaceName = arg.slice("--workspace-name=".length);
      continue;
    }

    if (arg === "--runtime-url") {
      options.runtimeUrl = readRequiredValue(remaining, arg);
      continue;
    }

    if (arg?.startsWith("--runtime-url=")) {
      options.runtimeUrl = arg.slice("--runtime-url=".length);
      continue;
    }

    if (arg === "--runtime-cwd") {
      options.runtimeCwd = readRequiredValue(remaining, arg);
      continue;
    }

    if (arg?.startsWith("--runtime-cwd=")) {
      options.runtimeCwd = arg.slice("--runtime-cwd=".length);
      continue;
    }

    if (!options.targetDir && arg) {
      options.targetDir = arg;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp(): void {
  console.log(`got-agent-harness

Usage:
  got-agent-harness init [target-workspace] [--force] [--dry-run] [--with-agents]
  got-agent-harness init --target <target-workspace>
  got-agent-harness init . --with-agents --runtime-url http://127.0.0.1:3199 --runtime-cwd .got/db --persistent

Copies got memory management skill and markdown templates into a client workspace.
Existing files are skipped unless --force is passed.

Options:
  --with-agents              Create or update AGENTS.md with got memory-management instructions.
  --workspace-name <name>    Workspace name written to .got/memory/current.md.
  --runtime-url <url>        got runtime URL. Defaults to http://127.0.0.1:3001.
  --runtime-cwd <path>       Runtime working directory. Defaults to .got/db.
  --persistent               Mark the runtime as persistent and include --persistent in the start command.
  --dry-run                  Show intended file actions without writing files.
  --force                    Overwrite existing template files.`);
}

function printResult(result: Awaited<ReturnType<typeof initAgentHarness>>): void {
  console.log(`Initialized got agent harness templates in ${result.targetDir}`);

  for (const file of result.files) {
    console.log(`${file.action.padEnd(10)} ${file.target}`);
  }

  console.log("");
  console.log(`Runtime URL: ${result.runtime.url}`);
  console.log(`Runtime working directory: ${result.runtime.cwd}`);
  console.log("Start the got DB runtime before starting Codex:");
  console.log(`  ${result.runtime.command}`);
}

try {
  const options = parseArgs(Bun.argv.slice(2));

  if (options.help || !options.command) {
    printHelp();
    process.exit(0);
  }

  if (options.command !== "init") {
    throw new Error(`Unknown command: ${options.command}`);
  }

  const result = await initAgentHarness({
    targetDir: options.targetDir,
    force: options.force,
    dryRun: options.dryRun,
    withAgents: options.withAgents,
    workspaceName: options.workspaceName,
    runtimeUrl: options.runtimeUrl,
    runtimeCwd: options.runtimeCwd,
    persistent: options.persistent,
  });
  printResult(result);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function readRequiredValue(values: string[], flag: string): string {
  const value = values.shift();
  if (!value) throw new Error(`Missing value for ${flag}`);
  return value;
}
