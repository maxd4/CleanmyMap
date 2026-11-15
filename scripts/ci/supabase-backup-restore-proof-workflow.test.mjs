import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const workflow = await readFile(new URL('../../.github/workflows/supabase-backup-restore-proof.yml', import.meta.url), 'utf8');

test('ephemeral backup proof reconstructs source and target without Production credentials', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /push:/);
  assert.match(workflow, /branches:\s*\n\s+- main/);
  assert.match(workflow, /permissions:\s+contents: read/);
  assert.match(workflow, /supabase db reset --local --workdir apps\/web/);
  assert.match(workflow, /project_id = "cmm-backup-proof-target"/);
  assert.match(workflow, /cp apps\/web\/supabase\/config\.toml "\$PROOF_TARGET_WORKDIR\/supabase\/config\.toml"/);
  assert.match(workflow, /port = 54422/);
  assert.match(workflow, /shadow_port = 54420/);
  assert.match(workflow, /smtp_port = 54425/);
  assert.match(workflow, /pop3_port = 54426/);
  assert.match(workflow, /enabled = false/);
  assert.match(workflow, /supabase db dump --local --workdir apps\/web --role-only/);
  assert.match(workflow, /--schema public --file .*schema\.sql/);
  assert.match(workflow, /--data-only --schema public --use-copy/);
  assert.match(workflow, /supabase_db_web/);
  assert.match(workflow, /cmm-backup-proof-target/);
  assert.match(workflow, /supabase-restore-extension-preflight\.sql/);
  assert.match(workflow, /prepare-supabase-restore-roles\.mjs/);
  assert.match(workflow, /restore-admin-user\.txt/);
  assert.match(workflow, /run_stage roles \/tmp\/cmm-roles\.sql "\$restore_admin_user"/);
  assert.match(workflow, /supabase-backup-restore-proof-fixture\.sql/);
  assert.match(workflow, /run_stage roles \/tmp\/cmm-roles\.sql/);
  assert.match(workflow, /run_stage extensions \/tmp\/cmm-restore-extension-preflight\.sql/);
  assert.match(workflow, /run_stage schema \/tmp\/cmm-schema\.sql/);
  assert.match(workflow, /run_stage data \/tmp\/cmm-data\.sql/);
  assert.match(workflow, /VERBOSITY=verbose/);
  assert.match(workflow, /diagnose-supabase-start\.mjs/);
  assert.match(workflow, /cmm_backup_missing_extension_fixture/);
  assert.match(workflow, /cmm_backup_coherence_fixture/);
  assert.match(workflow, /restore_business_relations[\s\S]*deptype = 'e'/);
  assert.match(workflow, /grep -qx 't\|t\|t\|t\|t\|t\|t\|t\|t\|t\|t'/);
  assert.match(workflow, /EPHEMERAL_BACKUP_RESTORE_PROOF: PASS/);
  assert.match(workflow, /Production writes: NONE/);
  assert.match(workflow, /SQL\/data diagnostics: private temporary files only/);
  assert.match(workflow, /supabase stop --workdir apps\/web/);
  assert.match(workflow, /rm -rf "\$proof_root"/);
  assert.doesNotMatch(workflow, /SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_BACKUP_STORAGE_READ_KEY/);
  assert.doesNotMatch(workflow, /upload-artifact@/);
  assert.doesNotMatch(workflow, /db push|migration repair/);
});

test('proof keeps SQL diagnostics out of workflow output', () => {
  assert.match(workflow, /docker exec "\$target_container" psql "\$\{args\[@\]\}" > "\$log" 2>&1/);
  assert.match(workflow, /classify-supabase-restore-failure\.mjs --log "\$log"/);
  assert.doesNotMatch(workflow, /cat "\$PROOF_ROOT\/restore-/);
  assert.doesNotMatch(workflow, /cat "\$PROOF_ROOT\/dumps/);
});
