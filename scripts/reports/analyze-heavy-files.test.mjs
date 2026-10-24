import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';

import { getRadarGroups, HEAVY_REPORT_SCAN_ROOTS, scanDirectory } from './analyze-heavy-files.mjs';
import { TOP_HEAVY_SCAN_ROOTS } from '../checks/top-heavy-measurement.mjs';
import { isAboveReview, isExcludedGeneratedRow, isInPreventiveZone } from '../checks/top-heavy-policy.mjs';

test('le rapport informatif reprend exactement les roots top-heavy', () => {
  assert.deepEqual(HEAVY_REPORT_SCAN_ROOTS, TOP_HEAVY_SCAN_ROOTS);
  assert.deepEqual(HEAVY_REPORT_SCAN_ROOTS, ['apps/web/src', 'apps/mobile']);
});

test('generated reste exclusivement dans sa section, quel que soit le seuil ou la preuve de régénérabilité', () => {
  const rows = [
    { file: 'apps/mobile/screens/large.tsx', kind: 'runtime', lines: 501, bytes: 1_000, generated: false },
    { file: 'apps/mobile/tests/large.test.ts', kind: 'test', lines: 1_001, bytes: 1_000, generated: false },
    { file: 'apps/mobile/data/catalog.ts', kind: 'data/config', lines: 801, bytes: 1_000, generated: false },
    { file: 'apps/mobile/generated/manual-small.ts', kind: 'generated', lines: 400, bytes: 1_000, generated: false },
    { file: 'apps/mobile/generated/manual-large.ts', kind: 'generated', lines: 1_200, bytes: 1_000, generated: false },
    { file: 'apps/mobile/generated/proven-small.ts', kind: 'generated', lines: 400, bytes: 1_000, generated: true },
    { file: 'apps/mobile/generated/proven-large.ts', kind: 'generated', lines: 1_200, bytes: 1_000, generated: true },
  ];
  const groups = getRadarGroups(rows);
  const generatedFiles = rows.filter((row) => row.kind === 'generated').map((row) => row.file);
  assert.deepEqual(groups.architectural.map((row) => row.file), ['apps/mobile/data/catalog.ts', 'apps/mobile/screens/large.tsx']);
  assert.deepEqual(groups.tests.map((row) => row.file), ['apps/mobile/tests/large.test.ts']);
  assert.deepEqual(groups.generated.map((row) => row.file), [
    'apps/mobile/generated/manual-large.ts',
    'apps/mobile/generated/proven-large.ts',
    'apps/mobile/generated/manual-small.ts',
    'apps/mobile/generated/proven-small.ts',
  ]);
  for (const groupName of ['preventive', 'architectural', 'tests']) {
    assert.deepEqual(groups[groupName].filter((row) => row.kind === 'generated'), [], groupName);
  }
  assert.deepEqual(
    groups.generated.map((row) => row.file).sort(),
    generatedFiles.sort(),
  );

  const manualSmall = rows.find((row) => row.file.endsWith('manual-small.ts'));
  const manualLarge = rows.find((row) => row.file.endsWith('manual-large.ts'));
  const provenSmall = rows.find((row) => row.file.endsWith('proven-small.ts'));
  const provenLarge = rows.find((row) => row.file.endsWith('proven-large.ts'));
  assert.equal(isInPreventiveZone(manualSmall), true);
  assert.equal(isAboveReview(manualLarge), true);
  assert.equal(isExcludedGeneratedRow(manualSmall), false);
  assert.equal(isExcludedGeneratedRow(manualLarge), false);
  assert.equal(isExcludedGeneratedRow(provenSmall), true);
  assert.equal(isExcludedGeneratedRow(provenLarge), true);
  assert.equal(isInPreventiveZone(provenLarge), false);
  assert.equal(isAboveReview(provenLarge), false);
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
