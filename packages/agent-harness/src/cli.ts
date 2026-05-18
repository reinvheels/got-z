#!/usr/bin/env bun
import { initAgentHarness } from "./index";

type CliOptions = {
  command?: string;
  targetDir?: string;
  force: boolean;
  dryRun: boolean;
  help: boolean;
};

function parseArgs(args: readonly string[]): CliOptions {
  const options: CliOptions = {
    force: false,
    dryRun: false,
    help: false,
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

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--target") {
      options.targetDir = remaining.shift();
      continue;
    }

    if (arg?.startsWith("--target=")) {
      options.targetDir = arg.slice("--target=".length);
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
  got-agent-harness init [target-workspace] [--force] [--dry-run]
  got-agent-harness init --target <target-workspace>

Copies got memory management skill and markdown templates into a client workspace.
Existing files are skipped unless --force is passed.`);
}

function printResult(result: Awaited<ReturnType<typeof initAgentHarness>>): void {
  console.log(`Initialized got agent harness templates in ${result.targetDir}`);

  for (const file of result.files) {
    console.log(`${file.action.padEnd(10)} ${file.target}`);
  }
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
  });
  printResult(result);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
