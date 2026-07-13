import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { scanDirectory } from './analyze-heavy-files.mjs';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmm-heavy-files-'));

try {
  const srcDir = path.join(tempDir, 'apps/web/src');
  fs.mkdirSync(path.join(srcDir, 'nested'), { recursive: true });

  const largeFile = path.join(srcDir, 'nested', 'Large.tsx');
  const smallFile = path.join(srcDir, 'nested', 'Small.tsx');

  fs.writeFileSync(
    largeFile,
    `import React from 'react';\n${'export const A = 1;\n'.repeat(450)}`,
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
  assert.equal(results[0].size > 7000, true);
  assert.equal(results[0].lines > 400, true);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
