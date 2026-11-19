import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  if (process.argv[index].startsWith('--')) args.set(process.argv[index].slice(2), process.argv[index + 1]);
}

async function filesUnder(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = join(current, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Backup tree contains an unsupported symbolic link: ${entry.name}`);
    if (entry.isDirectory()) files.push(...await filesUnder(root, absolute));
    else if (entry.isFile() && entry.name !== 'manifest.json') files.push(absolute);
  }
  return files;
}

function kindFor(path) {
  if (path.startsWith('database/roles')) return 'database-roles';
  if (path.startsWith('database/schema')) return 'database-schema';
  if (path.startsWith('database/data')) return 'database-data';
  if (path.startsWith('storage/objects/')) return 'storage-object';
  if (path === 'storage/storage-inventory.json') return 'storage-inventory';
  return 'metadata';
}

export async function buildManifest({ root, out, projectRef, gitSha, cliVersion, recipientFingerprint, now = new Date().toISOString() }) {
  const absoluteRoot = resolve(root);
  const entries = [];
  for (const absolute of await filesUnder(absoluteRoot)) {
    const bytes = await readFile(absolute);
    const path = relative(absoluteRoot, absolute).replaceAll('\\', '/');
    entries.push({ path, kind: kindFor(path), bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  entries.sort((left, right) => left.path.localeCompare(right.path));
  const required = ['database/roles.sql', 'database/schema.sql', 'database/data.sql', 'storage/storage-inventory.json'];
  for (const path of required) if (!entries.some((entry) => entry.path === path && entry.bytes > 0)) throw new Error(`Required backup file is missing or empty: ${path}`);
  const manifest = {
    format: 1,
    createdAt: now,
    projectRef,
    gitSha,
    cliVersion,
    recipientFingerprint,
    entries,
    coverage: {
      database: ['roles', 'schema', 'business-data'],
      excludedManagedSchemas: ['auth', 'storage', 'extension-managed schemas'],
      storage: ['object bytes', 'bucket metadata', 'object metadata', 'sha256'],
      notIncluded: ['auth users and provider metadata', 'Edge Functions', 'project secrets', 'managed service configuration', 'point-in-time history'],
    },
  };
  await writeFile(out, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}`) {
  try {
    await buildManifest({
      root: args.get('root'),
      out: args.get('out'),
      projectRef: args.get('project-ref'),
      gitSha: args.get('git-sha'),
      cliVersion: args.get('cli-version'),
      recipientFingerprint: args.get('recipient-fingerprint'),
    });
    console.log('BACKUP_MANIFEST: PASS');
  } catch (error) {
    console.error(`BACKUP_MANIFEST: FAIL ${error instanceof Error ? error.message : 'unknown error'}`);
    process.exitCode = 1;
  }
}
