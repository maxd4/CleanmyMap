import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const workflow = await readFile(new URL('../../.github/workflows/supabase-backup.yml', import.meta.url), 'utf8');

test('backup workflow is manual, main-only and protected', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s+push:/m);
  assert.doesNotMatch(workflow, /^\s+schedule:/m);
  assert.match(workflow, /if:\s+github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /environment:\s+supabase-production/);
  assert.match(workflow, /permissions:\s+contents: read/);
  assert.match(workflow, /retention-days:\s+[1-7]/);
});

test('workflow creates all dump classes, encrypts before upload and cleans up', () => {
  assert.match(workflow, /--role-only/);
  assert.match(workflow, /--data-only/);
  assert.match(workflow, /export-supabase-storage\.mjs/);
  assert.match(workflow, /gpg .*--encrypt/);
  assert.match(workflow, /gpg --batch --list-only --list-packets "\$encrypted_archive" 2>\/dev\/null \| grep -q ':pubkey enc packet:'/);
  assert.doesNotMatch(workflow, /public key encrypted packet/);
  assert.match(workflow, /upload-artifact@/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /rm -rf/);
  assert.match(workflow, /verify-supabase-backup-manifest\.mjs/);
  assert.match(workflow, /verify-supabase-backup-gpg\.mjs/);
  assert.match(workflow, /run_restore_stage\(\)\s*\{/);
  assert.match(workflow, /classify-supabase-restore-failure\.mjs/);
  assert.match(workflow, /RESTORE_SQL: stage=\$stage exit_code=\$exit_code classification=\$classification/);
  assert.match(workflow, /run_restore_stage schema \/tmp\/cmm-schema\.sql/);
  assert.match(workflow, /run_restore_stage data \/tmp\/cmm-data\.sql/);
  assert.match(workflow, /EPHEMERAL_RESTORE: PASS schema=data=executed/);
  assert.match(workflow, /steps\.encrypt\.outputs\.encrypted_archive/);
  const publication = workflow.slice(workflow.indexOf('- name: Publish encrypted artifact only'), workflow.indexOf('- name: Summarize the non-sensitive proof'));
  assert.doesNotMatch(publication, /BACKUP_ROOT|\.tar(?!\.gpg)/);
  assert.doesNotMatch(workflow, /echo\s+.*\$SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(workflow, /db push|migration repair/);
});

test('workflow verifies the protected GPG fingerprint and cannot run shell substitutions in its summary', () => {
  assert.match(workflow, /SUPABASE_BACKUP_GPG_EXPECTED_FINGERPRINT: \$\{\{ vars\.SUPABASE_BACKUP_GPG_EXPECTED_FINGERPRINT \}\}/);
  assert.doesNotMatch(workflow, /echo\s+[^\n]*`[^\n]*`/);
  assert.doesNotMatch(workflow, /printf\s+[^\n]*`[^\n]*`/);
});
