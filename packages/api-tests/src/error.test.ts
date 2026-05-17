import { test, expect, beforeAll, afterAll } from "bun:test";
import {
  cleanupRuntimeHarness,
  createRuntimeHarness,
  type RuntimeHarness,
} from "./runtime-harness";

let harness: RuntimeHarness | undefined;
let serverUrl: string;

beforeAll(async () => {
  harness = await createRuntimeHarness("got-z-error");
  serverUrl = harness.url;
});

afterAll(async () => {
  if (harness) await cleanupRuntimeHarness(harness);
});

// Error handling tests
test("POST /push - invalid content type", async () => {
  const response = await fetch(`${serverUrl}/push`, {
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
  const response = await fetch(`${serverUrl}/pull`, {
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
  const response = await fetch(`${serverUrl}/push`, {
    method: "GET",
  });

  expect(response.status).toBe(405);
  const data = await response.json();
  expect(data.error).toBe("Method not allowed");
});

test("GET /pull - method not allowed", async () => {
  const response = await fetch(`${serverUrl}/pull`, {
    method: "GET",
  });

  expect(response.status).toBe(405);
  const data = await response.json();
  expect(data.error).toBe("Method not allowed");
});

// Server availability test
test("server is running", async () => {
  const response = await fetch(serverUrl);
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.message).toBe("Server running");
});
