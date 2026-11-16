import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const workflow = await readFile(new URL('../../.github/workflows/supabase-backup.yml', import.meta.url), 'utf8');
const r2Publisher = await readFile(new URL('./publish-supabase-backup-r2.mjs', import.meta.url), 'utf8');

test('backup workflow is monthly-gated, manually confirmable, main-only and protected', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /^\s+schedule:/m);
  assert.match(workflow, /cron:\s*["']17 2 1 \* \*["']/);
  assert.match(workflow, /github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow, /github\.event_name == 'schedule'/);
  assert.match(workflow, /vars\.SUPABASE_BACKUP_MONTHLY_ENABLED == 'true'/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /environment:\s+supabase-production/);
  assert.match(workflow, /permissions:\s+contents: read/);
  assert.match(workflow, /retention-days:\s+[1-7]/);
});

test('backup exports all dump classes, uses the shared restore-check, encrypts before upload and cleans up', () => {
  assert.match(workflow, /--role-only/);
  assert.match(workflow, /--schema public,private --file .*schema\.sql/);
  assert.match(workflow, /--data-only --schema public,private --use-copy/);
  assert.match(workflow, /export-supabase-storage\.mjs/);
  assert.match(workflow, /prepare-supabase-restore-target\.mjs/);
  assert.match(workflow, /project-id=cmm-backup-restore/);
  assert.match(workflow, /run-supabase-restore-check\.sh/);
  assert.match(workflow, /RESTORE_CHECK_EXPECT_SYNTHETIC_FIXTURE=false/);
  assert.doesNotMatch(workflow, /run_restore_stage\s+|docker exec .*cmm-restore-checks|verify-supabase-backup-relation-coherence/);
  assert.match(workflow, /gpg .*--encrypt/);
  assert.match(workflow, /gpg --batch --list-only --list-packets .*grep -q ':pubkey enc packet:'/);
  assert.doesNotMatch(workflow, /public key encrypted packet/);
  assert.match(workflow, /publish-supabase-backup-r2\.mjs/);
  assert.match(workflow, /SUPABASE_BACKUP_R2_ACCESS_KEY_ID/);
  assert.match(workflow, /SUPABASE_BACKUP_R2_SECRET_ACCESS_KEY/);
  assert.match(workflow, /add-mask::\$SUPABASE_BACKUP_R2_ENDPOINT/);
  assert.match(workflow, /BACKUP_STATUS=BACKUP_CREATED/);
  assert.match(workflow, /RESTORE_STATUS=\$restore_status/);
  assert.match(workflow, /RESTORE_VERIFIED/);
  assert.match(workflow, /RESTORE_FAILED/);
  assert.doesNotMatch(workflow, /DeleteObject|delete-object|PutBucketLifecycle|lifecycle-configuration/);
  assert.match(workflow, /upload-artifact@/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /rm -rf/);
  assert.match(workflow, /verify-supabase-backup-manifest\.mjs/);
  assert.doesNotMatch(workflow, /db push|migration repair/);
  assert.doesNotMatch(workflow, /echo\s+.*\$SUPABASE_SERVICE_ROLE_KEY/);
  assert.ok(workflow.indexOf('bash scripts/ci/run-supabase-restore-check.sh') < workflow.indexOf('- name: Encrypt the complete backup before artifact publication'));
  assert.ok(workflow.indexOf('- name: Publish encrypted backup to private Cloudflare R2 and verify retrieval') > workflow.indexOf('- name: Encrypt the complete backup before artifact publication'));
  const publication = workflow.slice(workflow.indexOf('- name: Publish encrypted artifact only'), workflow.indexOf('- name: Summarize the non-sensitive proof'));
  assert.doesNotMatch(publication, /BACKUP_ROOT|\.tar(?!\.gpg)/);
});

test('R2 publisher is private, collision-safe, and read-back verified', () => {
  assert.match(r2Publisher, /IfNoneMatch:\s+"\*"/);
  assert.match(r2Publisher, /R2_OBJECT_COLLISION/);
  assert.match(r2Publisher, /R2_ARCHIVE_CORRUPTED/);
  assert.match(r2Publisher, /R2_CHECKSUM_CORRUPTED/);
  assert.match(r2Publisher, /sha256\(downloadedArchive\)/);
  assert.doesNotMatch(r2Publisher, /DeleteObject|delete-object|PutBucketLifecycle|lifecycle-configuration/);
});

test('backup workflow keeps the protected GPG fingerprint and non-sensitive summary', () => {
  assert.match(workflow, /SUPABASE_BACKUP_GPG_EXPECTED_FINGERPRINT: \$\{\{ vars\.SUPABASE_BACKUP_GPG_EXPECTED_FINGERPRINT \}\}/);
  assert.doesNotMatch(workflow, /echo\s+[^\n]*`[^\n]*`/);
  assert.doesNotMatch(workflow, /printf\s+[^\n]*`[^\n]*`/);
});
