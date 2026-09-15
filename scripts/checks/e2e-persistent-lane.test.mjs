import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  assertClerkDevelopmentSecrets,
  CLERK_DEV_BACKEND_ENV,
  CLERK_DEV_PUBLISHABLE_ENV,
} from "../../e2e/run-github-actions-persistent.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");

test("persistent E2E workflow is hosted, ephemeral, and never targets production Supabase", () => {
  const workflow = read(".github/workflows/e2e-supabase.yml");
  assert.match(workflow, /runs-on:\s+ubuntu-latest/);
  assert.match(workflow, /supabase start/);
  assert.match(workflow, /supabase db reset/);
  assert.match(workflow, /supabase stop/);
  assert.match(workflow, /apps\/web\/supabase\/migrations/);
  assert.match(workflow, /apps\/web\/supabase\/seed\.sql/);
  assert.doesNotMatch(workflow, /mgvmuambbxmmkrjjlryo\.supabase\.co/);
  assert.doesNotMatch(workflow, /https:\/\/[^\s]+\.supabase\.co/);
  assert.doesNotMatch(workflow, /CLERK_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(workflow, /(?:set -x|printenv|export\s+[^\n]*(?:TOKEN|KEY))/i);
});

test("local persistent runners do not invoke Docker or the Supabase local lifecycle", () => {
  for (const relativePath of ["e2e/run-local-authenticated.mjs", "e2e/run-campaign-2-local.mjs"]) {
    const source = read(relativePath);
    assert.doesNotMatch(source, /docker/i);
    assert.doesNotMatch(source, /supabase\s+(?:start|status|stop|db\s+reset)/i);
  }
});

test("missing or production Clerk credentials fail closed without logging values", () => {
  assert.throws(() => assertClerkDevelopmentSecrets({}), /Missing required Clerk Development credentials/);
  assert.throws(
    () => assertClerkDevelopmentSecrets({
      [CLERK_DEV_BACKEND_ENV]: "sk_live_invalid",
      [CLERK_DEV_PUBLISHABLE_ENV]: "pk_test_invalid",
    }),
    /Only Clerk Development credentials/,
  );
  assert.doesNotThrow(() => assertClerkDevelopmentSecrets({
    [CLERK_DEV_BACKEND_ENV]: `sk_test_${"x".repeat(24)}`,
    [CLERK_DEV_PUBLISHABLE_ENV]: `pk_test_${"x".repeat(24)}`,
  }));

  const helper = read("e2e/run-github-actions-persistent.mjs");
  assert.doesNotMatch(helper, /console\.(?:log|error)\([^\n]*(?:TOKEN|KEY|credential)/i);
});

test("global teardown retains cleanup of temporary Clerk state", () => {
  const teardown = read("e2e/global.teardown.ts");
  assert.match(teardown, /users\.deleteUser/);
  assert.match(teardown, /unlink\(managedUserFile\)/);
  assert.match(teardown, /unlink\(authFile\)/);
});
