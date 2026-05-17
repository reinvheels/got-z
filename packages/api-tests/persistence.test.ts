import { afterEach, expect, test } from "bun:test";

type RuntimeProcess = ReturnType<typeof Bun.spawn>;

const runtimeBinary = `${import.meta.dir}/../db-runtime/zig-out/bin/db-runtime`;

const startedProcesses: RuntimeProcess[] = [];
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(startedProcesses.splice(0).map(stopRuntime));
  for (const dir of tempDirs.splice(0)) {
    await run(["rm", "-rf", dir]);
  }
});

test("runtime persists pushed graph data across restart", async () => {
  expect(await Bun.file(runtimeBinary).exists()).toBe(true);

  const dataDir = `${Bun.env.TMPDIR ?? "/tmp"}/got-z-persistence-${crypto.randomUUID()}`;
  await run(["mkdir", "-p", dataDir]);
  tempDirs.push(dataDir);

  const port = await getFreePort();

  let runtime = await startRuntime(dataDir, port);
  await makeRequest(port, "/push", {
    "node-1": {
      property1: "value1",
      property2: 42,
      ">relationship1": {
        "node-2": {
          "-weight": 7,
          label: "target",
        },
      },
    },
  });
  await makeRequest(port, "/push", {
    "node-2": {
      property3: "value3",
    },
  });

  await stopRuntime(runtime);

  runtime = await startRuntime(dataDir, port);
  const response = await makeRequest(port, "/pull", {
    "node-1": {
      property1: true,
      property2: true,
      ">relationship1": {
        "-weight": true,
        label: true,
      },
    },
    "node-2": {
      property3: true,
    },
  });

  expect(response).toEqual({
    "node-1": {
      property1: "value1",
      property2: 42,
      ">relationship1": {
        "node-2": {
          "-weight": 7,
          label: "target",
        },
      },
    },
    "node-2": {
      property3: "value3",
    },
  });
});

async function startRuntime(cwd: string, port: number): Promise<RuntimeProcess> {
  const runtime = Bun.spawn([runtimeBinary, "--port", String(port)], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      GOT_Z_PORT: String(port),
    },
  });
  startedProcesses.push(runtime);

  await waitForHealth(port, runtime);
  return runtime;
}

async function stopRuntime(runtime: RuntimeProcess): Promise<void> {
  const index = startedProcesses.indexOf(runtime);
  if (index >= 0) startedProcesses.splice(index, 1);

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

async function waitForHealth(port: number, runtime: RuntimeProcess): Promise<void> {
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

async function makeRequest(port: number, endpoint: "/push" | "/pull", body: unknown) {
  const response = await fetch(`http://127.0.0.1:${port}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  expect(response.status).toBe(200);
  return response.json();
}

async function getFreePort(): Promise<number> {
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
