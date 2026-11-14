import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const execFileAsync = promisify(execFile);
const packetMarker = ':pubkey enc packet:';
const gpgPath = process.platform === 'win32' ? 'gpg.exe' : 'gpg';

async function hasGpg() {
  try {
    await execFileAsync(gpgPath, ['--version']);
    return true;
  } catch {
    return false;
  }
}

test('accepts the packet marker emitted by GnuPG list-packets', () => {
  const realGnuPGOutput = ':pubkey enc packet: version 3, algo 1, keyid 0123456789ABCDEF\n:encrypted data packet:';
  assert.match(realGnuPGOutput, new RegExp(packetMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('rejects absent packet markers and invalid encryption output', () => {
  for (const output of ['', 'gpg: no valid OpenPGP data found.', ':encrypted data packet:']) {
    assert.equal(output.includes(packetMarker), false);
  }
});

test('observes the marker on a real ephemeral GnuPG encryption', { skip: !(await hasGpg()) }, async () => {
  const root = await mkdtemp(join(process.env.TEMP ?? process.env.TMP ?? '.', 'cmm-gpg-packet-'));
  const home = join(root, 'gnupg');
  const plaintext = join(root, 'payload.txt');
  const archive = join(root, 'payload.gpg');
  try {
    await writeFile(plaintext, 'ephemeral backup payload\n');
    await execFileAsync(gpgPath, ['--batch', '--yes', '--homedir', home, '--quick-generate-key', 'CMM backup test', 'rsa2048', 'encrypt', '0']);
    const { stdout: keys } = await execFileAsync(gpgPath, ['--batch', '--with-colons', '--homedir', home, '--list-keys']);
    const fingerprint = keys.split(/\r?\n/).find((line) => line.startsWith('fpr:'))?.split(':')[9];
    assert.match(fingerprint ?? '', /^[A-F0-9]{40}$/);
    await execFileAsync(gpgPath, ['--batch', '--yes', '--homedir', home, '--trust-model', 'always', '--recipient', fingerprint, '--output', archive, '--encrypt', plaintext]);
    const { stdout } = await execFileAsync(gpgPath, ['--batch', '--list-packets', archive]);
    assert.equal(stdout.includes(packetMarker), true);
    await writeFile(archive, 'not an encrypted OpenPGP archive');
    await assert.rejects(execFileAsync(gpgPath, ['--batch', '--list-packets', archive]));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
