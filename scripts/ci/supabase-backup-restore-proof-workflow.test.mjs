import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const workflow = await readFile(new URL('../../.github/workflows/supabase-backup-restore-proof.yml', import.meta.url), 'utf8');

test('ephemeral backup proof reconstructs source and canonical target without Production credentials', () => {
  assert.match(workflow, /cancel-in-progress:\s*false/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /push:/);
  assert.match(workflow, /branches:\s*\n\s+- main/);
  assert.match(workflow, /permissions:\s+contents: read/);
  assert.match(workflow, /supabase db reset --local --workdir apps\/web/);
  assert.match(workflow, /prepare-supabase-restore-target\.mjs/);
  assert.match(workflow, /project-id=cmm-backup-proof-target/);
  assert.match(workflow, /port-offset=100/);
  assert.match(workflow, /supabase db dump --local --workdir apps\/web --role-only/);
  assert.match(workflow, /--schema public,private --file .*schema\.sql/);
  assert.match(workflow, /--data-only --schema public,private --use-copy/);
  assert.match(workflow, /supabase_db_web/);
  assert.match(workflow, /cmm-backup-proof-target/);
  assert.match(workflow, /run-supabase-restore-check\.sh/);
  assert.match(workflow, /RESTORE_CHECK_EXPECT_SYNTHETIC_FIXTURE=true/);
  assert.match(workflow, /EPHEMERAL_BACKUP_RESTORE_PROOF: PASS/);
  assert.match(workflow, /Production writes: NONE/);
  assert.match(workflow, /SQL\/data diagnostics: private temporary files only/);
  assert.match(workflow, /supabase stop --workdir apps\/web/);
  assert.match(workflow, /rm -rf "\$proof_root"/);
  assert.doesNotMatch(workflow, /SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_BACKUP_STORAGE_READ_KEY/);
  assert.doesNotMatch(workflow, /upload-artifact@/);
  assert.doesNotMatch(workflow, /db push|migration repair/);
});

test('proof delegates SQL and diagnostics to the shared private executor', () => {
  assert.match(workflow, /bash scripts\/ci\/run-supabase-restore-check\.sh/);
  assert.equal((workflow.match(/bash scripts\/ci\/start-supabase-ephemeral\.sh/g) ?? []).length, 2);
  assert.doesNotMatch(workflow, /run_stage\s+|docker exec .*psql .*cmm-restore-checks|cat .*restore-.*\.log/);
});
