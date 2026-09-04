import assert from "node:assert/strict";
import test from "node:test";
import { getVercelEnvSyncArgs } from "./backend-bootstrap.mjs";

test("backend bootstrap syncs .env.local to development only", () => {
  assert.deepEqual(getVercelEnvSyncArgs(), [
    "scripts/vercel-sync-env.mjs",
    "--file=.env.local",
    "--environments=development",
  ]);
});
