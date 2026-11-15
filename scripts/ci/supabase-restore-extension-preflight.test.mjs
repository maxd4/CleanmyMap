import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const sql = await readFile(new URL('./supabase-restore-extension-preflight.sql', import.meta.url), 'utf8');

test('restore extension preflight installs and verifies the expected extension contract', () => {
  for (const extension of ['pgcrypto', 'pg_trgm', 'uuid-ossp', 'postgis']) {
    assert.match(sql, new RegExp(`create extension if not exists [\\"]?${extension.replace('-', '\\-')}[\\"]? with schema extensions`));
    assert.match(sql, new RegExp(`'${extension}'`));
  }
  assert.match(sql, /to_regtype\('extensions\.geometry'\)/);
  assert.match(sql, /gist_geometry_ops_2d/);
  assert.match(sql, /gin_trgm_ops/);
  assert.match(sql, /errcode = '42704'/);
  assert.match(sql, /errcode = '3F000'/);
  assert.match(sql, /errcode = '22023'/);
});

test('synthetic proof fixture covers spatial, trigram, RLS, grants and data', async () => {
  const fixture = await readFile(new URL('./supabase-backup-restore-proof-fixture.sql', import.meta.url), 'utf8');
  assert.match(fixture, /extensions\.geometry/);
  assert.match(fixture, /gist_geometry_ops_2d/);
  assert.equal((fixture.match(/gin_trgm_ops/g) ?? []).length, 2);
  assert.match(fixture, /enable row level security/);
  assert.match(fixture, /create policy/);
  assert.match(fixture, /grant select/);
  assert.match(fixture, /insert into public\.cmm_backup_restore_fixture/);
});
