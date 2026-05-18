import { $ } from "bun";

export type RuntimeWorkspaceConfig = {
  readonly version: 1;
  readonly url: string;
  readonly port: string;
  readonly cwd: string;
  readonly bin: string;
  readonly persistent: boolean;
  readonly pidFile: string;
  readonly logFile: string;
  readonly stateFile: string;
};

export type RuntimeConfigInput = {
  readonly runtimeUrl?: string;
  readonly runtimeCwd?: string;
  readonly runtimeBin?: string;
  readonly persistent?: boolean;
};

export type RuntimePaths = {
  readonly root: string;
  readonly cwd: string;
  readonly pidFile: string;
  readonly logFile: string;
  readonly stateFile: string;
  readonly configFile: string;
};

export type RuntimeCheckResult = {
  readonly ok: boolean;
  readonly status?: number;
  readonly body?: unknown;
  readonly error?: string;
};

export type RuntimeStatusResult = {
  readonly running: boolean;
  readonly managed: boolean;
  readonly reachable: boolean;
  readonly pid?: number;
  readonly pidRunning: boolean;
  readonly url: string;
  readonly cwd: string;
  readonly logFile: string;
  readonly error?: string;
};

export type RuntimeStartResult = {
  readonly status: "already-running" | "started";
  readonly pid?: number;
  readonly url: string;
  readonly cwd: string;
  readonly logFile: string;
};

export type RuntimeStopResult = {
  readonly status: "stopped" | "not-running";
  readonly pid?: number;
};

export type RuntimeForegroundResult = RuntimeStartResult & {
  readonly exitCode: number;
};

export type RuntimeClientFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

export const defaultRuntimeUrl = "http://127.0.0.1:3001";
export const defaultRuntimeCwd = ".got/db";
export const defaultRuntimePidFile = ".got/runtime.pid";
export const defaultRuntimeLogFile = ".got/runtime.log";
export const defaultRuntimeStateFile = ".got/runtime.state.json";
export const runtimeConfigFile = ".got/runtime.json";

const healthTimeoutMs = 500;
const startTimeoutMs = 5000;
const stopTimeoutMs = 3000;

export class GotRuntimeRequestError extends Error {
  readonly status?: number;
  readonly body?: string;

  constructor(message: string, input: { status?: number; body?: string; cause?: unknown } = {}) {
    super(message);
    this.name = "GotRuntimeRequestError";
    this.status = input.status;
    this.body = input.body;
    if (input.cause) this.cause = input.cause;
  }
}

export class GotRuntimeClient {
  readonly url: string;
  private readonly fetchImpl: RuntimeClientFetch;

  constructor(input: { readonly url: string; readonly fetch?: RuntimeClientFetch }) {
    this.url = normalizeRuntimeUrl(input.url);
    this.fetchImpl = input.fetch ?? fetch;
  }

  async check(): Promise<RuntimeCheckResult> {
    try {
      const response = await this.fetchWithTimeout(this.url, { method: "GET" }, healthTimeoutMs);
      const body = await readJsonOrText(response);
      return {
        ok: response.ok,
        status: response.status,
        body,
        error: response.ok ? undefined : stringifyBody(body),
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  pull(body: unknown): Promise<unknown> {
    return this.postJson("/pull", body);
  }

  push(body: unknown): Promise<unknown> {
    return this.postJson("/push", body);
  }

  private async postJson(path: "/pull" | "/push", body: unknown): Promise<unknown> {
    let response: Response;

    try {
      response = await this.fetchWithTimeout(
        `${this.url}${path}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        },
        healthTimeoutMs,
      );
    } catch (error) {
      throw new GotRuntimeRequestError(`got runtime request failed: ${path}`, { cause: error });
    }

    const text = await response.text();
    const parsed = parseJsonOrText(text);

    if (!response.ok) {
      throw new GotRuntimeRequestError(`got runtime request failed: ${path}`, {
        status: response.status,
        body: text,
      });
    }

    return parsed;
  }

  private async fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await this.fetchImpl(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

export async function buildRuntimeWorkspaceConfig(input: RuntimeConfigInput = {}): Promise<RuntimeWorkspaceConfig> {
  const url = normalizeRuntimeUrl(input.runtimeUrl ?? defaultRuntimeUrl);
  const parsedUrl = new URL(url);

  return {
    version: 1,
    url,
    port: parsedUrl.port || "3001",
    cwd: input.runtimeCwd ?? defaultRuntimeCwd,
    bin: input.runtimeBin ?? (await resolveDefaultRuntimeBin()),
    persistent: input.persistent ?? false,
    pidFile: defaultRuntimePidFile,
    logFile: defaultRuntimeLogFile,
    stateFile: defaultRuntimeStateFile,
  };
}

export async function loadRuntimeWorkspaceConfig(
  targetDir = process.cwd(),
  overrides: RuntimeConfigInput = {},
): Promise<RuntimeWorkspaceConfig> {
  const root = resolvePath(targetDir);
  const configPath = joinPath(root, runtimeConfigFile);
  const exists = await Bun.file(configPath).exists();
  const stored = exists ? ((await Bun.file(configPath).json()) as Partial<RuntimeWorkspaceConfig>) : {};
  const base = await buildRuntimeWorkspaceConfig({
    runtimeUrl: overrides.runtimeUrl ?? stored.url,
    runtimeCwd: overrides.runtimeCwd ?? stored.cwd,
    runtimeBin: overrides.runtimeBin ?? stored.bin,
    persistent: overrides.persistent ?? stored.persistent,
  });

  return {
    ...base,
    pidFile: stored.pidFile ?? base.pidFile,
    logFile: stored.logFile ?? base.logFile,
    stateFile: stored.stateFile ?? base.stateFile,
  };
}

export async function writeRuntimeWorkspaceConfig(
  targetDir: string,
  config: RuntimeWorkspaceConfig,
): Promise<void> {
  const path = joinPath(resolvePath(targetDir), runtimeConfigFile);
  await $`mkdir -p ${dirname(path)}`.quiet();
  await Bun.write(path, `${JSON.stringify(config, null, 2)}\n`);
}

export function getRuntimePaths(targetDir: string, config: RuntimeWorkspaceConfig): RuntimePaths {
  const root = resolvePath(targetDir);

  return {
    root,
    cwd: resolveConfigPath(root, config.cwd),
    pidFile: resolveConfigPath(root, config.pidFile),
    logFile: resolveConfigPath(root, config.logFile),
    stateFile: resolveConfigPath(root, config.stateFile),
    configFile: joinPath(root, runtimeConfigFile),
  };
}

export function createRuntimeClient(config: RuntimeWorkspaceConfig): GotRuntimeClient {
  return new GotRuntimeClient({ url: config.url });
}

export async function getRuntimeStatus(targetDir = process.cwd()): Promise<RuntimeStatusResult> {
  const config = await loadRuntimeWorkspaceConfig(targetDir);
  return getRuntimeStatusForConfig(targetDir, config);
}

async function getRuntimeStatusForConfig(
  targetDir: string,
  config: RuntimeWorkspaceConfig,
): Promise<RuntimeStatusResult> {
  const paths = getRuntimePaths(targetDir, config);
  const pid = await readPid(paths.pidFile);
  const pidRunning = pid !== undefined && isPidRunning(pid);
  const health = await createRuntimeClient(config).check();
  const reachable = health.ok;

  return {
    running: pidRunning || reachable,
    managed: pid !== undefined,
    reachable,
    pid,
    pidRunning,
    url: config.url,
    cwd: paths.cwd,
    logFile: paths.logFile,
    error: health.error,
  };
}

export async function startRuntime(
  targetDir = process.cwd(),
  overrides: RuntimeConfigInput = {},
): Promise<RuntimeStartResult> {
  const config = await loadRuntimeWorkspaceConfig(targetDir, overrides);
  const paths = getRuntimePaths(targetDir, config);
  const status = await getRuntimeStatusForConfig(targetDir, config);

  if (status.running && status.reachable) {
    return {
      status: "already-running",
      pid: status.pid,
      url: config.url,
      cwd: paths.cwd,
      logFile: paths.logFile,
    };
  }

  await ensureRuntimeDirectories(paths);

  const script = buildRuntimeSpawnScript(config, targetDir);
  const process = Bun.spawn(["sh", "-c", script], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdoutPromise = process.stdout ? new Response(process.stdout).text() : Promise.resolve("");
  const stderrPromise = process.stderr ? new Response(process.stderr).text() : Promise.resolve("");
  const [stdout, stderr, exitCode] = await Promise.all([stdoutPromise, stderrPromise, process.exited]);

  if (exitCode !== 0) {
    throw new GotRuntimeRequestError(`failed to start got runtime: ${stderr.trim() || stdout.trim()}`);
  }

  const pid = Number.parseInt(stdout.trim(), 10);
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new GotRuntimeRequestError(`failed to read got runtime pid from start command: ${stdout.trim()}`);
  }

  await writeRuntimeState(paths, config, pid);

  await waitForRuntime(config, pid);

  return {
    status: "started",
    pid,
    url: config.url,
    cwd: paths.cwd,
    logFile: paths.logFile,
  };
}

export async function runRuntimeForeground(
  targetDir = process.cwd(),
  overrides: RuntimeConfigInput = {},
  onStarted?: (result: RuntimeStartResult) => void,
): Promise<RuntimeForegroundResult> {
  const config = await loadRuntimeWorkspaceConfig(targetDir, overrides);
  const paths = getRuntimePaths(targetDir, config);
  const status = await getRuntimeStatusForConfig(targetDir, config);

  if (status.running && status.reachable) {
    const result: RuntimeStartResult = {
      status: "already-running",
      pid: status.pid,
      url: config.url,
      cwd: paths.cwd,
      logFile: paths.logFile,
    };
    onStarted?.(result);
    return { ...result, exitCode: 0 };
  }

  await ensureRuntimeDirectories(paths);

  const child = Bun.spawn(
    [
      config.bin,
      "--port",
      config.port,
      ...(config.persistent ? ["--persistent"] : []),
    ],
    {
      cwd: paths.cwd,
      env: {
        ...process.env,
        GOT_PORT: config.port,
      },
      stdin: "ignore",
      stdout: "inherit",
      stderr: "inherit",
    },
  );
  const pid = child.pid;

  await writeRuntimeState(paths, config, pid);

  const result: RuntimeStartResult = {
    status: "started",
    pid,
    url: config.url,
    cwd: paths.cwd,
    logFile: paths.logFile,
  };
  onStarted?.(result);

  const exitCode = await child.exited;
  await cleanupRuntimeMetadata(paths);
  return { ...result, exitCode };
}

export async function stopRuntime(targetDir = process.cwd()): Promise<RuntimeStopResult> {
  const config = await loadRuntimeWorkspaceConfig(targetDir);
  const paths = getRuntimePaths(targetDir, config);
  const pid = await readPid(paths.pidFile);

  if (pid === undefined || !isPidRunning(pid)) {
    await cleanupRuntimeMetadata(paths);
    return { status: "not-running", pid };
  }

  process.kill(pid, "SIGTERM");
  const stopped = await waitForPidExit(pid, stopTimeoutMs);

  if (!stopped && isPidRunning(pid)) {
    process.kill(pid, "SIGKILL");
    await waitForPidExit(pid, 1000);
  }

  await cleanupRuntimeMetadata(paths);
  return { status: "stopped", pid };
}

export function buildRuntimeSpawnScript(config: RuntimeWorkspaceConfig, targetDir: string): string {
  const paths = getRuntimePaths(targetDir, config);
  const args = [
    shellQuote(config.bin),
    "--port",
    shellQuote(config.port),
    ...(config.persistent ? ["--persistent"] : []),
  ];

  return [
    `cd ${shellQuote(paths.cwd)}`,
    `{ nohup env GOT_PORT=${shellQuote(config.port)} ${args.join(" ")} >> ${shellQuote(paths.logFile)} 2>&1 & echo $!; }`,
  ].join(" && ");
}

export async function resolveDefaultRuntimeBin(): Promise<string> {
  const candidates = [
    joinPath(import.meta.dir, "..", "..", "db-runtime", "zig-out", "bin", "db-runtime"),
    joinPath(import.meta.dir, "..", "..", "..", "db-runtime", "zig-out", "bin", "db-runtime"),
  ];

  for (const candidate of candidates) {
    if (await Bun.file(candidate).exists()) return candidate;
  }

  return "db-runtime";
}

export function normalizeRuntimeUrl(value: string): string {
  const url = new URL(value);
  if (!url.port) url.port = "3001";
  return url.toString().replace(/\/$/, "");
}

export function resolvePath(path: string): string {
  if (path.startsWith("/")) return stripTrailingSlash(path);
  return joinPath(process.cwd(), path);
}

export function joinPath(...parts: readonly string[]): string {
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

export function stripTrailingSlash(path: string): string {
  if (path === "/") return path;
  return path.replace(/\/+$/, "");
}

export function basename(path: string): string {
  const normalized = stripTrailingSlash(path);
  const parts = normalized.split("/");
  return parts[parts.length - 1] || "workspace";
}

export function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function waitForRuntime(config: RuntimeWorkspaceConfig, pid: number): Promise<void> {
  const started = Date.now();
  let lastError = "not checked";

  while (Date.now() - started < startTimeoutMs) {
    if (!isPidRunning(pid)) {
      throw new GotRuntimeRequestError(`got runtime exited before becoming healthy: ${lastError}`);
    }

    const check = await createRuntimeClient(config).check();
    if (check.ok) return;
    lastError = check.error ?? `HTTP ${check.status ?? "unknown"}`;
    await sleep(100);
  }

  throw new GotRuntimeRequestError(`got runtime did not become healthy at ${config.url}: ${lastError}`);
}

async function waitForPidExit(pid: number, timeoutMs: number): Promise<boolean> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (!isPidRunning(pid)) return true;
    await sleep(100);
  }

  return !isPidRunning(pid);
}

async function readPid(path: string): Promise<number | undefined> {
  if (!(await Bun.file(path).exists())) return undefined;

  const value = (await Bun.file(path).text()).trim();
  const pid = Number.parseInt(value, 10);
  return Number.isInteger(pid) && pid > 0 ? pid : undefined;
}

async function cleanupRuntimeMetadata(paths: RuntimePaths): Promise<void> {
  await $`rm -f ${paths.pidFile} ${paths.stateFile}`.quiet();
}

async function ensureRuntimeDirectories(paths: RuntimePaths): Promise<void> {
  await $`mkdir -p ${paths.cwd} ${dirname(paths.pidFile)} ${dirname(paths.logFile)} ${dirname(paths.stateFile)}`.quiet();
}

async function writeRuntimeState(
  paths: RuntimePaths,
  config: RuntimeWorkspaceConfig,
  pid: number,
): Promise<void> {
  await Bun.write(paths.pidFile, `${pid}\n`);
  await Bun.write(
    paths.stateFile,
    `${JSON.stringify(
      {
        pid,
        startedAt: new Date().toISOString(),
        url: config.url,
        cwd: paths.cwd,
        bin: config.bin,
        persistent: config.persistent,
      },
      null,
      2,
    )}\n`,
  );
}

function isPidRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function resolveConfigPath(root: string, path: string): string {
  if (path.startsWith("/")) return stripTrailingSlash(path);
  return joinPath(root, path);
}

function dirname(path: string): string {
  const normalized = stripTrailingSlash(path);
  const index = normalized.lastIndexOf("/");
  if (index <= 0) return "/";
  return normalized.slice(0, index);
}

async function readJsonOrText(response: Response): Promise<unknown> {
  const text = await response.text();
  return parseJsonOrText(text);
}

function parseJsonOrText(text: string): unknown {
  if (text.trim().length === 0) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function stringifyBody(body: unknown): string {
  return typeof body === "string" ? body : JSON.stringify(body);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
