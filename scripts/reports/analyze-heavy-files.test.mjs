import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';

import { getRadarGroups, HEAVY_REPORT_SCAN_ROOTS, scanDirectory } from './analyze-heavy-files.mjs';
import { TOP_HEAVY_SCAN_ROOTS } from '../checks/top-heavy-measurement.mjs';

test('le rapport informatif reprend exactement les roots top-heavy', () => {
  assert.deepEqual(HEAVY_REPORT_SCAN_ROOTS, TOP_HEAVY_SCAN_ROOTS);
  assert.deepEqual(HEAVY_REPORT_SCAN_ROOTS, ['apps/web/src', 'apps/mobile']);
});

test('les catégories mobile, tests, data/config et generated restent distinctes', () => {
  const rows = [
    { file: 'apps/mobile/screens/large.tsx', kind: 'runtime', lines: 501, bytes: 1_000, generated: false },
    { file: 'apps/mobile/tests/large.test.ts', kind: 'test', lines: 1_001, bytes: 1_000, generated: false },
    { file: 'apps/mobile/data/catalog.ts', kind: 'data/config', lines: 801, bytes: 1_000, generated: false },
    { file: 'apps/mobile/generated/manual.ts', kind: 'generated', lines: 2_000, bytes: 1_000, generated: false },
    { file: 'apps/mobile/generated/proven.ts', kind: 'generated', lines: 2_000, bytes: 1_000, generated: true },
  ];
  const groups = getRadarGroups(rows);
  assert.deepEqual(groups.architectural.map((row) => row.file), [
    'apps/mobile/data/catalog.ts',
    'apps/mobile/screens/large.tsx',
  ]);
  assert.deepEqual(groups.tests.map((row) => row.file), ['apps/mobile/tests/large.test.ts']);
  assert.deepEqual(groups.generated.map((row) => row.file), [
    'apps/mobile/generated/manual.ts',
    'apps/mobile/generated/proven.ts',
  ]);
  assert.equal(groups.architectural.some((row) => row.kind === 'generated'), false);
});

test('heavy-file analysis reports the fixture thresholds', () => {
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmm-heavy-files-'));

try {
  const srcDir = path.join(tempDir, 'apps/web/src');
  fs.mkdirSync(path.join(srcDir, 'nested'), { recursive: true });

  const largeFile = path.join(srcDir, 'nested', 'Large.tsx');
  const smallFile = path.join(srcDir, 'nested', 'Small.tsx');

  fs.writeFileSync(
    largeFile,
    `import React from 'react';\n${'export const A = 1;\n'.repeat(510)}`,
    'utf8',
  );
  fs.writeFileSync(
    smallFile,
    `export const B = 1;\n`,
    'utf8',
  );

  const results = scanDirectory(srcDir);

  assert.equal(results.length, 1);
  assert.equal(results[0].path, largeFile);
  assert.equal(results[0].size > 0, true);
  assert.equal(results[0].lines > 500, true);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
});
