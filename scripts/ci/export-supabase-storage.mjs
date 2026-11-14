import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';

const DEFAULT_PAGE_SIZE = 1000;
const STORAGE_SECRET_KEY_PREFIX = 'sb_secret_';

function assertSafePath(value) {
  if (typeof value !== 'string' || !value || value.includes('\0') || value.includes('\\')) {
    throw new Error('Storage object path is invalid.');
  }
  const normalized = posix.normalize(value);
  if (value.startsWith('/') || normalized === '..' || normalized.startsWith('../')) {
    throw new Error('Storage object path escapes its bucket.');
  }
  return value;
}

export function validateStorageReadKey(storageReadKey) {
  if (typeof storageReadKey !== 'string' || !storageReadKey.startsWith(STORAGE_SECRET_KEY_PREFIX) || storageReadKey.length <= STORAGE_SECRET_KEY_PREFIX.length) {
    throw new Error('Unsupported Storage read key type; expected an sb_secret_ key.');
  }
  return storageReadKey;
}

function apiHeaders(storageReadKey) {
  return { apikey: validateStorageReadKey(storageReadKey) };
}

async function requestJson(fetchImpl, url, options, label) {
  const response = await fetchImpl(url, options);
  if (!response.ok) throw new Error(`${label} failed with HTTP ${response.status}.`);
  return response.json();
}

async function requestBytes(fetchImpl, url, options) {
  const response = await fetchImpl(url, options);
  if (!response.ok) throw new Error(`Storage object download failed with HTTP ${response.status}.`);
  return Buffer.from(await response.arrayBuffer());
}

function objectPath(bucket, name) {
  assertSafePath(bucket);
  return assertSafePath(name);
}

async function listObjects(fetchImpl, baseUrl, bucket, headers, prefix = '', pageSize = DEFAULT_PAGE_SIZE) {
  const result = [];
  for (let offset = 0; ; offset += pageSize) {
    const objects = await requestJson(
      fetchImpl,
      `${baseUrl}/storage/v1/object/list/${encodeURIComponent(bucket)}`,
      {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ prefix, limit: pageSize, offset, sortBy: { column: 'name', order: 'asc' } }),
      },
      'Storage object listing',
    );
    if (!Array.isArray(objects)) throw new Error('Storage object listing returned an invalid page.');
    for (const entry of objects) {
      const name = objectPath(bucket, `${prefix}${entry.name ?? ''}`);
      if (entry.id == null) {
        result.push(...await listObjects(fetchImpl, baseUrl, bucket, headers, `${name}/`, pageSize));
      } else {
        result.push({ ...entry, name });
      }
    }
    if (objects.length < pageSize) return result;
  }
}

export async function exportStorage({ supabaseUrl, storageReadKey, outDir, fetchImpl = fetch, pageSize = DEFAULT_PAGE_SIZE }) {
  if (!supabaseUrl || !storageReadKey || !outDir) throw new Error('Storage export configuration is incomplete.');
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('Storage page size is invalid.');
  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const headers = apiHeaders(storageReadKey);
  const buckets = await requestJson(fetchImpl, `${baseUrl}/storage/v1/bucket`, { headers }, 'Storage bucket listing');
  if (!Array.isArray(buckets)) throw new Error('Storage bucket listing returned an invalid response.');
  const inventory = { format: 1, buckets: [], objects: [] };
  const seenBuckets = new Set();
  const seenObjects = new Set();
  let totalBytes = 0;

  for (const bucket of buckets) {
    const bucketName = assertSafePath(bucket.name);
    if (seenBuckets.has(bucketName)) throw new Error(`Storage bucket listing contains a duplicate bucket: ${bucketName}`);
    seenBuckets.add(bucketName);
    const entries = await listObjects(fetchImpl, baseUrl, bucketName, headers, '', pageSize);
    inventory.buckets.push({
      id: bucket.id,
      name: bucketName,
      public: Boolean(bucket.public),
      file_size_limit: bucket.file_size_limit ?? null,
      allowed_mime_types: bucket.allowed_mime_types ?? null,
    });
    for (const entry of entries) {
      const name = objectPath(bucketName, entry.name);
      const objectKey = `${bucketName}/${name}`;
      if (seenObjects.has(objectKey)) throw new Error(`Storage object listing contains a duplicate object: ${objectKey}`);
      seenObjects.add(objectKey);
      const bytes = await requestBytes(
        fetchImpl,
        `${baseUrl}/storage/v1/object/${encodeURIComponent(bucketName)}/${name.split('/').map(encodeURIComponent).join('/')}`,
        { headers },
      );
      const target = join(outDir, 'objects', bucketName, ...name.split('/'));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, bytes, { flag: 'wx' });
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      inventory.objects.push({
        bucket: bucketName,
        path: name,
        id: entry.id,
        updated_at: entry.updated_at ?? null,
        last_accessed_at: entry.last_accessed_at ?? null,
        metadata: entry.metadata ?? null,
        sizeBytes: bytes.byteLength,
        sha256,
      });
      totalBytes += bytes.byteLength;
    }
  }

  inventory.objects.sort((left, right) => `${left.bucket}/${left.path}`.localeCompare(`${right.bucket}/${right.path}`));
  await writeFile(join(outDir, 'storage-inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`, { flag: 'wx' });
  return { bucketCount: inventory.buckets.length, objectCount: inventory.objects.length, totalBytes };
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}`) {
  const outDir = process.argv[process.argv.indexOf('--out') + 1];
  try {
    const result = await exportStorage({
      supabaseUrl: process.env.SUPABASE_URL,
      storageReadKey: process.env.SUPABASE_STORAGE_READ_KEY,
      outDir,
    });
    console.log(`STORAGE_EXPORT: PASS buckets=${result.bucketCount} objects=${result.objectCount} bytes=${result.totalBytes}`);
  } catch (error) {
    console.error(`STORAGE_EXPORT: FAIL ${error instanceof Error ? error.message : 'unknown error'}`);
    process.exitCode = 1;
  }
}
