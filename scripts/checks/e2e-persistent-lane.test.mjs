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
  assert.match(workflow, /supabase start --workdir apps\/web --yes/);
  assert.match(workflow, /supabase db reset --local --workdir apps\/web --yes/);
  assert.doesNotMatch(workflow, /--workdir apps\/web\/supabase/);
  const supabaseCliInvocations = workflow
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("./node_modules/.bin/supabase"));
  assert.ok(supabaseCliInvocations.length > 0, "workflow must invoke the Supabase CLI");
  for (const invocation of supabaseCliInvocations) {
    assert.match(
      invocation,
      /--workdir apps\/web\b/,
      `Supabase CLI invocation must use the apps/web project workdir: ${invocation}`,
    );
  }
  assert.match(workflow, /Preflight canonical ephemeral PostgreSQL schema/);
  assert.match(workflow, /project_id\s*=\s*\\"web\\"/);
  assert.match(workflow, /to_regclass\('public\.actions'\)/);
  assert.match(workflow, /to_regclass\('public\.spogomi_events'\)/);
  assert.match(workflow, /supabase_migrations\.schema_migrations/);
  assert.match(workflow, /6d7f6c3d-7d66-4c95-9e5a-5d2d9efb0b71/);
  assert.match(workflow, /E2E_FIXTURE:group-join:v1/);
  assert.match(workflow, /Synchronize PostgREST schema after PostgreSQL proof/);
  assert.match(workflow, /notify pgrst, ['"]reload schema/);
  assert.equal((workflow.match(/notify pgrst, ['"]reload schema/g) ?? []).length, 1, "PostgREST synchronization must be single-shot");
  assert.doesNotMatch(workflow, /docker restart/);
  assert.doesNotMatch(workflow, /docker kill --signal=USR1/);
  assert.doesNotMatch(workflow, /reload_attempt/);
  assert.doesNotMatch(workflow, /seq 1 5/);
  assert.match(workflow, /supabase stop/);
  assert.match(workflow, /id: start_supabase/);
  assert.match(workflow, /No ephemeral Supabase containers exist; skipping stop/);
  assert.doesNotMatch(workflow, /Require Clerk Development credentials/);
  assert.doesNotMatch(workflow, /run-github-actions-persistent\.mjs require-clerk/);
  assert.match(workflow, /apps\/web\/supabase\/migrations/);
  assert.match(workflow, /apps\/web\/supabase\/seed\.sql/);
  assert.doesNotMatch(workflow, /mgvmuambbxmmkrjjlryo\.supabase\.co/);
  assert.doesNotMatch(workflow, /https:\/\/[^\s]+\.supabase\.co/);
  assert.doesNotMatch(workflow, /CLERK_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(workflow, /(?:set -x|printenv|export\s+[^\n]*(?:TOKEN|KEY))/i);

  const preflightPosition = workflow.indexOf("Preflight canonical ephemeral PostgreSQL schema");
  const browserPosition = workflow.indexOf("Install Playwright browser");
  assert.ok(preflightPosition >= 0 && browserPosition > preflightPosition, "browser installation must follow the PostgreSQL preflight");
});

test("Supabase status readers use the apps/web CLI project workdir", () => {
  const concurrency = read("e2e/spogomi-concurrency.mjs");
  const persistent = read("e2e/run-github-actions-persistent.mjs");
  for (const source of [concurrency, persistent]) {
    assert.match(source, /path\.join\(root, "apps", "web"\)/);
    assert.match(source, /\["supabase", "status", "--workdir", supabaseDirectory/);
    assert.doesNotMatch(source, /path\.join\(root, "apps", "web", "supabase"\)/);
  }
  assert.doesNotMatch(concurrency, /reload schema/);
  assert.doesNotMatch(concurrency, /waitForSupabaseSchema/);
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
  assert.match(helper, /async function runPersistentE2E\(\)\s*\{\s*assertClerkDevelopmentSecrets\(\);/);
  assert.doesNotMatch(helper, /console\.(?:log|error)\([^\n]*(?:TOKEN|KEY|credential)/i);
});

test("global teardown retains cleanup of temporary Clerk state", () => {
  const teardown = read("e2e/global.teardown.ts");
  assert.match(teardown, /users\.deleteUser/);
  assert.match(teardown, /unlink\(managedUserFile\)/);
  assert.match(teardown, /unlink\(authFile\)/);
});
