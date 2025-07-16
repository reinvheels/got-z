import {
  test,
  expect,
  beforeAll,
  afterAll,
  describe,
  beforeEach,
} from "bun:test";
import {
  Rights,
  EdgeDirection,
  Prefixes,
  PushRequest,
  PullRequest,
  PushResponse,
} from "@got-z/api-spec";

// Dummy server setup
let server: any;
const TEST_PORT = 3001;
const SERVER_URL = `http://localhost:${TEST_PORT}`;

// Mock responses for testing
const mockPushResponse = {
  status: 200,
  name: "push",
  message: "Nodes pushed successfully",
};

const mockPullResponse = {
  "node-1": {
    property1: "value1",
    property2: "value2",
  },
  "node-2": {
    property1: "value1",
  },
};

// Create dummy HTTP server
beforeAll(async () => {
  server = Bun.serve({
    port: TEST_PORT,
    fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/push" && req.method === "POST") {
        // Check if request body is valid JSON
        const contentType = req.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          return new Response(
            JSON.stringify({ error: "Invalid content type" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        return new Response(JSON.stringify(mockPushResponse), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname === "/pull" && req.method === "POST") {
        // Check if request body is valid JSON
        const contentType = req.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          return new Response(
            JSON.stringify({ error: "Invalid content type" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        return new Response(JSON.stringify(mockPullResponse), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // Handle invalid methods for valid endpoints
      if (url.pathname === "/push" || url.pathname === "/pull") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Default response for server availability check
      return new Response(JSON.stringify({ message: "Server running" }), {
        headers: { "Content-Type": "application/json" },
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

// Basic push endpoint tests
describe("Basic node operations", () => {
  let resPush: Response<PushResponse>;
  beforeEach(async () => {
    const pushRequest: PushRequest = {
      "node-1": {
        property1: "value1",
        property2: "value2",
      },
      "node-2": {
        property1: "value1",
        property2: "value2",
      },
    };
    resPush = await makeRequest("/push", "POST", pushRequest);
  });

  test("POST /push - basic node creation", () => {
    expect(resPush.status).toBe(200);
    expect(resPush.data).toEqual(mockPushResponse);
  });

  test("POST /pull - query subset of created nodes", async () => {
    const pullRequest: PullRequest = {
      "node-1": {
        property1: true,
      },
      "node-2": {
        property2: true,
      },
    };

    const response = await makeRequest("/pull", "POST", pullRequest);

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      "node-1": {
        property1: "value1",
      },
      "node-2": {
        property2: "value2",
      },
    });
  });
});

describe("Node operations with edges", () => {
  let resPush: Response<PushResponse>;
  beforeEach(async () => {
    const pushRequest: PushRequest = {
      "node-1": {
        property1: "value1",
        [`${EdgeDirection.OUTGOING}relationship1`]: {
          "node-2": {
            [`${Prefixes.EDGE_PROPERTY}property1`]: "value1",
            [`${Prefixes.EDGE_PROPERTY}order`]: 1,
          },
        },
      },
    };
    resPush = await makeRequest("/push", "POST", pushRequest);
  });

  test("POST /push - nodes with edges", () => {
    expect(resPush.status).toBe(200);
    expect(resPush.data).toEqual(mockPushResponse);
  });

  test("POST /pull - query edges and connected nodes", async () => {
    const pullRequest: PullRequest = {
      "node-1": {
        property1: true,
        [`${EdgeDirection.OUTGOING}relationship1`]: {
          "node-2": {
            [`${Prefixes.EDGE_PROPERTY}order`]: true,
          },
        },
      },
    };

    const response = await makeRequest("/pull", "POST", pullRequest);

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      "node-1": {
        property1: "value1",
        [`${EdgeDirection.OUTGOING}relationship1`]: {
          "node-2": {
            [`${Prefixes.EDGE_PROPERTY}order`]: 1,
          },
        },
      },
    });
  });
});

describe("Node operations with rights", () => {
  let resPush: Response<PushResponse>;
  beforeEach(async () => {
    const pushRequest: PushRequest = {
      "node-1": {
        [`${Prefixes.RIGHTS}user123`]: Rights.READ + Rights.WRITE,
        [`${Prefixes.RIGHTS}admin`]: Rights.ADMIN,
      },
    };
    resPush = await makeRequest("/push", "POST", pushRequest);
  });

  test("POST /push - nodes with rights", () => {
    expect(resPush.status).toBe(200);
    expect(resPush.data).toEqual(mockPushResponse);
  });

  test("POST /pull - query nodes with rights", async () => {
    const pullRequest: PullRequest = {
      "node-1": {
        [`${Prefixes.RIGHTS}user123`]: true,
        [`${Prefixes.RIGHTS}admin`]: true,
      },
    };

    const response = await makeRequest("/pull", "POST", pullRequest);

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      "node-1": {
        [`${Prefixes.RIGHTS}user123`]: Rights.READ + Rights.WRITE,
        [`${Prefixes.RIGHTS}admin`]: Rights.ADMIN,
      },
    });
  });
});

test("POST /push - actor nodes", async () => {
  const pushRequest: PushRequest = {
    [`${Prefixes.RIGHTS}user123`]: {
      name: "John Doe",
      email: "john.doe@example.com",
    },
    [`${Prefixes.RIGHTS}group456`]: {
      name: "Admins",
      [`${Prefixes.RIGHTS}user123`]: Rights.BE,
    },
  };

  const response = await makeRequest("/push", "POST", pushRequest);

  expect(response.status).toBe(200);
  expect(response.data).toBeDefined();
});

// Basic pull endpoint tests
test("POST /pull - basic property query", async () => {
  const pullRequest: PullRequest = {
    "node-1": {
      property2: true,
    },
    "node-2": {
      property1: true,
    },
  };

  const response = await makeRequest("/pull", "POST", pullRequest);

  expect(response.status).toBe(200);
  expect(response.data).toBeDefined();
});

test("POST /pull - nested properties query", async () => {
  const pullRequest: PullRequest = {
    "node-1": {
      property1: {
        subproperty1: true,
        subproperty2: true,
      },
      property2: true,
    },
  };

  const response = await makeRequest("/pull", "POST", pullRequest);

  expect(response.status).toBe(200);
  expect(response.data).toBeDefined();
});

test("POST /pull - edges query", async () => {
  const pullRequest: PullRequest = {
    "node-1": {
      [`${EdgeDirection.OUTGOING}relationship1`]: true,
    },
    "node-2": {
      [`${EdgeDirection.INCOMING}relationship2`]: {
        id: true,
        nodeProperty1: true,
        [`${Prefixes.EDGE_PROPERTY}edgeProperty1`]: true,
        [`${Prefixes.EDGE_PROPERTY}order`]: true,
      },
    },
  };

  const response = await makeRequest("/pull", "POST", pullRequest);

  expect(response.status).toBe(200);
  expect(response.data).toBeDefined();
});

test("POST /pull - rights query", async () => {
  const pullRequest: PullRequest = {
    "node-1": {
      property1: true,
      [`${Prefixes.RIGHTS}`]: {
        name: true,
      },
    },
    "node-2": {
      property1: true,
      [`${Prefixes.RIGHTS}user123`]: true,
      [`${Prefixes.RIGHTS}group456`]: true,
    },
  };

  const response = await makeRequest("/pull", "POST", pullRequest);

  expect(response.status).toBe(200);
  expect(response.data).toBeDefined();
});

test("POST /pull - actor nodes query", async () => {
  const pullRequest: PullRequest = {
    [`${Prefixes.RIGHTS}user123`]: {
      name: true,
      email: true,
    },
    [`${Prefixes.RIGHTS}group456`]: {
      name: true,
      [`${Prefixes.RIGHTS}user123`]: true,
    },
  };

  const response = await makeRequest("/pull", "POST", pullRequest);

  expect(response.status).toBe(200);
  expect(response.data).toBeDefined();
});

// Error handling tests
test("POST /push - invalid content type", async () => {
  const response = await fetch(`${SERVER_URL}/push`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
    },
    body: "invalid data",
  });

  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.error).toBeDefined();
});

test("POST /pull - invalid content type", async () => {
  const response = await fetch(`${SERVER_URL}/pull`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
    },
    body: "invalid data",
  });

  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.error).toBeDefined();
});

test("GET /push - method not allowed", async () => {
  const response = await fetch(`${SERVER_URL}/push`, {
    method: "GET",
  });

  expect(response.status).toBe(405);
  const data = await response.json();
  expect(data.error).toBe("Method not allowed");
});

test("GET /pull - method not allowed", async () => {
  const response = await fetch(`${SERVER_URL}/pull`, {
    method: "GET",
  });

  expect(response.status).toBe(405);
  const data = await response.json();
  expect(data.error).toBe("Method not allowed");
});

// Server availability test
test("server is running", async () => {
  const response = await fetch(SERVER_URL);
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.message).toBe("Server running");
});
