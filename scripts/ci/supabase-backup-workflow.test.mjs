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
  assert.match(workflow, /upload-artifact@/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /rm -rf/);
  assert.doesNotMatch(workflow, /echo\s+.*\$SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(workflow, /db push|migration repair/);
});
