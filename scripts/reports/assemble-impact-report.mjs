import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  absoluteReportPath,
  impactReportMaster,
  readImpactReportAssemblyEntries,
} from './impact-report-files.mjs';

const assembledReportOutputRoot = path.resolve('artifacts/assembled-reports');

function findSymlinkInPath(targetPath, fsApi = fs) {
  const absolutePath = path.resolve(targetPath);
  const filesystemRoot = path.parse(absolutePath).root;
  let currentPath = absolutePath;

  while (currentPath !== filesystemRoot) {
    try {
      if (fsApi.lstatSync(currentPath).isSymbolicLink()) return currentPath;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) break;
    currentPath = parentPath;
  }

  return null;
}

function assertNoSymlinkInPath(targetPath, fsApi = fs) {
  const symlinkPath = findSymlinkInPath(targetPath, fsApi);
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

function removeTemporaryOutput(tempPath, outputDirectory, outputDirectoryRealPath, fsApi) {
  try {
    assertNoSymlinkInPath(outputDirectory, fsApi);
    if (fsApi.realpathSync(outputDirectory) !== outputDirectoryRealPath) return;
    fsApi.rmSync(tempPath, { force: true });
  } catch (error) {
    if (error?.code !== 'ENOENT') return;
  }
}

/**
 * Write through an exclusive temporary file and replace the output directory
 * entry with rename. The final rename does not follow a target symlink, so a
 * target substituted after validation is replaced rather than written through.
 * Node does not expose portable openat/renameat or Windows no-follow flags;
 * the output directory is therefore revalidated immediately before rename.
 */
export function writeAssemblyOutput(outputPath, contents, fsApi = fs) {
  const outputDirectory = path.dirname(outputPath);
  assertNoSymlinkInPath(outputDirectory, fsApi);
  const outputDirectoryRealPath = fsApi.realpathSync(outputDirectory);
  const tempPath = path.join(
    outputDirectory,
    `.${path.basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let tempFd;

  try {
    const exclusiveCreateFlags = fsApi.constants.O_CREAT | fsApi.constants.O_EXCL | fsApi.constants.O_WRONLY;
    tempFd = fsApi.openSync(tempPath, exclusiveCreateFlags, 0o600);
    fsApi.writeFileSync(tempFd, contents, 'utf8');
    fsApi.fsyncSync(tempFd);
    fsApi.closeSync(tempFd);
    tempFd = undefined;

    assertNoSymlinkInPath(outputDirectory, fsApi);
    if (fsApi.realpathSync(outputDirectory) !== outputDirectoryRealPath) {
      throw new Error('--output directory changed while the report was being written.');
    }
    assertNoSymlinkInPath(outputPath, fsApi);
    fsApi.renameSync(tempPath, outputPath);
  } finally {
    if (tempFd !== undefined) fsApi.closeSync(tempFd);
    removeTemporaryOutput(tempPath, outputDirectory, outputDirectoryRealPath, fsApi);
  }
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

export function main(args = process.argv.slice(2)) {
  if (args[0] === '--output') {
    const outputPath = args[1];
    if (!outputPath) {
      throw new Error('--output requires a file path.');
    }
    const resolvedOutputPath = resolveOutputPath(outputPath);
    fs.mkdirSync(assembledReportOutputRoot, { recursive: true });
    assertNoSymlinkInPath(resolvedOutputPath);
    writeAssemblyOutput(resolvedOutputPath, assembled);
  } else if (args.length > 0) {
    throw new Error('Usage: node scripts/reports/assemble-impact-report.mjs [--output <path>]');
  } else {
    process.stdout.write(assembled);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
