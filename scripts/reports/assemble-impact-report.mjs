import fs from 'node:fs';
import path from 'node:path';
import {
  absoluteReportPath,
  impactReportMaster,
  readImpactReportAssemblyEntries,
} from './impact-report-files.mjs';

const assembledReportOutputRoot = path.resolve('artifacts/assembled-reports');

function findSymlinkInPath(targetPath) {
  const absolutePath = path.resolve(targetPath);
  const filesystemRoot = path.parse(absolutePath).root;
  let currentPath = absolutePath;

  while (currentPath !== filesystemRoot) {
    try {
      if (fs.lstatSync(currentPath).isSymbolicLink()) return currentPath;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) break;
    currentPath = parentPath;
  }

  return null;
}

function assertNoSymlinkInPath(targetPath) {
  const symlinkPath = findSymlinkInPath(targetPath);
  if (symlinkPath) {
    throw new Error(`--output cannot traverse a symbolic link: ${symlinkPath}`);
  }
}

function resolveOutputPath(value) {
  const resolved = path.resolve(value);
  if (
    path.dirname(resolved) !== assembledReportOutputRoot ||
    path.basename(resolved) === '.' ||
    path.basename(resolved) === '..'
  ) {
    throw new Error(`--output must be a file directly under ${path.relative(process.cwd(), assembledReportOutputRoot)}.`);
  }
  assertNoSymlinkInPath(assembledReportOutputRoot);
  assertNoSymlinkInPath(resolved);
  if (fs.existsSync(resolved) && fs.lstatSync(resolved).isSymbolicLink()) {
    throw new Error(`--output cannot overwrite a symbolic link: ${resolved}`);
  }
  return resolved;
}

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
  const resolvedOutputPath = resolveOutputPath(outputPath);
  fs.mkdirSync(assembledReportOutputRoot, { recursive: true });
  assertNoSymlinkInPath(resolvedOutputPath);
  fs.writeFileSync(resolvedOutputPath, assembled, 'utf8');
} else if (process.argv.length > 2) {
  throw new Error('Usage: node scripts/reports/assemble-impact-report.mjs [--output <path>]');
} else {
  process.stdout.write(assembled);
}
