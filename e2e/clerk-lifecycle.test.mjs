import assert from "node:assert/strict";
import test from "node:test";
import { buildTemporaryEmail, buildTemporaryRunId } from "./clerk-lifecycle.mjs";

test("buildTemporaryRunId uses the provided timestamp and entropy without weakening the format", () => {
  const runId = buildTemporaryRunId({ now: 0, entropy: "secure-test-entropy" });

  assert.equal(runId, "0-secure-test-entropy");
  assert.match(buildTemporaryEmail(runId), /^cmm-e2e-[0-9a-z-]+\+clerk_test@example\.com$/i);
});

test("buildTemporaryRunId generates distinct UUID-backed temporary identities by default", () => {
  const first = buildTemporaryRunId();
  const second = buildTemporaryRunId();

  assert.notEqual(first, second);
  assert.match(first, /^[0-9a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.match(second, /^[0-9a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});
