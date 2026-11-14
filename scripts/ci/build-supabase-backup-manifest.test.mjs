import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildManifest } from './build-supabase-backup-manifest.mjs';

test('builds a hash-only manifest with explicit coverage boundaries', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cmm-manifest-'));
  try {
    await mkdir(join(root, 'database'), { recursive: true });
    await mkdir(join(root, 'storage'), { recursive: true });
    await writeFile(join(root, 'database', 'roles.sql'), 'roles');
    await writeFile(join(root, 'database', 'schema.sql'), 'schema');
    await writeFile(join(root, 'database', 'data.sql'), 'data');
    await writeFile(join(root, 'storage', 'storage-inventory.json'), '{}');
    const manifest = await buildManifest({ root, out: join(root, 'manifest.json'), projectRef: 'ref', gitSha: 'sha', cliVersion: 'cli', recipientFingerprint: 'A'.repeat(40), now: '2026-11-14T00:00:00.000Z' });
    assert.equal(manifest.entries.every((entry) => entry.sha256 && !entry.content), true);
    assert.deepEqual(manifest.coverage.excludedManagedSchemas, ['auth', 'storage', 'extension-managed schemas']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
