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
import "@got-z/util";

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

  test(`POST /push - performance under load < ${PERFORMANCE_CONFIG.maxMilliseconds}ms`, () => {
    expect(resPush.status).toBe(200);
    expect(milliseconds).toBeLessThanOrEqual(
      PERFORMANCE_CONFIG.maxMilliseconds
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

describe.skip("Nested queries with multiple levels", () => {
  const NESTED_CONFIG = {
    levels: 3,
    nodesPerLevel: 3,
    maxMilliseconds: 300,
  };

  const rel = `${EdgeDirection.OUT}relationship1`;
  const pushRequest: PushRequest = {};

  // Build nested structure: root -> level1 -> level2 -> level3
  const rootNodeId = `root-node`;

  // Generate nested levels
  for (let level = 1; level <= NESTED_CONFIG.levels; level++) {
    const currentLevelNodes: string[] = [];

    // Create nodes for current level
    for (let i = 0; i < NESTED_CONFIG.nodesPerLevel; i++) {
      const nodeId = `level${level}-node-${i}`;
      currentLevelNodes.push(nodeId);
    }

    // Connect previous level to current level
    if (level === 1) {
      // Connect root to level 1
      currentLevelNodes.forEach((nodeId, index) => {
        pushRequest.write(
          [rootNodeId, rel, nodeId, `${Prefixes.EDGE_PROPERTY}weight`],
          index
        );
      });
    } else {
      // Connect previous level nodes to current level
      const prevLevel = level - 1;
      for (
        let prevIndex = 0;
        prevIndex < NESTED_CONFIG.nodesPerLevel;
        prevIndex++
      ) {
        const prevNodeId = `level${prevLevel}-node-${prevIndex}`;
        currentLevelNodes.forEach((nodeId, index) => {
          pushRequest.write(
            [prevNodeId, rel, nodeId, `${Prefixes.EDGE_PROPERTY}weight`],
            index
          );
        });
      }
    }
  }

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
    expect(resPush.status).toBe(200);
    expect(milliseconds).toBeLessThanOrEqual(NESTED_CONFIG.maxMilliseconds);
  });

  describe("Pull operations for nested queries", () => {
    let pullResponse: Response<PullResponse>;

    // Create nested pull request structure with nested relationship paths
    const pullRequest: PullRequest = {};

    // Build nested path array for the deepest level
    let pathArray = [rootNodeId];
    for (let level = 1; level <= NESTED_CONFIG.levels; level++) {
      pathArray.push(rel);
    }
    pathArray.push(`${Prefixes.EDGE_PROPERTY}weight`);

    pullRequest.write(pathArray, true);

    beforeEach(async () => {
      // Pull nested data
      const startTime = performance.now();
      pullResponse = await makeRequest("/pull", "POST", pullRequest);
      const endTime = performance.now();
      milliseconds = endTime - startTime;
    });

    test(`POST /pull - nested query performance < ${NESTED_CONFIG.maxMilliseconds}ms`, () => {
      expect(pullResponse.status).toBe(200);
      expect(milliseconds).toBeLessThanOrEqual(NESTED_CONFIG.maxMilliseconds);
    });

    test("POST /pull - verify nested structure data", async () => {
      const response = await makeRequest<PullResponse>(
        "/pull",
        "POST",
        pullRequest
      );

      // Verify root node has nested relationship structure
      expect(response.data[rootNodeId][rel]).toBeDefined();
      const rootConnections = Object.keys(response.data[rootNodeId][rel]);
      expect(rootConnections).toHaveLength(NESTED_CONFIG.nodesPerLevel);

      // Navigate through nested levels to verify structure
      let currentLevel = response.data[rootNodeId][rel];

      for (let level = 1; level <= NESTED_CONFIG.levels; level++) {
        // Each level should have the expected number of nodes
        const nodeKeys = Object.keys(currentLevel);
        expect(nodeKeys).toHaveLength(NESTED_CONFIG.nodesPerLevel);

        // Check if this is not the last level
        if (level < NESTED_CONFIG.levels) {
          // Pick first node to navigate deeper
          const firstNodeId = nodeKeys[0];
          expect(currentLevel[firstNodeId][rel]).toBeDefined();
          currentLevel = currentLevel[firstNodeId][rel];
        } else {
          // Last level should have edge properties
          const firstNodeId = nodeKeys[0];
          expect(
            currentLevel[firstNodeId][`${Prefixes.EDGE_PROPERTY}weight`]
          ).toBeDefined();
        }
      }
    });
  });
});
