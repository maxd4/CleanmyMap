import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { analyzeFile, buildReport } from './generate-modularization-report.mjs';

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

  const report = buildReport({
    target: 'apps/web/src/widget.tsx',
    baseRef: 'base-sha',
    finalRef: 'final-sha',
    kind: 'runtime',
    architectureDecision: 'COHESIVE_SINGLE_FILE',
    structuralProblem: 'none',
    extractedResponsibilities: 'none',
    publicContractsPreserved: 'yes',
    beforeLines: 2,
    beforeBytes: 10,
    afterLines: 2,
    afterBytes: 10,
    targetedTests: 'PASS',
    typecheck: 'PASS',
    lint: 'PASS',
    heavyFiles: 'PASS',
    remainingDebt: 'none',
  });

  for (const field of [
    'TARGET', 'BASE_REF', 'FINAL_REF', 'KIND',
    'ARCHITECTURE_DECISION', 'STRUCTURAL_PROBLEM',
    'EXTRACTED_RESPONSIBILITIES', 'PUBLIC_CONTRACTS_PRESERVED',
    'BEFORE_LINES', 'BEFORE_BYTES', 'AFTER_LINES', 'AFTER_BYTES',
    'TARGETED_TESTS', 'TYPECHECK', 'LINT', 'HEAVY_FILES', 'REMAINING_DEBT',
  ]) {
    assert.match(report, new RegExp(`^${field}:`, 'm'));
  }

  assert.doesNotMatch(report, /index\.ts|réduction|haute priorité|modulariser immédiatement/i);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
