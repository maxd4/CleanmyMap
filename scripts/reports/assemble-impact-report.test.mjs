import assert from 'node:assert/strict';
import test from 'node:test';

import { readImpactReportAssemblyEntries } from './impact-report-files.mjs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');

test('assembles the current modular report in the canonical reading order', () => {
  const result = spawnSync(
    process.execPath,
    ['scripts/reports/assemble-impact-report.mjs'],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr);
  const output = result.stdout;
  assert.match(output, /# Résumé exécutif/);
  assert.match(output, /# Partie I — Cadre/);
  assert.match(output, /# Foire aux questions/);
  assert.match(output, /# Partie II — Empreinte environnementale/);
  assert.match(output, /# Partie III — Impacts sociaux/);
  assert.match(output, /# Partie XIII — Conclusion institutionnelle/);
  assert.match(output, /# Annexe A|## Annexe A/);
  assert.match(output, /# Bibliographie/);
  assert.doesNotMatch(output, /SYNTHÈSE À COMPLÉTER MANUELLEMENT/);

  const markers = [
    '# Partie I —',
    '# Foire aux questions',
    'Entrypoint structurel de la Partie II',
    '## Partie II-A —',
    'Cette partie applique le cadre méthodologique',
    '## Partie II-B —',
    '# Partie III —',
    '# Partie IV —',
    '# Partie V —',
    '# Partie VI —',
    '# Partie VII —',
    '# Partie VIII —',
    '# Partie IX —',
    '# Partie X —',
    '# Partie XI —',
    '# Partie XII —',
    '# Partie XIII —',
    '## Annexe A —',
    '## Annexe B —',
    '## Annexe C —',
    '## Annexe D —',
    '# Bibliographie',
  ];
  const positions = markers.map((marker) => output.indexOf(marker));
  for (const [index, position] of positions.entries()) {
    assert.notEqual(position, -1, `Missing assembly marker ${markers[index]}`);
  }
  assert.deepEqual(positions, positions.toSorted((a, b) => a - b));

  for (const entry of readImpactReportAssemblyEntries()) {
    const firstHeading = entry.text.match(/^#{1,2} .+$/m)?.[0];
    assert.ok(firstHeading, `Missing heading for ${entry.key}`);
    assert.ok(output.includes(firstHeading), `Missing fragment ${entry.relativePath}`);
  }
});
