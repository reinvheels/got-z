import {
  test,
  expect,
  beforeAll,
  afterAll,
} from "bun:test";

// Dummy server setup
let server: any;
const TEST_PORT = 3001;
const SERVER_URL = `http://localhost:${TEST_PORT}`;

// Create dummy HTTP server
beforeAll(async () => {
  server = Bun.serve({
    port: TEST_PORT,
    fetch() {
      return new Response(
        JSON.stringify({}),
        {
          headers: { "Content-Type": "application/json" },
          status: 500,
        }
      );
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