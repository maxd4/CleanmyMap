import { mkdtemp, mkdir, rm, unlink, writeFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { buildManifest } from './build-supabase-backup-manifest.mjs';
import { verifyBackupManifest } from './verify-supabase-backup-manifest.mjs';

async function fixture() {
  const root = await mkdtemp(join(process.env.TEMP ?? process.env.TMP ?? '.', 'cmm-manifest-'));
  await mkdir(join(root, 'database'), { recursive: true });
  await mkdir(join(root, 'storage', 'objects', 'private'), { recursive: true });
  await writeFile(join(root, 'database', 'roles.sql'), 'roles');
  await writeFile(join(root, 'database', 'schema.sql'), 'schema');
  await writeFile(join(root, 'database', 'data.sql'), 'data');
  await writeFile(join(root, 'storage', 'storage-inventory.json'), '{"buckets":[]}');
  await writeFile(join(root, 'storage', 'objects', 'private', 'object.bin'), 'bytes');
  return root;
}

test('verifies every manifest hash and rejects tampering or missing files', async () => {
  const root = await fixture();
  try {
    const manifestPath = join(root, 'manifest.json');
    await buildManifest({ root, out: manifestPath, projectRef: 'ref', gitSha: 'sha', cliVersion: 'cli', recipientFingerprint: 'A'.repeat(40) });
    assert.deepEqual(await verifyBackupManifest({ root, manifestPath }), { entryCount: 5 });
    await writeFile(join(root, 'storage', 'objects', 'private', 'object.bin'), 'tampered');
    await assert.rejects(verifyBackupManifest({ root, manifestPath }), /hash mismatch/);
    await unlink(join(root, 'storage', 'objects', 'private', 'object.bin'));
    await assert.rejects(verifyBackupManifest({ root, manifestPath }), /file count/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
