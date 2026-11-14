import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  if (process.argv[index].startsWith('--')) args.set(process.argv[index].slice(2), process.argv[index + 1]);
}

function normalizedFingerprint(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export async function verifySupabaseBackupGpg({ keyFile, expectedFingerprint, gnupgHome, execFileImpl = execFileAsync }) {
  const expected = normalizedFingerprint(expectedFingerprint);
  if (!/^[A-F0-9]{40}$/.test(expected)) throw new Error('The expected GPG fingerprint is invalid.');
  const options = { env: { ...process.env, GNUPGHOME: gnupgHome }, maxBuffer: 1024 * 1024 };
  const inspected = await execFileImpl('gpg', ['--batch', '--with-colons', '--import-options', 'show-only', '--import', keyFile], options);
  const lines = String(inspected.stdout ?? '').split(/\r?\n/).filter(Boolean);
  const publicKeyCount = lines.filter((line) => line.startsWith('pub:')).length;
  const fingerprint = normalizedFingerprint(lines.find((line) => line.startsWith('fpr:'))?.split(':')[9]);
  if (publicKeyCount !== 1 || !/^[A-F0-9]{40}$/.test(fingerprint)) throw new Error('The configured GPG value is not a single usable public key.');
  if (fingerprint !== expected) throw new Error('The configured GPG public key does not match the protected expected fingerprint.');
  await execFileImpl('gpg', ['--batch', '--import', keyFile], options);
  return fingerprint;
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}`) {
  try {
    const fingerprint = await verifySupabaseBackupGpg({
      keyFile: args.get('key'),
      expectedFingerprint: args.get('expected'),
      gnupgHome: args.get('gnupg-home'),
    });
    console.log(fingerprint);
  } catch (error) {
    console.error(`GPG_BACKUP_KEY: FAIL ${error instanceof Error ? error.message : 'unknown error'}`);
    process.exitCode = 1;
  }
}
