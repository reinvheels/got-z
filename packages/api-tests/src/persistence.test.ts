import { afterEach, expect, test } from "bun:test";
import {
  createTempDataDir,
  ensureRuntimeBinary,
  getFreePort,
  removeDir,
  startRuntime,
  stopRuntime,
  waitForWalEntries,
  type RuntimeProcess,
} from "./runtime-harness";

const startedProcesses: RuntimeProcess[] = [];
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(startedProcesses.splice(0).map(stopRuntime));
  for (const dir of tempDirs.splice(0)) {
    await removeDir(dir);
  }
});

test("runtime persists pushed graph data across restart", async () => {
  await ensureRuntimeBinary();

  const dataDir = await createTempDataDir("got-persistence");
  tempDirs.push(dataDir);

  const port = await getFreePort();

  let runtime = await trackedStartRuntime(dataDir, port, { persistent: true });
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
  await waitForWalEntries(dataDir, 2);

  await trackedStopRuntime(runtime);

  runtime = await trackedStartRuntime(dataDir, port, { persistent: true });
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

test("runtime is ephemeral by default", async () => {
  await ensureRuntimeBinary();

  const dataDir = await createTempDataDir("got-ephemeral");
  tempDirs.push(dataDir);

  const port = await getFreePort();

  let runtime = await trackedStartRuntime(dataDir, port);
  await makeRequest(port, "/push", {
    "node-1": {
      property1: "value1",
    },
  });

  await trackedStopRuntime(runtime);

  runtime = await trackedStartRuntime(dataDir, port);
  const response = await makeRequest(port, "/pull", {
    "node-1": {
      property1: true,
    },
  });

  expect(response).toEqual({});
  expect(await Bun.file(`${dataDir}/got.wal`).exists()).toBe(false);
});

async function trackedStartRuntime(
  cwd: string,
  port: number,
  options: { persistent?: boolean } = {},
): Promise<RuntimeProcess> {
  const runtime = await startRuntime(cwd, port, options);
  startedProcesses.push(runtime);
  return runtime;
}

async function trackedStopRuntime(runtime: RuntimeProcess): Promise<void> {
  const index = startedProcesses.indexOf(runtime);
  if (index >= 0) startedProcesses.splice(index, 1);

  await stopRuntime(runtime);
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
