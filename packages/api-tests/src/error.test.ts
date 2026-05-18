import { test, expect, beforeAll, afterAll } from "bun:test";
import {
  cleanupRuntimeHarness,
  createRuntimeHarness,
  type RuntimeHarness,
} from "./runtime-harness";

let harness: RuntimeHarness | undefined;
let serverUrl: string;

beforeAll(async () => {
  harness = await createRuntimeHarness("got-error");
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

test("POST /push - invalid JSON", async () => {
  const response = await postRaw("/push", "{");

  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.message).toBe("Invalid JSON");
});

test("POST /pull - invalid JSON", async () => {
  const response = await postRaw("/pull", "{");

  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.message).toBe("Invalid JSON");
});

test("POST /push - non-object request body", async () => {
  const response = await postRaw("/push", "[]");

  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.message).toBe("Request body must be a JSON object");
});

test("POST /pull - non-object request body", async () => {
  const response = await postRaw("/pull", "[]");

  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.message).toBe("Request body must be a JSON object");
});

test("POST /push - oversized body", async () => {
  const body = JSON.stringify({ value: "x".repeat(10 * 1024 * 1024) });
  const response = await postRaw("/push", body);

  expect(response.status).toBe(413);
  const data = await response.json();
  expect(data.message).toBe("Body too large");
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

function postRaw(endpoint: "/push" | "/pull", body: string): Promise<Response> {
  return fetch(`${serverUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });
}
