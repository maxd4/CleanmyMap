import assert from "node:assert/strict";
import test from "node:test";
import {
  assertClerkDevelopmentEnvironment,
  buildE2EPublicMetadata,
  buildTemporaryEmail,
  buildTemporaryRunId,
  CLERK_LIFECYCLE,
} from "./clerk-lifecycle.mjs";

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

test("E2E provisioning preserves existing trusted role metadata while stamping the lifecycle", () => {
  assert.deepEqual(
    buildE2EPublicMetadata({ role: "admin", cleanmymapE2E: false }, CLERK_LIFECYCLE.PERSISTENT_DEVELOPMENT),
    { role: "admin", cleanmymapE2E: true, cleanmymapLifecycle: "PERSISTENT_DEVELOPMENT" },
  );
});

test("the official harness accepts only an isolated Clerk Development key pair", () => {
  assert.doesNotThrow(() => assertClerkDevelopmentEnvironment({
    CLERK_SECRET_KEY: "sk_test_development",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_development",
  }));
  assert.throws(() => assertClerkDevelopmentEnvironment({
    CLERK_SECRET_KEY: "sk_live_production",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_production",
  }), /Only Clerk Development credentials/);
  assert.throws(() => assertClerkDevelopmentEnvironment({
    CLERK_SECRET_KEY: "sk_test_development",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_production",
  }), /Only Clerk Development credentials/);
});
