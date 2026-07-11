import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const reportFile = path.join(rootDir, 'documentation', 'plans', 'rapport_impact', 'impact_IA.md');
const bodyBibFile = path.join(rootDir, 'documentation', 'plans', 'rapport_impact', 'references.bib');
const annexBibFile = path.join(rootDir, 'documentation', 'plans', 'rapport_impact', 'references_annexes.bib');

function extractCitationKeys(text) {
  const annexIndex = text.indexOf('\n## Annexe A');
  const bodyText = annexIndex === -1 ? text : text.slice(0, annexIndex);
  const keys = new Set();
  const re = /\[@([^\]]+)\]/g;
  let match;

  while ((match = re.exec(bodyText))) {
    const segments = match[1].split(/\s*;\s*/);
    for (const segment of segments) {
      const key = segment.replace(/^@/, '').match(/^([A-Za-z0-9_:-]+)/);
      if (key) {
        keys.add(key[1]);
      }
    }
  }

  return keys;
}

function parseBibEntries(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  let current = [];
  let currentKey = null;

  const pushCurrent = () => {
    if (current.length) {
      entries.push({ key: currentKey, text: current.join('\n') });
      current = [];
      currentKey = null;
    }
  };

  for (const line of lines) {
    const entryStart = line.match(/^@[\w-]+\{([^,]+),\s*$/);
    if (entryStart) {
      pushCurrent();
      currentKey = entryStart[1].trim();
      current.push(line);
      continue;
    }

    if (!current.length && !line.trim()) {
      continue;
    }

    if (!current.length && line.startsWith('@')) {
      const inlineStart = line.match(/^@[\w-]+\{([^,]+),/);
      currentKey = inlineStart ? inlineStart[1].trim() : null;
    }

    current.push(line);

    if (line.trim() === '}') {
      pushCurrent();
    }
  }

  pushCurrent();
  return entries;
}

function splitBib(entries, bodyKeys) {
  const body = [];
  const annexes = [];

  for (const entry of entries) {
    if (bodyKeys.has(entry.key)) {
      body.push(entry.text);
    } else {
      annexes.push(entry.text);
    }
  }

  return { body, annexes };
}

function rewriteReport(reportText) {
  let out = reportText;
  out = out.replace(
    /bibliography:\s*references\.bib\s*\n/,
    'bibliography:\n  - references.bib\n  - references_annexes.bib\n',
  );
  out = out.replace(
    /Les références formelles du rapport sont générées automatiquement via `references\.bib` et les citations `\[@clé\]` intégrées dans le corps du texte\./,
    'Les références formelles du rapport sont générées automatiquement via `references.bib` pour le corps du texte et `references_annexes.bib` pour les annexes, avec les citations `[@clé]` intégrées dans le corps du texte.',
  );
  out = out.replace(
    /bibliography:\s*\n\s*-\s*references\.bib\s*\n(?:\s*-\s*references_annexes\.bib\s*\n)?/,
    'bibliography:\n  - references.bib\n  - references_annexes.bib\n',
  );
  return out;
}

function writeTextAtomic(filePath, contents) {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, contents, 'utf8');
  try {
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    fs.rmSync(filePath, { force: true });
    fs.renameSync(tempPath, filePath);
  }
}

const reportText = fs.readFileSync(reportFile, 'utf8');
const bodyKeys = extractCitationKeys(reportText);
const annexExists = fs.existsSync(annexBibFile);
const annexText = annexExists ? fs.readFileSync(annexBibFile, 'utf8') : '';

if (annexExists && !annexText.trim()) {
  throw new Error('references_annexes.bib is empty; restore it before rerunning split-bibliography.');
}

const sourceParts = [];
if (fs.existsSync(bodyBibFile)) {
  sourceParts.push(fs.readFileSync(bodyBibFile, 'utf8'));
}
if (annexExists && annexText.trim()) {
  sourceParts.push(annexText);
}
const entries = parseBibEntries(sourceParts.join('\n\n'));
const { body, annexes } = splitBib(entries, bodyKeys);

writeTextAtomic(bodyBibFile, `${body.join('\n\n')}\n`);
writeTextAtomic(annexBibFile, `${annexes.join('\n\n')}\n`);
writeTextAtomic(reportFile, rewriteReport(reportText));

console.log(JSON.stringify({
  bodyEntries: body.length,
  annexEntries: annexes.length,
  bodyKeys: [...bodyKeys].length,
}, null, 2));
