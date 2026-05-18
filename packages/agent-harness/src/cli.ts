#!/usr/bin/env bun
import { initAgentHarness } from "./index";
import {
  GotRuntimeClient,
  defaultMemoryPullQuery,
  ensureRuntime,
  getRuntimeStatus,
  loadRuntimeWorkspaceConfig,
  runRuntimeForeground,
  startRuntime,
  stopRuntime,
  type RuntimeConfigInput,
} from "./runtime";

type CliOptions = {
  command?: string;
  runtimeAction?: string;
  targetDir?: string;
  force: boolean;
  dryRun: boolean;
  help: boolean;
  withAgents: boolean;
  workspaceName?: string;
  runtimeUrl?: string;
  runtimeCwd?: string;
  runtimeBin?: string;
  persistent?: boolean;
  detach: boolean;
  body?: string;
  file?: string;
};

function parseArgs(args: readonly string[]): CliOptions {
  const options: CliOptions = {
    force: false,
    dryRun: false,
    help: false,
    withAgents: false,
    detach: false,
  };

  const remaining = [...args];
  options.command = remaining.shift();

  if (options.command === "runtime") {
    options.runtimeAction = remaining.shift();
  }

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

    if (arg === "--detach") {
      options.detach = true;
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

    if (arg === "--runtime-bin") {
      options.runtimeBin = readRequiredValue(remaining, arg);
      continue;
    }

    if (arg?.startsWith("--runtime-bin=")) {
      options.runtimeBin = arg.slice("--runtime-bin=".length);
      continue;
    }

    if (arg === "--body") {
      options.body = readRequiredValue(remaining, arg);
      continue;
    }

    if (arg?.startsWith("--body=")) {
      options.body = arg.slice("--body=".length);
      continue;
    }

    if (arg === "--file") {
      options.file = readRequiredValue(remaining, arg);
      continue;
    }

    if (arg?.startsWith("--file=")) {
      options.file = arg.slice("--file=".length);
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
  got-agent-harness init . --with-agents --runtime-url http://127.0.0.1:3199 --runtime-cwd .got/db --runtime-bin /path/to/db-runtime --persistent

  got-agent-harness runtime start [target-workspace]
  got-agent-harness runtime start [target-workspace] --detach
  got-agent-harness runtime ensure [target-workspace]
  got-agent-harness runtime status [target-workspace]
  got-agent-harness runtime stop [target-workspace]

  got-agent-harness pull [target-workspace]
  got-agent-harness pull [target-workspace] --body '<raw got JSON>'
  got-agent-harness push [target-workspace] --body '<raw got JSON>'
  got-agent-harness pull --file request.json
  got-agent-harness push < request.json

Copies got memory management skill and bootstrap templates into a client workspace.
Runtime commands read .got/runtime.json from the target workspace and print JSON.
Pull and push automatically ensure the workspace singleton runtime before exchanging JSON.

Options:
  --with-agents              Create or update AGENTS.md with got memory-management instructions.
  --workspace-name <name>    Workspace name written to .got/memory/current.md.
  --runtime-url <url>        got runtime URL. Init auto-selects a free localhost port when omitted.
  --runtime-cwd <path>       Runtime working directory. Defaults to .got/db.
  --runtime-bin <path>       db-runtime binary path. Defaults to the repo build when available.
  --persistent               Mark or start the runtime as persistent.
  --detach                   Start runtime as a detached process instead of foreground.
  --body <json>              Raw got JSON request body for pull or push. Pull without a body uses the default memory query.
  --file <path>              Read raw got JSON request body from a file.
  --dry-run                  Show intended file actions without writing files.
  --force                    Overwrite existing template files.`);
}

function printInitResult(result: Awaited<ReturnType<typeof initAgentHarness>>): void {
  console.log(`Initialized got agent harness templates in ${result.targetDir}`);

  for (const file of result.files) {
    console.log(`${file.action.padEnd(10)} ${file.target}`);
  }

  console.log("");
  console.log(`Runtime URL: ${result.runtime.url}`);
  console.log(`Runtime working directory: ${result.runtime.cwd}`);
  console.log(`Runtime binary: ${result.runtime.bin}`);
  console.log("Use the got agent harness runtime commands from the workspace root:");
  console.log(`  ${result.runtime.command}`);
  console.log(`  ${result.runtime.cliCommand} runtime status`);
  console.log(`  ${result.runtime.cliCommand} pull`);
}

try {
  const options = parseArgs(Bun.argv.slice(2));

  if (options.help || !options.command) {
    printHelp();
    process.exit(0);
  }

  if (options.command === "init") {
    const result = await initAgentHarness({
      targetDir: options.targetDir,
      force: options.force,
      dryRun: options.dryRun,
      withAgents: options.withAgents,
      workspaceName: options.workspaceName,
      runtimeUrl: options.runtimeUrl,
      runtimeCwd: options.runtimeCwd,
      runtimeBin: options.runtimeBin,
      persistent: options.persistent,
    });
    printInitResult(result);
    process.exit(0);
  }

  if (options.command === "runtime") {
    await handleRuntimeCommand(options);
    process.exit(0);
  }

  if (options.command === "pull" || options.command === "push") {
    await handleExchangeCommand(options);
    process.exit(0);
  }

  throw new Error(`Unknown command: ${options.command}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

async function handleRuntimeCommand(options: CliOptions): Promise<void> {
  const targetDir = options.targetDir ?? process.cwd();

  if (!options.runtimeAction) {
    throw new Error("Missing runtime action. Use ensure, start, status, or stop.");
  }

  if (options.runtimeAction === "start") {
    const overrides = {
      runtimeUrl: options.runtimeUrl,
      runtimeCwd: options.runtimeCwd,
      runtimeBin: options.runtimeBin,
      persistent: options.persistent,
    };

    if (options.detach) {
      printJson(await startRuntime(targetDir, overrides));
      return;
    }

    const result = await runRuntimeForeground(targetDir, overrides, printJson);
    process.exit(result.exitCode);
    return;
  }

  if (options.runtimeAction === "ensure") {
    printJson(await ensureRuntime(targetDir, runtimeOverrides(options)));
    return;
  }

  if (options.runtimeAction === "status") {
    printJson(await getRuntimeStatus(targetDir));
    return;
  }

  if (options.runtimeAction === "stop") {
    printJson(await stopRuntime(targetDir));
    return;
  }

  throw new Error(`Unknown runtime action: ${options.runtimeAction}`);
}

async function handleExchangeCommand(options: CliOptions): Promise<void> {
  const targetDir = options.targetDir ?? process.cwd();
  const overrides = runtimeOverrides(options);
  await ensureRuntime(targetDir, overrides);
  const config = await loadRuntimeWorkspaceConfig(targetDir, overrides);
  const client = new GotRuntimeClient({ url: config.url });
  const body = await readRequestBody(options);
  const result = options.command === "pull" ? await client.pull(body) : await client.push(body);
  printJson(result);
}

function runtimeOverrides(options: CliOptions): RuntimeConfigInput {
  return {
    runtimeUrl: options.runtimeUrl,
    runtimeCwd: options.runtimeCwd,
    runtimeBin: options.runtimeBin,
    persistent: options.persistent,
  };
}

async function readRequestBody(options: CliOptions): Promise<unknown> {
  if (options.body !== undefined) return parseJsonBody(options.body);
  if (options.file !== undefined) return parseJsonBody(await Bun.file(options.file).text());
  if (process.stdin.isTTY) {
    return options.command === "pull" ? defaultMemoryPullQuery : {};
  }

  const text = await new Response(Bun.stdin.stream()).text();
  if (text.trim().length === 0) {
    return options.command === "pull" ? defaultMemoryPullQuery : {};
  }

  return parseJsonBody(text);
}

function parseJsonBody(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch (error) {
    throw new Error(`Invalid JSON body: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function readRequiredValue(values: string[], flag: string): string {
  const value = values.shift();
  if (!value) throw new Error(`Missing value for ${flag}`);
  return value;
}
