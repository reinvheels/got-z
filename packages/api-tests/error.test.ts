import { test, expect } from "bun:test";

// Dummy server setup
const TEST_PORT = 3001;
const SERVER_URL = `http://localhost:${TEST_PORT}`;

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
