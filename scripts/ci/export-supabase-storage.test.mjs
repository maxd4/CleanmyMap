import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { exportStorage, validateStorageReadKey } from './export-supabase-storage.mjs';

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body, arrayBuffer: async () => Buffer.from(body) };
}

test('accepts only sb_secret_ keys and rejects unsupported credential types', () => {
  assert.equal(validateStorageReadKey('sb_secret_test-key'), 'sb_secret_test-key');
  for (const key of ['service_role_test', 'eyJhbGciOiJIUzI1NiJ9.test', 'anon_test', 'sb_secret_']) {
    assert.throws(() => validateStorageReadKey(key), /Unsupported Storage read key type/);
  }
});

test('exports private and public bucket objects with metadata and hashes using read-only headers', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cmm-storage-'));
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, headers: options.headers, method: options.method ?? 'GET' });
    if (url.endsWith('/storage/v1/bucket')) return response([
      { id: 'avatars', name: 'avatars', public: false, file_size_limit: 1000 },
      { id: 'public-assets', name: 'public-assets', public: true, allowed_mime_types: ['image/png'] },
    ]);
    if (url.includes('/storage/v1/object/list/')) {
      const prefix = JSON.parse(options.body).prefix;
      const bucket = decodeURIComponent(url.split('/').at(-1));
      if (bucket === 'public-assets') return response(prefix ? [] : [{ name: 'logo.png', id: 'object-3', metadata: { mimetype: 'image/png' } }]);
      return prefix ? response([{ name: 'photo.webp', id: 'object-2', metadata: { mimetype: 'image/webp' } }]) : response([{ name: 'nested', id: null }, { name: 'avatar.png', id: 'object-1', metadata: { mimetype: 'image/png' }, updated_at: '2026-01-01' }]);
    }
    if (url.endsWith('/avatar.png')) return response('avatar');
    if (url.endsWith('/photo.webp')) return response('photo');
    if (url.endsWith('/logo.png')) return response('logo');
    throw new Error(`unexpected URL ${url}`);
  };
  try {
    const result = await exportStorage({ supabaseUrl: 'https://example.supabase.co', storageReadKey: 'sb_secret_test-key', outDir: root, fetchImpl });
    assert.equal(result.bucketCount, 2);
    assert.equal(result.objectCount, 3);
    const inventory = JSON.parse(await readFile(join(root, 'storage-inventory.json'), 'utf8'));
    assert.deepEqual(inventory.objects.map((entry) => `${entry.bucket}/${entry.path}`), ['avatars/avatar.png', 'avatars/nested/photo.webp', 'public-assets/logo.png']);
    assert.equal(inventory.buckets.find((bucket) => bucket.name === 'avatars').public, false);
    assert.equal(inventory.buckets.find((bucket) => bucket.name === 'public-assets').public, true);
    assert.equal(calls.every(({ headers }) => headers.apikey === 'sb_secret_test-key' && !('Authorization' in headers)), true);
    assert.equal(calls.every(({ headers }) => Object.keys(headers).every((header) => header === 'apikey' || header === 'content-type')), true);
    assert.deepEqual([...new Set(calls.map(({ method }) => method))].sort(), ['GET', 'POST']);
    assert.equal(calls.some(({ method }) => ['PUT', 'PATCH', 'DELETE'].includes(method)), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('fails closed on HTTP errors, invalid pages, and never emits a completed inventory', async () => {
  for (const failingFetch of [
    async (url) => url.endsWith('/storage/v1/bucket') ? response([], 403) : response([]),
    async (url) => url.includes('/storage/v1/object/list/') ? response({ incomplete: true }) : response([{ name: 'avatars', public: false }]),
    async (url) => url.endsWith('/avatar.png') ? response([], 401) : url.includes('/storage/v1/object/list/') ? response([{ name: 'avatar.png', id: 'object-1' }]) : response([{ name: 'avatars', public: false }]),
  ]) {
    const root = await mkdtemp(join(tmpdir(), 'cmm-storage-fail-'));
    try {
      await assert.rejects(exportStorage({ supabaseUrl: 'https://example.supabase.co', storageReadKey: 'sb_secret_test-key', outDir: root, fetchImpl: failingFetch }), /HTTP 401|HTTP 403|invalid page/);
      await assert.rejects(readFile(join(root, 'storage-inventory.json'), 'utf8'));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test('walks every listing page before producing the inventory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cmm-storage-pages-'));
  const offsets = [];
  const fetchImpl = async (url, options = {}) => {
    if (url.endsWith('/storage/v1/bucket')) return response([{ name: 'avatars', public: false }]);
    if (url.includes('/storage/v1/object/list/')) {
      const { offset, limit } = JSON.parse(options.body);
      offsets.push([offset, limit]);
      if (offset === 0) return response([{ name: 'one.txt', id: 'object-1' }, { name: 'two.txt', id: 'object-2' }]);
      if (offset === 2) return response([{ name: 'three.txt', id: 'object-3' }]);
    }
    if (url.endsWith('/one.txt')) return response('one');
    if (url.endsWith('/two.txt')) return response('two');
    if (url.endsWith('/three.txt')) return response('three');
    throw new Error(`unexpected URL ${url}`);
  };
  try {
    const result = await exportStorage({ supabaseUrl: 'https://example.supabase.co', storageReadKey: 'sb_secret_test-key', outDir: root, fetchImpl, pageSize: 2 });
    assert.equal(result.objectCount, 3);
    assert.deepEqual(offsets, [[0, 2], [2, 2]]);
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
        storageReadKey: 'sb_secret_test-key',
        outDir: root,
        fetchImpl: async (url) => url.endsWith('/storage/v1/bucket') ? response([{ name: 'avatars', public: false }]) : response([{ name: '../private', id: 'bad' }]),
      }),
      /escapes|invalid/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
