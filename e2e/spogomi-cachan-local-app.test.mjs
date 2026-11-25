import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";
import {
  classifyLocalAppHttpStatus,
  classifyLocalAppRuntimeOutput,
  classifyLocalAppStartupOutput,
  classifyLocalAppTransportFailure,
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

test("Cachan integration entry point resolves its local server helpers", async () => {
  await import("./spogomi-cachan-integration.mjs");
});

test("local app startup diagnostics classify compile and backend failures without exposing output", () => {
  const compileFailure = classifyLocalAppStartupOutput("Module not found: secret-path/private-module");
  const backendFailure = classifyLocalAppStartupOutput("TypeError: fetch failed ECONNREFUSED 127.0.0.1:54321");
  const proxySocketFailure = classifyLocalAppStartupOutput("Failed to proxy http://localhost:3010/spogomi Error: socket hang up { code: 'ECONNRESET' }");
  const envFailure = classifyLocalAppStartupOutput("Missing required environment variable SUPABASE_SERVICE_ROLE_KEY=secret");

  assert.equal(compileFailure.code, "APP_COMPILE_ERROR");
  assert.equal(JSON.stringify(compileFailure).includes("private-module"), false);
  assert.equal(backendFailure.code, "APP_BACKEND_CONNECTION");
  assert.equal(JSON.stringify(backendFailure).includes("54321"), false);
  assert.equal(proxySocketFailure.code, "APP_PROXY_SOCKET_ERROR");
  assert.equal(JSON.stringify(proxySocketFailure).includes("3010"), false);
  assert.equal(envFailure.code, "APP_ENV_CONFIG_ERROR");
  assert.equal(JSON.stringify(envFailure).includes("SUPABASE_SERVICE_ROLE_KEY"), false);
});

test("HTTP diagnostics distinguish authentication, authorization, validation and server failures", () => {
  assert.equal(classifyLocalAppHttpStatus(200), null);
  assert.equal(classifyLocalAppHttpStatus(201), null);
  assert.deepEqual(classifyLocalAppHttpStatus(401), {
    code: "HTTP_AUTHN_ERROR",
    message: "The request was not authenticated.",
  });
  assert.deepEqual(classifyLocalAppHttpStatus(403), {
    code: "HTTP_AUTHZ_ERROR",
    message: "The request was not authorized.",
  });
  assert.deepEqual(classifyLocalAppHttpStatus(422), {
    code: "HTTP_VALIDATION_ERROR",
    message: "The request failed input validation.",
  });
  assert.deepEqual(classifyLocalAppHttpStatus(500), {
    code: "HTTP_SERVER_ERROR",
    message: "The server returned an error; response details are suppressed.",
  });
  assert.equal(JSON.stringify(classifyLocalAppHttpStatus(500)).includes("private"), false);
  assert.equal(classifyLocalAppTransportFailure().code, "HTTP_TRANSPORT_ERROR");
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

test("local app readiness accepts redirects and client responses from the live server", async () => {
  await assert.doesNotReject(waitForLocalApp("http://127.0.0.1:3010", {
    timeoutMs: 100,
    fetchImpl: async () => new Response(null, { status: 307 }),
  }));
});

test("local app readiness retries a 5xx until the app serves a non-server response", async () => {
  let calls = 0;
  await assert.doesNotReject(waitForLocalApp("http://127.0.0.1:3010", {
    timeoutMs: 100,
    pollIntervalMs: 1,
    fetchImpl: async () => new Response(null, { status: ++calls === 1 ? 503 : 200 }),
  }));
  assert.equal(calls, 2);
});

test("local app readiness does not treat an HTTP 503 as ready", async () => {
  await assert.rejects(waitForLocalApp("http://127.0.0.1:3010", {
    timeoutMs: 5,
    pollIntervalMs: 1,
    fetchImpl: async () => new Response(null, { status: 503 }),
  }), /APP_READINESS_HTTP_ERROR HTTP 503/);
});

test("local app readiness classifies transport failures without exposing their details", async () => {
  await assert.rejects(waitForLocalApp("http://127.0.0.1:3010", {
    timeoutMs: 5,
    pollIntervalMs: 1,
    fetchImpl: async () => { throw new Error("private token transport detail"); },
  }), (error) => {
    assert.match(error.message, /APP_TRANSPORT_UNAVAILABLE/);
    assert.equal(error.message.includes("private token"), false);
    return true;
  });
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

test("local app runtime diagnostics classify PostgREST, SQLSTATE, and API handler errors without exposing raw details", () => {
  const pgrst = classifyLocalAppRuntimeOutput("[API Error] ERR-123 in spogomi.event.create: { code: 'PGRST204', secret: 'sk_test_secret' }");
  assert.equal(pgrst?.code, "APP_PGRST_PGRST204");
  assert.equal(pgrst?.message.includes("sk_test_secret"), false);

  const sql = classifyLocalAppRuntimeOutput("[API Error] ERR-456 in spogomi.event.create: { code: '42703', message: 'private detail' }");
  assert.equal(sql?.code, "APP_SQLSTATE_42703");
  assert.equal(sql?.message.includes("private detail"), false);

  const apiHandler = classifyLocalAppRuntimeOutput("[API Error] ERR-789 in spogomi.event.create: { message: 'secret detail' }");
  assert.equal(apiHandler?.code, "APP_API_ERROR_SPOGOMI_EVENT_CREATE");
  assert.equal(apiHandler?.message.includes("secret detail"), false);
});
