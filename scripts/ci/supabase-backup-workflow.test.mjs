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
  assert.match(workflow, /--schema public --file .*schema\.sql/);
  assert.match(workflow, /--data-only --schema public --use-copy/);
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
  assert.match(workflow, /psql_args=\(-v ON_ERROR_STOP=1 -v VERBOSITY=sqlstate/);
  assert.match(workflow, /classify-supabase-restore-failure\.mjs/);
  assert.match(workflow, /RESTORE_SQL: stage=\$stage exit_code=\$exit_code \$diagnostic/);
  assert.match(workflow, /docker cp "\$BACKUP_ROOT\/database\/roles\.sql" "\$db_container:\/tmp\/cmm-roles\.sql"/);
  assert.match(workflow, /restore_db="postgres"/);
  assert.match(workflow, /run_restore_stage roles \/tmp\/cmm-roles\.sql/);
  assert.match(workflow, /run_restore_stage schema \/tmp\/cmm-schema\.sql/);
  assert.match(workflow, /verify-supabase-backup-relation-coherence\.mjs/);
  assert.match(workflow, /--write-exported-file .*restore-exported-relations\.txt/);
  assert.match(workflow, /relation-coherence-positive/);
  assert.match(workflow, /relation-coherence-negative/);
  assert.match(workflow, /publication is refused/);
  assert.match(workflow, /drop table public\.cmm_backup_coherence_fixture/);
  assert.match(workflow, /fixture_count/);
  assert.match(workflow, /pg_depend/);
  assert.match(workflow, /restore_business_relations/);
  assert.ok(workflow.indexOf('drop table public.cmm_backup_coherence_fixture') < workflow.indexOf('docker exec "$db_container" psql -X -A -t -F'));
  assert.match(workflow, /run_restore_stage data \/tmp\/cmm-data\.sql/);
  assert.match(workflow, /restore_workdir="\$RUNNER_TEMP\/cmm-supabase-restore"/);
  assert.match(workflow, /project_id = "cmm-backup-restore"/);
  assert.match(workflow, /\[db\.migrations\][\s\S]*?enabled = false/);
  assert.match(workflow, /\[db\.seed\][\s\S]*?enabled = false/);
  assert.doesNotMatch(workflow, /supabase start --workdir apps\/web/);
  assert.match(workflow, /session_replication_role = replica/);
  assert.doesNotMatch(workflow, /dropdb .*cmm_backup_restore|createdb .*cmm_backup_restore/);
  assert.match(workflow, /information_schema\.role_table_grants/);
  assert.match(workflow, /EPHEMERAL_RESTORE: PASS roles=schema=data=executed/);
  assert.match(workflow, /restore-roles\.log/);
  assert.match(workflow, /steps\.encrypt\.outputs\.encrypted_archive/);
  assert.ok(workflow.indexOf('run_restore_stage data /tmp/cmm-data.sql') < workflow.indexOf('- name: Encrypt the complete backup before artifact publication'));
  assert.ok(workflow.indexOf('- name: Encrypt the complete backup before artifact publication') < workflow.indexOf('- name: Publish encrypted artifact only'));
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
