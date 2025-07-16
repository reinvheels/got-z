import {
  test,
  expect,
  beforeAll,
  afterAll,
  describe,
  beforeEach,
} from "bun:test";
import {
  PushRequest,
  PullRequest,
  PushResponse,
  EdgeDirection,
  Prefixes,
  PullResponse,
} from "@got-z/api-spec";

// Dummy server setup
let server: any;
const TEST_PORT = 3002;
const SERVER_URL = `http://localhost:${TEST_PORT}`;

// Create dummy HTTP server
beforeAll(async () => {
  server = Bun.serve({
    port: TEST_PORT,
    fetch(req) {
      return new Response(JSON.stringify({}), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      });
    },
  });

  // Wait a bit for server to start
  await new Promise((resolve) => setTimeout(resolve, 100));
});

afterAll(() => {
  if (server) {
    server.stop();
  }
});

type Response<T> = {
  status: number;
  data: T;
};

// Helper function to make HTTP requests
async function makeRequest<TRes>(endpoint: string, method: string, body?: any) {
  const response = await fetch(`${SERVER_URL}${endpoint}`, {
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

describe("Large-scale node operations", () => {
  const PERFORMANCE_CONFIG = {
    nodeCount: 10,
    maxMilliseconds: 100,
  };

  let pushRequest: PushRequest = {};
  for (let i = 0; i < PERFORMANCE_CONFIG.nodeCount; i++) {
    pushRequest[`node-${i.toString().padStart(10, "0")}`] = {
      property1: "value1",
    };
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

  test(`POST /push - performance under load < ${PERFORMANCE_CONFIG.maxMilliseconds}ms`, () => {
    expect(resPush.status).toBe(200);
    expect(milliseconds).toBeLessThanOrEqual(
      PERFORMANCE_CONFIG.maxMilliseconds
    );
  });

  describe("Pull operations", () => {
    const pullRequest: PullRequest = {};
    for (let i = 0; i < PERFORMANCE_CONFIG.nodeCount; i++) {
      pullRequest[`node-${i.toString().padStart(10, "0")}`] = {
        property1: true,
      };
    }

    let resPull: Response<any>;

    beforeEach(async () => {
      // Pull large dataset
      const startTime = performance.now();
      resPull = await makeRequest("/pull", "POST", pullRequest);
      const endTime = performance.now();
      milliseconds = endTime - startTime;
    });

    test(`POST /pull - performance under load < ${PERFORMANCE_CONFIG.maxMilliseconds}ms`, () => {
      expect(resPull.status).toBe(200);
      expect(milliseconds).toBeLessThanOrEqual(
        PERFORMANCE_CONFIG.maxMilliseconds
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
    edgeCount: 10,
    maxMilliseconds: 200,
  };

  const rel = `${EdgeDirection.OUT}relationship1`;
  const pushRequest: PushRequest = { mainNode1: { [rel]: {} } };

  // Add edges to different target nodes
  for (let i = 0; i < EDGE_CONFIG.edgeCount; i++) {
    pushRequest.mainNode1[rel][`target-node-${i.toString().padStart(4, "0")}`] =
      {
        [`${Prefixes.EDGE_PROPERTY}weight`]: i,
      };
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

  test(`POST /push - single node with ${EDGE_CONFIG.edgeCount} edges performance < ${EDGE_CONFIG.maxMilliseconds}ms`, () => {
    expect(resPush.status).toBe(200);
    expect(milliseconds).toBeLessThanOrEqual(EDGE_CONFIG.maxMilliseconds);
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

    test(`POST /pull - performance under load < ${EDGE_CONFIG.maxMilliseconds}ms`, () => {
      expect(pullResponse.status).toBe(200);
      expect(milliseconds).toBeLessThanOrEqual(EDGE_CONFIG.maxMilliseconds);
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
