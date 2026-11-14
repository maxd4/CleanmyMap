import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { exportStorage } from './export-supabase-storage.mjs';

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body, arrayBuffer: async () => Buffer.from(body) };
}

test('exports bucket objects with metadata and hashes without logging credentials', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cmm-storage-'));
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, headers: options.headers });
    if (url.endsWith('/storage/v1/bucket')) return response([{ id: 'avatars', name: 'avatars', public: false }]);
    if (url.includes('/storage/v1/object/list/')) {
      const prefix = JSON.parse(options.body).prefix;
      return prefix ? response([{ name: 'photo.webp', id: 'object-2', metadata: { mimetype: 'image/webp' } }]) : response([{ name: 'nested', id: null }, { name: 'avatar.png', id: 'object-1', metadata: { mimetype: 'image/png' }, updated_at: '2026-01-01' }]);
    }
    if (url.endsWith('/avatar.png')) return response('avatar');
    if (url.endsWith('/photo.webp')) return response('photo');
    throw new Error(`unexpected URL ${url}`);
  };
  try {
    const result = await exportStorage({ supabaseUrl: 'https://example.supabase.co', storageReadKey: 'synthetic-secret', outDir: root, fetchImpl });
    assert.equal(result.objectCount, 2);
    const inventory = JSON.parse(await readFile(join(root, 'storage-inventory.json'), 'utf8'));
    assert.deepEqual(inventory.objects.map((entry) => entry.path), ['avatar.png', 'nested/photo.webp']);
    assert.equal(calls.every(({ headers }) => headers.Authorization === 'Bearer synthetic-secret'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('fails closed on a traversal path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cmm-storage-'));
  try {
    await assert.rejects(
      exportStorage({
        supabaseUrl: 'https://example.supabase.co',
        storageReadKey: 'synthetic-secret',
        outDir: root,
        fetchImpl: async (url) => url.endsWith('/storage/v1/bucket') ? response([{ name: 'avatars', public: false }]) : response([{ name: '../private', id: 'bad' }]),
      }),
      /escapes|invalid/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
