import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { analyzeFile } from './generate-modularization-report.mjs';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmm-mod-report-'));

try {
  const targetFile = path.join(tempDir, 'widget.tsx');
  fs.writeFileSync(
    targetFile,
    `import React from 'react';\nexport const Widget = () => null;\n`,
    'utf8',
  );

  const info = analyzeFile(targetFile);

  assert.equal(info.exists, true);
  assert.equal(info.size, Buffer.byteLength(`import React from 'react';\nexport const Widget = () => null;\n`, 'utf8'));
  assert.equal(info.lines, 3);
  assert.equal(info.imports, 1);
  assert.equal(info.exports, 1);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
