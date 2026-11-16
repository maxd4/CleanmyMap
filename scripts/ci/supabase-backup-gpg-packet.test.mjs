import { execFile } from 'node:child_process';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const execFileAsync = promisify(execFile);
const packetMarker = ':pubkey enc packet:';
const gpgPath = process.platform === 'win32' ? 'gpg.exe' : 'gpg';

async function assertGnuPGAvailable(t) {
  try {
    await execFileAsync(gpgPath, ['--version']);
    return true;
  } catch (error) {
    t.skip(`GnuPG unavailable in this environment: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function createGnuPGHome(path) {
  await mkdir(path, { recursive: true, mode: 0o700 });
  await chmod(path, 0o700);
}

async function listPackets(home, archive) {
  return execFileAsync(gpgPath, [
    '--batch',
    '--list-only',
    '--list-packets',
    '--homedir',
    home,
    archive,
  ]);
}

test('accepts the packet marker emitted by GnuPG list-only list-packets', () => {
  const realGnuPGOutput = ':pubkey enc packet: version 3, algo 1, keyid 0123456789ABCDEF\n:encrypted data packet:';
  assert.match(realGnuPGOutput, new RegExp(packetMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('rejects absent packet markers and invalid encryption output', () => {
  for (const output of ['', 'gpg: no valid OpenPGP data found.', ':encrypted data packet:']) {
    assert.equal(output.includes(packetMarker), false);
  }
});

test('verifies a real encrypted archive with only the imported public key', async (t) => {
  if (!(await assertGnuPGAvailable(t))) return;
  const root = await mkdtemp(join(process.env.TEMP ?? process.env.TMP ?? '.', 'cmm-gpg-packet-'));
  const makerHome = join(root, 'maker-gnupg');
  const verifierHome = join(root, 'verifier-gnupg');
  const plaintext = join(root, 'payload.txt');
  const publicKey = join(root, 'public-key.asc');
  const archive = join(root, 'payload.gpg');
  const packetMissing = join(root, 'packet-missing.gpg');
  const invalidArchive = join(root, 'invalid.gpg');

  try {
    await createGnuPGHome(makerHome);
    await createGnuPGHome(verifierHome);
    await writeFile(plaintext, 'ephemeral backup payload\n');
    await execFileAsync(gpgPath, [
      '--batch',
      '--pinentry-mode',
      'loopback',
      '--passphrase',
      '',
      '--homedir',
      makerHome,
      '--quick-generate-key',
      'CMM backup test',
      'rsa2048',
      'encrypt',
      '0',
    ]);

    const { stdout: keys } = await execFileAsync(gpgPath, [
      '--batch',
      '--with-colons',
      '--homedir',
      makerHome,
      '--list-keys',
    ]);
    const fingerprint = keys.split(/\r?\n/).find((line) => line.startsWith('fpr:'))?.split(':')[9];
    assert.match(fingerprint ?? '', /^[A-F0-9]{40}$/);

    const { stdout: exportedPublicKey } = await execFileAsync(gpgPath, [
      '--batch',
      '--homedir',
      makerHome,
      '--armor',
      '--export',
      fingerprint,
    ]);
    await writeFile(publicKey, exportedPublicKey);
    await execFileAsync(gpgPath, ['--batch', '--homedir', verifierHome, '--import', publicKey]);

    const { stdout: secretKeys } = await execFileAsync(gpgPath, [
      '--batch',
      '--with-colons',
      '--homedir',
      verifierHome,
      '--list-secret-keys',
    ]);
    assert.doesNotMatch(secretKeys, /^sec:/m);

    await execFileAsync(gpgPath, [
      '--batch',
      '--yes',
      '--homedir',
      verifierHome,
      '--trust-model',
      'always',
      '--recipient',
      fingerprint,
      '--output',
      archive,
      '--encrypt',
      plaintext,
    ]);
    const { stdout: packets } = await listPackets(verifierHome, archive);
    assert.match(packets, new RegExp(packetMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    await writeFile(packetMissing, ':encrypted data packet:\n');
    await assert.rejects(listPackets(verifierHome, packetMissing));
    await assert.rejects(listPackets(verifierHome, join(root, 'missing.gpg')));

    await writeFile(invalidArchive, 'not an encrypted OpenPGP archive');
    await assert.rejects(listPackets(verifierHome, invalidArchive));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
