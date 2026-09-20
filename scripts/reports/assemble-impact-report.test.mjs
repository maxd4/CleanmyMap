import assert from 'node:assert/strict';
import test from 'node:test';

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import {
  absoluteReportPath,
  impactReportMaster,
  impactReportParts,
  readImpactReportAssemblyEntries,
} from './impact-report-files.mjs';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');
const mainPartKeys = [
  'part-i',
  'part-ii-index',
  'part-iii',
  'part-iv',
  'part-v',
  'part-vi',
  'part-vii',
  'part-viii',
  'part-ix',
  'part-x',
  'part-xi',
  'part-xii',
  'part-xiii',
];
const mainPartOrder = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'];
const placeholder = '<!-- SYNTHÈSE À COMPLÉTER MANUELLEMENT -->';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readMaster() {
  const masterPath = absoluteReportPath(impactReportMaster);
  assert.equal(fs.existsSync(masterPath), true, 'MASTER file is missing');
  return fs.readFileSync(masterPath, 'utf8');
}

function masterPartSections(master) {
  return [...master.matchAll(/^# Partie (I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII) —[^\n]+/gm)].map(
    (match, index, matches) => ({
      part: match[1],
      anchor: match[0].match(/\{#([^}]+)\}/)?.[1] ?? null,
      text: master.slice(match.index, matches[index + 1]?.index ?? master.length),
    }),
  );
}

test('assembles the current modular report in the canonical reading order', () => {
  const result = spawnSync(
    process.execPath,
    ['scripts/reports/assemble-impact-report.mjs'],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr);
  const output = result.stdout;
  assert.match(output, /^---\s*\ntitle:/m);
  assert.match(output, /# Résumé exécutif/);
  assert.match(output, /# Partie I — Cadre/);
  assert.match(output, /# Foire aux questions/);
  assert.match(output, /# Partie II — Empreinte environnementale/);
  assert.match(output, /# Partie III — Impacts sociaux/);
  assert.match(output, /# Partie XIII — Conclusion institutionnelle/);
  assert.match(output, /# Annexe A|## Annexe A/);
  assert.match(output, /# Bibliographie/);
  assert.doesNotMatch(output, /SYNTHÈSE À COMPLÉTER MANUELLEMENT/);
  assert.equal((output.match(/^# Bibliographie(?: \{[^}]+\})?$/gm) ?? []).length, 1);
  assert.equal((output.match(/^## Annexe [A-D] —/gm) ?? []).length, 4);

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
    const expectedHeading =
      entry.key === 'part-ii-a'
        ? firstHeading.replace(
            /^# Partie II — Empreinte environnementale et matérielle \{#partie-ii-empreinte-environnementale-et-materielle\}$/,
            '## Partie II-A — Empreinte environnementale de CleanMyMap {#partie-ii-a-empreinte-environnementale-cleanmymap}',
          )
        : entry.key === 'part-ii-b'
          ? firstHeading.replace(/^# /, '## ')
          : firstHeading;
    const occurrences = output.match(new RegExp(`^${escapeRegExp(expectedHeading)}$`, 'gm')) ?? [];
    assert.equal(occurrences.length, 1, `Expected exactly one assembled occurrence for ${entry.relativePath}`);
  }
});

test('guards the MASTER contract and canonical assembly mapping', () => {
  const master = readMaster();
  const sections = masterPartSections(master);
  const links = sections.map((section) => {
    const match = section.text.match(
      /\[Lire la Partie (I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII) détaillée\]\(([^)]+)\)/,
    );
    assert.ok(match, `Missing MASTER link for Partie ${section.part}`);
    return { part: match[1], link: match[2] };
  });
  const expectedLinks = mainPartKeys.map((key) =>
    `./${path.posix.relative(path.posix.dirname(impactReportMaster), impactReportParts[key])}`,
  );

  assert.deepEqual(sections.map((section) => section.part), mainPartOrder);
  assert.equal(sections.length, 13, 'MASTER must contain exactly 13 main parts');
  assert.equal(new Set(sections.map((section) => section.part)).size, 13, 'MASTER parts must be unique');
  assert.equal(sections.every((section) => section.anchor), true, 'Every MASTER part needs an explicit anchor');
  assert.equal(new Set(sections.map((section) => section.anchor)).size, 13, 'MASTER anchors must be unique');
  assert.equal(master.match(new RegExp(placeholder, 'g'))?.length ?? 0, 13);
  assert.deepEqual(links.map((entry) => entry.part), mainPartOrder);
  assert.deepEqual(links.map((entry) => entry.link), expectedLinks);

  for (const [index, section] of sections.entries()) {
    const headingEnd = section.text.indexOf('\n') + 1;
    const placeholderIndex = section.text.indexOf(placeholder);
    assert.ok(placeholderIndex >= headingEnd, `Missing placeholder for Partie ${section.part}`);
    assert.match(section.text.slice(headingEnd, placeholderIndex), /^\s*$/);
    assert.equal(links[index].part, section.part);
  }

  for (const [key, relativePath] of mainPartKeys.map((key) => [key, impactReportParts[key]])) {
    assert.ok(relativePath, `Missing canonical mapping for ${key}`);
    assert.equal(path.isAbsolute(relativePath), false, `Absolute path in mapping for ${key}`);
    assert.equal(relativePath.includes('..'), false, `Traversal path in mapping for ${key}`);
    assert.equal(fs.existsSync(absoluteReportPath(relativePath)), true, `Missing main sheet for ${key}`);
  }

  for (const { link } of links) {
    assert.equal(path.posix.isAbsolute(link), false, `Absolute MASTER link: ${link}`);
    assert.equal(link.includes('..'), false, `Traversal MASTER link: ${link}`);
    assert.equal(
      fs.existsSync(path.resolve(path.dirname(absoluteReportPath(impactReportMaster)), link)),
      true,
      `Broken MASTER link: ${link}`,
    );
  }

  const referencedMainSheets = new Set(
    links.map(({ link }) => path.posix.normalize(path.posix.join(path.posix.dirname(impactReportMaster), link))),
  );
  assert.deepEqual(referencedMainSheets, new Set(mainPartKeys.map((key) => impactReportParts[key])));

  const assemblyKeys = new Set(readImpactReportAssemblyEntries().map((entry) => entry.key));
  for (const key of ['faq', 'part-ii-a', 'part-ii-b', 'annex-a', 'annex-b', 'annex-c', 'annex-d']) {
    assert.equal(assemblyKeys.has(key), true, `Assembly mapping lost ${key}`);
  }
  assert.equal(assemblyKeys.has('part-xiv'), false);
  assert.equal(assemblyKeys.has('part-xv'), false);
});

test('guards the assembled report against duplicate explicit anchors and placeholders', () => {
  const result = spawnSync(
    process.execPath,
    ['scripts/reports/assemble-impact-report.mjs'],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr);
  const anchors = [...result.stdout.matchAll(/^#{1,6} .*?\{#([^}]+)\}/gm)].map((match) => match[1]);
  assert.equal(new Set(anchors).size, anchors.length, 'Assembled report contains duplicate explicit anchors');
  assert.doesNotMatch(result.stdout, /SYNTHÈSE À COMPLÉTER MANUELLEMENT/);
});
