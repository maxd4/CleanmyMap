import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertLocalSupabaseUrl,
  resolveDestination,
} from "../../e2e/spogomi-concurrency.mjs";

const serviceRoleKey = "synthetic-service-role-key";

test("rejects a remote destination supplied through environment variables", () => {
  assert.throws(
    () => resolveDestination({
      SUPABASE_URL: "https://remote-project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    }, () => {
      throw new Error("local fallback must not be consulted");
    }),
    /non-local database/,
  );
});

test("rejects a remote final destination returned by local status", () => {
  assert.throws(
    () => resolveDestination({}, () => ({
      url: "https://remote-project.supabase.co",
      key: serviceRoleKey,
    })),
    /non-local database/,
  );
});

test("rejects a partial configured destination before client creation", () => {
  assert.throws(
    () => resolveDestination({ SUPABASE_URL: "http://127.0.0.1:54321" }, () => {
      throw new Error("local fallback must not be consulted");
    }),
    /must be provided together/,
  );
});

test("accepts only a loopback configured destination", () => {
  assert.deepEqual(
    resolveDestination({
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    }),
    { url: "http://127.0.0.1:54321", key: serviceRoleKey },
  );
  assert.equal(assertLocalSupabaseUrl("http://localhost:54321"), "http://localhost:54321");
});
