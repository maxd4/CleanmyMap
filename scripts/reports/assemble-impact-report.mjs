import fs from 'node:fs';
import {
  absoluteReportPath,
  impactReportMaster,
  readImpactReportAssemblyEntries,
} from './impact-report-files.mjs';

const masterText = fs.readFileSync(absoluteReportPath(impactReportMaster), 'utf8');
const bibliographyMarker = '\n# Bibliographie';
const firstPartMarker = '\n# Partie I';
const firstPartIndex = masterText.indexOf(firstPartMarker);
const bibliographyIndex = masterText.indexOf(bibliographyMarker);

if (firstPartIndex === -1 || bibliographyIndex === -1 || firstPartIndex >= bibliographyIndex) {
  throw new Error('MASTER must contain an introduction, the modular body and a bibliography section.');
}

const introduction = masterText.slice(0, firstPartIndex).trimEnd();
const bibliography = masterText.slice(bibliographyIndex).trimStart();
const entries = readImpactReportAssemblyEntries();

function renderAssemblyEntry(entry) {
  if (entry.key === 'part-ii-a') {
    return entry.text.replace(
      /^# Partie II — Empreinte environnementale et matérielle \{#partie-ii-empreinte-environnementale-et-materielle\}/m,
      '## Partie II-A — Empreinte environnementale de CleanMyMap {#partie-ii-a-empreinte-environnementale-cleanmymap}',
    );
  }

  if (entry.key === 'part-ii-b') {
    return entry.text.replace(/^# Partie II-B — /m, '## Partie II-B — ');
  }

  return entry.text;
}

const assembled = `${introduction}\n\n${entries.map((entry) => renderAssemblyEntry(entry).trim()).join('\n\n')}\n\n${bibliography}\n`;

if (process.argv[2] === '--output') {
  const outputPath = process.argv[3];
  if (!outputPath) {
    throw new Error('--output requires a file path.');
  }
  fs.writeFileSync(outputPath, assembled, 'utf8');
} else if (process.argv.length > 2) {
  throw new Error('Usage: node scripts/reports/assemble-impact-report.mjs [--output <path>]');
} else {
  process.stdout.write(assembled);
}
