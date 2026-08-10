const assert = require('node:assert/strict');

const {
  generateMarkdownReport,
  matchFileToRubrique,
  normalizeFilePath,
  parseLintOutput,
} = require('./lint-audit-direct.js');

assert.equal(
  normalizeFilePath('C:\\repo\\apps\\web\\src\\components\\dashboard\\page.tsx'),
  'C:/repo/apps/web/src/components/dashboard/page.tsx',
);

assert.equal(
  matchFileToRubrique('C:\\repo\\apps\\web\\src\\app\\(app)\\dashboard\\page.tsx'),
  'dashboard',
);

const diagnostics = parseLintOutput(`
C:\\repo\\apps\\web\\src\\components\\dashboard\\page.tsx
  12:3  warning  Unexpected any  @typescript-eslint/no-explicit-any
  18:5  error  React Hook issue  react-hooks/set-state-in-effect
`);

assert.deepEqual(diagnostics, [
  {
    file: 'C:/repo/apps/web/src/components/dashboard/page.tsx',
    line: 12,
    column: 3,
    type: 'warning',
    message: 'Unexpected any',
    ruleId: '@typescript-eslint/no-explicit-any',
    severity: 'high',
  },
  {
    file: 'C:/repo/apps/web/src/components/dashboard/page.tsx',
    line: 18,
    column: 5,
    type: 'error',
    message: 'React Hook issue',
    ruleId: 'react-hooks/set-state-in-effect',
    severity: 'critical',
  },
]);

const cleanReport = generateMarkdownReport([]);
assert.equal(cleanReport.endsWith('\n\n'), false);
assert.equal(cleanReport.includes('  \n'), false);
