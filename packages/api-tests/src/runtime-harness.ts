export type RuntimeProcess = ReturnType<typeof Bun.spawn>;

export type RuntimeHarness = {
  cwd: string;
  port: number;
  url: string;
  runtime: RuntimeProcess;
};

export type RuntimeOptions = {
  persistent?: boolean;
};

export const runtimeBinary = `${import.meta.dir}/../../db-runtime/zig-out/bin/db-runtime`;

export async function createRuntimeHarness(
  prefix: string,
  options: RuntimeOptions = {},
): Promise<RuntimeHarness> {
  await ensureRuntimeBinary();

  const cwd = await createTempDataDir(prefix);
  const port = await getFreePort();
  const runtime = await startRuntime(cwd, port, options);

  return {
    cwd,
    port,
    runtime,
    url: `http://127.0.0.1:${port}`,
  };
}

export async function cleanupRuntimeHarness(harness: RuntimeHarness): Promise<void> {
  await stopRuntime(harness.runtime);
  await removeDir(harness.cwd);
}

export async function ensureRuntimeBinary(): Promise<void> {
  if (!(await Bun.file(runtimeBinary).exists())) {
    throw new Error(`db-runtime binary not found at ${runtimeBinary}`);
  }
}

export async function createTempDataDir(prefix: string): Promise<string> {
  const dir = `${Bun.env.TMPDIR ?? "/tmp"}/${prefix}-${crypto.randomUUID()}`;
  await run(["mkdir", "-p", dir]);
  return dir;
}

export async function removeDir(dir: string): Promise<void> {
  await run(["rm", "-rf", dir]);
}

export async function startRuntime(
  cwd: string,
  port: number,
  options: RuntimeOptions = {},
): Promise<RuntimeProcess> {
  const args = [runtimeBinary, "--port", String(port)];
  if (options.persistent) args.push("-p");

  const runtime = Bun.spawn(args, {
    cwd,
    stdout: "ignore",
    stderr: "ignore",
    env: {
      ...process.env,
      GOT_PORT: String(port),
    },
  });

  await waitForHealth(port, runtime);
  return runtime;
}

export async function stopRuntime(runtime: RuntimeProcess): Promise<void> {
  runtime.kill();
  const exited = await Promise.race([
    runtime.exited.catch(() => undefined),
    Bun.sleep(1000).then(() => "timeout" as const),
  ]);
  if (exited === "timeout") {
    runtime.kill("SIGKILL");
    await runtime.exited.catch(() => undefined);
  }
}

export async function waitForHealth(port: number, runtime: RuntimeProcess): Promise<void> {
  const deadline = Date.now() + 5000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    if (runtime.exitCode !== null) {
      throw new Error(`db-runtime exited early with code ${runtime.exitCode}`);
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.status === 200) return;
    } catch (err) {
      lastError = err;
    }

    await Bun.sleep(25);
  }

  throw new Error(`db-runtime did not become healthy on port ${port}: ${lastError}`);
}

export async function getFreePort(): Promise<number> {
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch() {
      return new Response("ok");
    },
  });
  const port = server.port;
  if (port === undefined) {
    await server.stop(true);
    throw new Error("Could not allocate TCP port");
  }
  await server.stop(true);
  return port;
}

export async function waitForWalEntries(dataDir: string, expectedEntries: number): Promise<void> {
  const walPath = `${dataDir}/got.wal`;
  const deadline = Date.now() + 5000;

  while (Date.now() < deadline) {
    const wal = Bun.file(walPath);
    if (await wal.exists()) {
      const content = await wal.text();
      if (countWalEntries(content) >= expectedEntries) return;
    }

    await Bun.sleep(25);
  }

  throw new Error(`got.wal did not reach ${expectedEntries} entries in ${dataDir}`);
}

function countWalEntries(content: string): number {
  const trimmed = content.trimStart();
  if (trimmed.length === 0) return 0;

  if (!/^\d/.test(trimmed)) {
    return content.split("\n").filter((line) => line.trim().length > 0).length;
  }

  let count = 0;
  let offset = content.length - trimmed.length;
  while (offset < content.length) {
    const lineEnd = content.indexOf("\n", offset);
    if (lineEnd < 0) break;

    const length = Number.parseInt(content.slice(offset, lineEnd).trim(), 10);
    if (!Number.isFinite(length)) break;

    const bodyStart = lineEnd + 1;
    const bodyEnd = bodyStart + length;
    if (bodyEnd > content.length) break;

    count++;
    offset = bodyEnd;
    if (content[offset] === "\n") offset++;
  }

  return count;
}

async function run(cmd: string[]): Promise<void> {
  const proc = Bun.spawn(cmd, {
    stdout: "ignore",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`${cmd.join(" ")} failed with exit code ${exitCode}`);
  }
}
