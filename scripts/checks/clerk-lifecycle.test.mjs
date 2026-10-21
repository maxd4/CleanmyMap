import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  assertClerkDevelopmentEnvironment,
  CLERK_LIFECYCLE,
  createTemporaryMetadata,
  isOwnedTemporaryUser,
  parseManagedUserMetadata,
  resolveClerkLifecycle,
} from "../../e2e/clerk-lifecycle.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");

test("configured Clerk email selects reusable Development lifecycle", () => {
  assert.equal(resolveClerkLifecycle({}), CLERK_LIFECYCLE.TEMPORARY);
  assert.equal(
    resolveClerkLifecycle({ configuredEmail: "dedicated@example.com" }),
    CLERK_LIFECYCLE.PERSISTENT_DEVELOPMENT,
  );
  assert.throws(
    () => resolveClerkLifecycle({ requestedLifecycle: CLERK_LIFECYCLE.PERSISTENT_DEVELOPMENT }),
    /requires the existing E2E_CLERK_USER_EMAIL/,
  );
  assert.throws(() => resolveClerkLifecycle({ requestedLifecycle: "PRODUCTION" }), /must be TEMPORARY/);
});

test("only a run-owned temporary Clerk user can be deleted", () => {
  const metadata = createTemporaryMetadata({ userId: "user_temporary", runId: "run-1" });
  const ownedUser = {
    id: "user_temporary",
    emailAddresses: [{ emailAddress: "cmm-e2e-run-1+clerk_test@example.com" }],
    publicMetadata: { cleanmymapE2E: true, cleanmymapOwner: "cleanmymap-playwright", cleanmymapLifecycle: CLERK_LIFECYCLE.TEMPORARY },
  };
  assert.equal(isOwnedTemporaryUser(metadata, ownedUser), true);
  assert.equal(
    isOwnedTemporaryUser(metadata, {
      ...ownedUser,
      emailAddresses: [{ emailAddress: "person@example.com" }],
    }),
    false,
  );
  assert.equal(
    isOwnedTemporaryUser(metadata, {
      ...ownedUser,
      publicMetadata: { cleanmymapE2E: true, cleanmymapLifecycle: CLERK_LIFECYCLE.PERSISTENT_DEVELOPMENT },
    }),
    false,
  );
  assert.equal(parseManagedUserMetadata(JSON.stringify({ userId: "user_temporary" })), null);
});

test("official harness refuses Production credentials without logging values", () => {
  assert.throws(
    () => assertClerkDevelopmentEnvironment({ CLERK_SECRET_KEY: "sk_live_invalid", NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_invalid" }),
    /Only Clerk Development credentials/,
  );
  assert.doesNotThrow(() => assertClerkDevelopmentEnvironment({
    CLERK_SECRET_KEY: `sk_test_${"x".repeat(24)}`,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_test_${"x".repeat(24)}`,
  }));
});

test("setup and teardown keep persistent accounts outside deletion paths", () => {
  const setup = read("e2e/global.setup.ts");
  const teardown = read("e2e/global.teardown.ts");
  assert.match(setup, /resolveClerkLifecycle/);
  assert.match(setup, /cleanmymapLifecycle: lifecycle/);
  assert.match(setup, /isOwnedTemporaryUser/);
  assert.match(teardown, /isOwnedTemporaryUser/);
  assert.doesNotMatch(teardown, /users\.deleteUser\(.*E2E_CLERK_USER/);
  assert.doesNotMatch(`${setup}\n${teardown}`, /console\.(?:log|error)\([^\n]*(?:SECRET|TOKEN|KEY|cookie|storageState)/i);
});
