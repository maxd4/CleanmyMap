import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";
import {
  classifyLocalAppStartupOutput,
  stopLocalApp,
  waitForLocalApp,
} from "./spogomi-cachan-local-app.mjs";

test("local app startup diagnostics identify Clerk boot failures without exposing key values", () => {
  const diagnostic = classifyLocalAppStartupOutput(
    "Invalid local Clerk configuration pk_test_private sk_test_private",
  );

  assert.deepEqual(diagnostic, {
    code: "CLERK_BOOT_CONFIG",
    message: "Local Clerk Development configuration was rejected; secret values are suppressed.",
  });
  assert.equal(JSON.stringify(diagnostic).includes("private"), false);
});

test("local app readiness fails immediately when its process exits", async () => {
  await assert.rejects(
    waitForLocalApp("http://127.0.0.1:3010", {
      server: { exitCode: 1 },
      getStartupOutput: () => "Invalid local Clerk configuration sk_test_private",
    }),
    (error) => {
      assert.match(error.message, /CLERK_BOOT_CONFIG/);
      assert.equal(error.message.includes("sk_test_private"), false);
      return true;
    },
  );
});

test("local app readiness accepts redirects and non-server responses", async () => {
  await assert.doesNotReject(waitForLocalApp("http://127.0.0.1:3010", {
    timeoutMs: 100,
    fetchImpl: async () => new Response(null, { status: 307 }),
  }));
});

test("local app readiness treats an HTTP 5xx as server liveness", async () => {
  await assert.doesNotReject(waitForLocalApp("http://127.0.0.1:3010", {
    timeoutMs: 100,
    fetchImpl: async () => new Response(null, { status: 503 }),
  }));
});

test("local app teardown terminates the spawned process group", async () => {
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    detached: process.platform !== "win32",
    stdio: "ignore",
  });
  await new Promise((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
  const closed = once(child, "close");

  await stopLocalApp(child, { gracePeriodMs: 250 });
  await closed;

  assert.ok(child.exitCode !== null || child.signalCode !== null);
});
