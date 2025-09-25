import { test, expect, describe, beforeEach } from "bun:test";
import {
  Rights,
  EdgeDirection,
  Prefixes,
  PushRequest,
  PullRequest,
  PushResponse,
} from "@got-z/api-spec";
import { delay, getPermutations } from "@got-z/util";

// Dummy server setup
const TEST_PORT = 3001;
const SERVER_URL = `http://localhost:${TEST_PORT}`;

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
        [`${EdgeDirection.OUT}relationship1`]: {
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
  });

  test("POST /pull - query edges and connected nodes", async () => {
    const pullRequest: PullRequest = {
      "node-1": {
        property1: true,
        [`${EdgeDirection.OUT}relationship1`]: {
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
        [`${EdgeDirection.OUT}relationship1`]: {
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

describe("Actor node operations", () => {
  let resPush: Response<PushResponse>;
  beforeEach(async () => {
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
    resPush = await makeRequest("/push", "POST", pushRequest);
  });

  test("POST /push - actor nodes", () => {
    expect(resPush.status).toBe(200);
  });

  test("POST /pull - query actor nodes", async () => {
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
    expect(response.data).toEqual({
      [`${Prefixes.RIGHTS}user123`]: {
        name: "John Doe",
        email: "john.doe@example.com",
      },
      [`${Prefixes.RIGHTS}group456`]: {
        name: "Admins",
        [`${Prefixes.RIGHTS}user123`]: Rights.BE,
      },
    });
  });
});

describe("Nested edge operations", () => {
  const NESTED_CONFIG = {
    levels: 3,
    nodesPerLevel: 2,
  };

  let resPush: Response<PushResponse>;
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

  beforeEach(async () => {
    resPush = await makeRequest("/push", "POST", pushRequest);
  });

  test("POST /push - nested structure with multiple levels", () => {
    expect(resPush.status).toBe(200);
  });

  test("POST /pull - query nested edges and connected nodes", async () => {
    const pullRequest: PullRequest = {};
    const rel = `${EdgeDirection.OUT}relationship1`;
    pullRequest.write(
      ["root-node", ...Array(NESTED_CONFIG.levels).fill(rel), "prop1"],
      true
    );

    const response = await makeRequest("/pull", "POST", pullRequest);

    expect(response.data).toEqual(pushRequest);
  });
});
