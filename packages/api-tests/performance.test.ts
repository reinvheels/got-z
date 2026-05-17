import { test, expect, describe, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  PushRequest,
  PullRequest,
  PushResponse,
  EdgeDirection,
  Prefixes,
  PullResponse,
} from "@got-z/api-spec";
import { getPermutations } from "@got-z/util";

type RuntimeProcess = ReturnType<typeof Bun.spawn>;

const runtimeBinary = `${import.meta.dir}/../db-runtime/zig-out/bin/db-runtime`;
const persistent = Bun.env.GOT_Z_PERSISTENT === "1";

let runtime: RuntimeProcess | undefined;
let dataDir: string | undefined;
let serverUrl: string;

beforeAll(async () => {
  expect(await Bun.file(runtimeBinary).exists()).toBe(true);

  dataDir = `${Bun.env.TMPDIR ?? "/tmp"}/got-z-performance-${crypto.randomUUID()}`;
  await run(["mkdir", "-p", dataDir]);

  const port = await getFreePort();
  runtime = await startRuntime(dataDir, port);
  serverUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  if (runtime) await stopRuntime(runtime);
  if (dataDir) await run(["rm", "-rf", dataDir]);
});

type Response<T> = {
  status: number;
  data: T;
};

// Helper function to make HTTP requests
async function makeRequest<TRes>(endpoint: string, method: string, body?: any) {
  const response = await fetch(`${serverUrl}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return {
    status: response.status,
    data: await response.json(),
  } as Response<TRes>;
}

async function startRuntime(cwd: string, port: number): Promise<RuntimeProcess> {
  const args = [runtimeBinary, "--port", String(port)];
  if (persistent) args.push("-p");

  const proc = Bun.spawn(args, {
    cwd,
    stdout: "ignore",
    stderr: "ignore",
    env: {
      ...process.env,
      GOT_Z_PORT: String(port),
    },
  });

  await waitForHealth(port, proc);
  return proc;
}

async function stopRuntime(proc: RuntimeProcess): Promise<void> {
  proc.kill();
  const exited = await Promise.race([
    proc.exited.catch(() => undefined),
    Bun.sleep(1000).then(() => "timeout" as const),
  ]);
  if (exited === "timeout") {
    proc.kill("SIGKILL");
    await proc.exited.catch(() => undefined);
  }
}

async function waitForHealth(port: number, proc: RuntimeProcess): Promise<void> {
  const deadline = Date.now() + 5000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    if (proc.exitCode !== null) {
      throw new Error(`db-runtime exited early with code ${proc.exitCode}`);
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

describe("Large-scale node operations", () => {
  const PERFORMANCE_CONFIG = {
    nodeCount: 100000,
    pushMaxMs: 500,
    pullMaxMs: 200,
  };

  let pushRequest: PushRequest = {};
  for (let i = 0; i < PERFORMANCE_CONFIG.nodeCount; i++) {
    pushRequest.write(
      [`node-${i.toString().padStart(10, "0")}`, "property1"],
      "value1"
    );
  }

  let milliseconds: number;
  let resPush: Response<PushResponse>;
  // Configuration for performance tests

  beforeEach(async () => {
    // Push large dataset
    const startTime = performance.now();
    resPush = await makeRequest("/push", "POST", pushRequest);
    const endTime = performance.now();
    milliseconds = endTime - startTime;
  });

  test(`POST /push - performance under load < ${PERFORMANCE_CONFIG.pushMaxMs}ms`, () => {
    expect(milliseconds).toBeLessThanOrEqual(
      PERFORMANCE_CONFIG.pushMaxMs
    );
  });

  describe("Pull operations", () => {
    const pullRequest: PullRequest = {};
    for (let i = 0; i < PERFORMANCE_CONFIG.nodeCount; i++) {
      pullRequest.write(
        [`node-${i.toString().padStart(10, "0")}`, "property1"],
        true
      );
    }

    let resPull: Response<any>;

    beforeEach(async () => {
      // Pull large dataset
      const startTime = performance.now();
      resPull = await makeRequest("/pull", "POST", pullRequest);
      const endTime = performance.now();
      milliseconds = endTime - startTime;
    });

    test(`POST /pull - performance under load < ${PERFORMANCE_CONFIG.pullMaxMs}ms`, () => {
      expect(milliseconds).toBeLessThanOrEqual(
        PERFORMANCE_CONFIG.pullMaxMs
      );
    });

    test("POST /pull - large number of nodes", () => {
      expect(resPull.data).toEqual(
        Object.fromEntries(
          Object.keys(pullRequest).map((key) => [key, { property1: "value1" }])
        )
      );
    });
  });
});

describe("Single node with multiple edges", () => {
  const EDGE_CONFIG = {
    edgeCount: 100000,
    pushMaxMs: 1000,
    pullMaxMs: 200,
  };

  const rel = `${EdgeDirection.OUT}relationship1`;
  const pushRequest: PushRequest = {};

  // Add edges to different target nodes
  for (let i = 0; i < EDGE_CONFIG.edgeCount; i++) {
    pushRequest.write(
      [
        "mainNode1",
        rel,
        `target-node-${i.toString().padStart(10, "0")}`,
        `${Prefixes.EDGE_PROPERTY}weight`,
      ],
      i
    );
  }
  let milliseconds: number;
  let resPush: Response<PushResponse>;

  beforeEach(async () => {
    // Push the data
    const startTime = performance.now();
    resPush = await makeRequest("/push", "POST", pushRequest);
    const endTime = performance.now();
    milliseconds = endTime - startTime;
  });

  test(`POST /push - single node with ${EDGE_CONFIG.edgeCount} edges performance < ${EDGE_CONFIG.pushMaxMs}ms`, () => {
    expect(milliseconds).toBeLessThanOrEqual(EDGE_CONFIG.pushMaxMs);
  });

  describe("Pull operations with edges", () => {
    let pullResponse: Response<PullResponse>;
    const pullRequest: PullRequest = {
      mainNode1: {
        [`${EdgeDirection.OUT}relationship1`]: {
          [`${Prefixes.EDGE_PROPERTY}weight`]: true,
        },
      },
    };

    beforeEach(async () => {
      // Pull edges and connected nodes
      const startTime = performance.now();
      pullResponse = await makeRequest("/pull", "POST", pullRequest);
      const endTime = performance.now();
      milliseconds = endTime - startTime;
    });

    test(`POST /pull - performance under load < ${EDGE_CONFIG.pullMaxMs}ms`, () => {
      expect(milliseconds).toBeLessThanOrEqual(EDGE_CONFIG.pullMaxMs);
    });

    test("POST /pull - query edges and connected nodes", async () => {
      const response = await makeRequest<PullResponse>(
        "/pull",
        "POST",
        pullRequest
      );

      const rel = `${EdgeDirection.OUT}relationship1`;
      expect(response.data).toEqual({
        mainNode1: {
          [rel]: Object.fromEntries(
            Object.keys(pushRequest.mainNode1[rel]).map((key, index) => [
              key,
              {
                [`${Prefixes.EDGE_PROPERTY}weight`]: index,
              },
            ])
          ),
        },
      });
    });
  });
});

describe.skip("Nested queries with multiple levels", () => {
  const NESTED_CONFIG = {
    levels: 3,
    nodesPerLevel: 4,
    maxMilliseconds: 200,
  };

  const rel = `${EdgeDirection.OUT}relationship1`;
  const pushRequest: PushRequest = {};

  getPermutations(NESTED_CONFIG.levels, NESTED_CONFIG.nodesPerLevel)
    .map((digits) =>
      digits
        .reduce<string[]>(
          (a, _, i) => [
            ...a,
            ">relationship1",
            `node-${digits.slice(0, i + 1).join("-")}`,
          ],
          ["root-node"]
        )
        .concat("prop1")
    )
    .forEach((path) => pushRequest.write(path, "val1"));

  let milliseconds: number;
  let resPush: Response<PushResponse>;

  beforeEach(async () => {
    // Push the nested data
    const startTime = performance.now();
    resPush = await makeRequest("/push", "POST", pushRequest);
    const endTime = performance.now();
    milliseconds = endTime - startTime;
  });

  test(`POST /push - nested structure with ${NESTED_CONFIG.levels} levels performance < ${NESTED_CONFIG.maxMilliseconds}ms`, () => {
    expect(milliseconds).toBeLessThanOrEqual(NESTED_CONFIG.maxMilliseconds);
  });

  describe("Pull operations for nested queries", () => {
    let pullResponse: Response<PullResponse>;

    // Create nested pull request structure with nested relationship paths
    const pullRequest: PullRequest = {};
    pullRequest.write(
      ["root-node", ...Array(NESTED_CONFIG.levels).fill(rel), "prop1"],
      true
    );

    beforeEach(async () => {
      // Pull nested data
      const startTime = performance.now();
      pullResponse = await makeRequest("/pull", "POST", pullRequest);
      const endTime = performance.now();
      milliseconds = endTime - startTime;
    });

    test(`POST /pull - nested query performance < ${NESTED_CONFIG.maxMilliseconds}ms`, () => {
      expect(milliseconds).toBeLessThanOrEqual(NESTED_CONFIG.maxMilliseconds);
    });

    test("POST /pull - verify nested structure data", async () => {
      expect(pullResponse.data).toEqual(pushRequest);
    });
  });
});
