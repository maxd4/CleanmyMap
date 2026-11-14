import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflowPath = path.join(repositoryRoot, ".github", "workflows", "supabase-convergence.yml");
const workflow = fs.readFileSync(workflowPath, "utf8");

test("Supabase convergence is main-only, scheduled, manual, and serialized", () => {
  assert.match(workflow, /push:[\s\S]*branches:\s*\n\s+- main/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /schedule:/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.match(workflow, /permissions:\s*\{\}/);
  assert.match(workflow, /group:\s*supabase-production-migrations/);
  assert.match(workflow, /cancel-in-progress:\s*false/);
  assert.match(workflow, /environment:\s*supabase-production/);
  assert.match(workflow, /if:\s*github\.ref == 'refs\/heads\/main'/);
});

test("production secrets are scoped to the protected non-PR job and the canonical CLI gate", () => {
  assert.match(workflow, /SUPABASE_ACCESS_TOKEN:\s*\$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/);
  assert.match(workflow, /SUPABASE_DB_PASSWORD:\s*\$\{\{ secrets\.SUPABASE_DB_PASSWORD \}\}/);
  assert.match(workflow, /VERCEL_TOKEN:\s*\$\{\{ secrets\.VERCEL_TOKEN \}\}/);
  assert.match(workflow, /resolve-vercel-runtime-proof\.mjs/);
  assert.match(workflow, /--runtime-proof=/);
  assert.match(workflow, /supabase:migration:preflight -- --dry-run/);
  assert.match(workflow, /steps\.preflight\.outputs\.status == 'READY_TO_APPLY'/);
  assert.match(workflow, /npx supabase db push --linked --yes/);
  assert.doesNotMatch(workflow, /migration repair|db reset|CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION/i);
});

test("the workflow verifies an empty queue and critical static contracts without pretending to run pgTAP remotely", () => {
  assert.match(workflow, /postflight_status.*ALIGNED/);
  assert.match(workflow, /audit:supabase-migration-trees/);
  assert.match(workflow, /action-rides-transactions-migration\.test\.ts/);
  assert.match(workflow, /public-action-map-reconstruction-projection\.test\.ts/);
  assert.doesNotMatch(workflow, /run-supabase-sql-proof\.mjs/);
});

test("all third-party actions in the workflow are pinned to full commit SHAs", () => {
  const refs = [...workflow.matchAll(/^\s+uses:\s+([^\s]+)@([^\s]+)$/gm)];
  assert.ok(refs.length >= 2);
  for (const [, action, sha] of refs) assert.match(`${action}@${sha}`, /@[0-9a-f]{40}$/i);
});
