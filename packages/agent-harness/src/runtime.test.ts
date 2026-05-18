import { $ } from "bun";
import { afterEach, expect, test } from "bun:test";
import {
  GotRuntimeClient,
  GotRuntimeRequestError,
  buildRuntimeSpawnScript,
  buildRuntimeWorkspaceConfig,
  defaultMemoryNodeId,
  defaultMemoryPullQuery,
  getRuntimePaths,
  getRuntimeStatus,
  loadRuntimeWorkspaceConfig,
  writeRuntimeWorkspaceConfig,
} from "./runtime";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await $`rm -rf ${dir}`;
  }
});

test("GotRuntimeClient checks readiness and exchanges raw got JSON", async () => {
  const calls: Array<{ readonly url: string; readonly method: string; readonly body?: string }> = [];
  const client = new GotRuntimeClient({
    url: "http://127.0.0.1:3199",
    fetch: async (input, init) => {
      calls.push({
        url: String(input),
        method: init?.method ?? "GET",
        body: typeof init?.body === "string" ? init.body : undefined,
      });

      if (String(input).endsWith("/pull")) {
        return Response.json({ memory: true });
      }

      if (String(input).endsWith("/push")) {
        return Response.json({ message: "Data received successfully" });
      }

      return Response.json({ message: "Server running" });
    },
  });

  await expect(client.check()).resolves.toMatchObject({ ok: true, status: 200 });
  await expect(client.pull({ user: true })).resolves.toEqual({ memory: true });
  await expect(client.push({ user: { name: "Ada" } })).resolves.toEqual({
    message: "Data received successfully",
  });

  expect(calls).toEqual([
    { url: "http://127.0.0.1:3199", method: "GET" },
    { url: "http://127.0.0.1:3199/pull", method: "POST", body: '{"user":true}' },
    {
      url: "http://127.0.0.1:3199/push",
      method: "POST",
      body: '{"user":{"name":"Ada"}}',
    },
  ]);
});

test("GotRuntimeClient surfaces non-OK runtime responses", async () => {
  const client = new GotRuntimeClient({
    url: "http://127.0.0.1:3199",
    fetch: async () => Response.json({ error: "bad request" }, { status: 400 }),
  });

  try {
    await client.push({});
    throw new Error("expected push to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(GotRuntimeRequestError);
    expect((error as GotRuntimeRequestError).status).toBe(400);
    expect((error as GotRuntimeRequestError).body).toBe('{"error":"bad request"}');
  }
});

test("runtime config is workspace-local and spawn command uses configured binary", async () => {
  const workspace = `${(Bun.env.TMPDIR ?? "/tmp").replace(/\/+$/, "")}/got-agent-runtime-${crypto.randomUUID()}`;
  await $`mkdir -p ${workspace}`;
  tempDirs.push(workspace);
  const config = await buildRuntimeWorkspaceConfig({
    runtimeUrl: "http://127.0.0.1:3199",
    runtimeCwd: ".got/runtime-data",
    runtimeBin: "/opt/got/bin/db-runtime",
    persistent: true,
  });

  await writeRuntimeWorkspaceConfig(workspace, config);
  const loaded = await loadRuntimeWorkspaceConfig(workspace);
  const paths = getRuntimePaths(workspace, loaded);
  const script = buildRuntimeSpawnScript(loaded, workspace);

  expect(loaded).toMatchObject({
    url: "http://127.0.0.1:3199",
    port: "3199",
    cwd: ".got/runtime-data",
    bin: "/opt/got/bin/db-runtime",
    persistent: true,
  });
  expect(paths.cwd).toBe(`${workspace}/.got/runtime-data`);
  expect(paths.pidFile).toBe(`${workspace}/.got/runtime.pid`);
  expect(paths.logFile).toBe(`${workspace}/.got/runtime.log`);
  expect(script).toContain(`cd ${workspace}/.got/runtime-data`);
  expect(script).toContain("GOT_PORT=3199 /opt/got/bin/db-runtime --port 3199 --persistent");
  expect(script).toContain(`>> ${workspace}/.got/runtime.log 2>&1`);
});

test("default memory pull query targets the stable memory anchor", () => {
  expect(defaultMemoryNodeId).toBe("got-memory");
  expect(defaultMemoryPullQuery).toEqual({
    "got-memory": {
      user_preferences: true,
      workspace_context: true,
      active_goal: true,
      current_state: true,
      recent_decisions: true,
      open_questions: true,
      procedures: true,
      summaries: true,
      last_updated: true,
    },
  });
});

test("runtime status clears stale managed pid metadata", async () => {
  const workspace = `${(Bun.env.TMPDIR ?? "/tmp").replace(/\/+$/, "")}/got-agent-runtime-${crypto.randomUUID()}`;
  await $`mkdir -p ${workspace}/.got`;
  tempDirs.push(workspace);

  const config = await buildRuntimeWorkspaceConfig({
    runtimeUrl: "http://127.0.0.1:1",
    runtimeBin: "/opt/got/bin/db-runtime",
  });
  await writeRuntimeWorkspaceConfig(workspace, config);

  const paths = getRuntimePaths(workspace, config);
  await Bun.write(paths.pidFile, "999999\n");
  await Bun.write(paths.stateFile, "{}\n");

  const status = await getRuntimeStatus(workspace);

  expect(status.managed).toBe(false);
  expect(status.pid).toBeUndefined();
  expect(status.pidRunning).toBe(false);
  expect(await Bun.file(paths.pidFile).exists()).toBe(false);
  expect(await Bun.file(paths.stateFile).exists()).toBe(false);
});
