import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
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
    else if (!entry.isFile()) throw new Error(`Backup tree contains an unsupported filesystem entry: ${entry.name}`);
  }
  return files;
}

export async function verifyBackupManifest({ root, manifestPath }) {
  const absoluteRoot = resolve(root);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) throw new Error('Backup manifest has no entries.');
  const manifestEntries = new Map();
  for (const entry of manifest.entries) {
    if (typeof entry.path !== 'string' || manifestEntries.has(entry.path)) throw new Error('Backup manifest contains duplicate or invalid paths.');
    manifestEntries.set(entry.path, entry);
  }
  const actualFiles = await filesUnder(absoluteRoot);
  const actualPaths = new Set(actualFiles.map((absolute) => relative(absoluteRoot, absolute).replaceAll('\\', '/')));
  if (actualPaths.size !== manifestEntries.size) throw new Error('Backup manifest file count does not match the backup tree.');
  for (const path of actualPaths) {
    const entry = manifestEntries.get(path);
    if (!entry) throw new Error(`Backup manifest is missing file: ${path}`);
    const bytes = await readFile(join(absoluteRoot, ...path.split('/')));
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (entry.bytes !== bytes.byteLength || entry.sha256 !== sha256) throw new Error(`Backup manifest hash mismatch: ${path}`);
  }
  for (const required of ['database/roles.sql', 'database/schema.sql', 'database/data.sql', 'storage/storage-inventory.json']) {
    if (!manifestEntries.has(required)) throw new Error(`Backup manifest is missing required file: ${required}`);
  }
  return { entryCount: manifestEntries.size };
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}`) {
  try {
    const result = await verifyBackupManifest({ root: args.get('root'), manifestPath: args.get('manifest') });
    console.log(`BACKUP_MANIFEST_INTEGRITY: PASS entries=${result.entryCount}`);
  } catch (error) {
    console.error(`BACKUP_MANIFEST_INTEGRITY: FAIL ${error instanceof Error ? error.message : 'unknown error'}`);
    process.exitCode = 1;
  }
}
