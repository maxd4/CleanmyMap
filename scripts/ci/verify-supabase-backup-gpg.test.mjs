import test from 'node:test';
import assert from 'node:assert/strict';
import { verifySupabaseBackupGpg } from './verify-supabase-backup-gpg.mjs';

const fingerprint = 'A'.repeat(40);
const inspectedKey = `pub:::::::::\nfpr:::::::::${fingerprint}:`;

test('imports one usable public key only after the expected fingerprint matches', async () => {
  const calls = [];
  const execFileImpl = async (command, args) => {
    calls.push({ command, args });
    return { stdout: inspectedKey };
  };
  assert.equal(await verifySupabaseBackupGpg({ keyFile: 'public.asc', expectedFingerprint: fingerprint.toLowerCase(), gnupgHome: 'gnupg', execFileImpl }), fingerprint);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].args, ['--batch', '--import', 'public.asc']);
});

test('rejects an incorrect fingerprint before importing the key', async () => {
  let importCount = 0;
  const execFileImpl = async (command, args) => {
    if (args.includes('--import') && !args.includes('--import-options')) importCount += 1;
    return { stdout: inspectedKey };
  };
  await assert.rejects(
    verifySupabaseBackupGpg({ keyFile: 'public.asc', expectedFingerprint: 'B'.repeat(40), gnupgHome: 'gnupg', execFileImpl }),
    /does not match/,
  );
  assert.equal(importCount, 0);
});

test('rejects a multi-key or malformed public-key listing', async () => {
  const execFileImpl = async () => ({ stdout: 'pub:::::::::\nfpr:::::::::not-a-fingerprint:' });
  await assert.rejects(
    verifySupabaseBackupGpg({ keyFile: 'public.asc', expectedFingerprint: fingerprint, gnupgHome: 'gnupg', execFileImpl }),
    /single usable public key/,
  );
});
