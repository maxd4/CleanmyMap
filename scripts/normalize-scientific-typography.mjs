import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const reportFile = path.join(rootDir, 'documentation', 'plans', 'rapport_impact', 'impact_IA.md');

function formatThousands(value) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function protectSegments(line) {
  const placeholders = [];
  const protectedLine = line
    .replace(/`[^`]*`/g, (match) => {
      const token = `@@CODE_${placeholders.length}@@`;
      placeholders.push(match);
      return token;
    })
    .replace(/https?:\/\/[^\s)]+/g, (match) => {
      const token = `@@URL_${placeholders.length}@@`;
      placeholders.push(match);
      return token;
    });

  return {
    protectedLine,
    restore(value) {
      return placeholders.reduce((acc, match, index) => acc.replaceAll(`@@CODE_${index}@@`, match).replaceAll(`@@URL_${index}@@`, match), value);
    },
  };
}

function normalizeText(text) {
  let output = text;

  output = output.replace(/\bMtCO2e\b/g, 'MtCO₂e');
  output = output.replace(/\bMtCO2\b/g, 'MtCO₂');
  output = output.replace(/\bkgCO2e\b/g, 'kgCO₂e');
  output = output.replace(/\bgCO2e\b/g, 'gCO₂e');
  output = output.replace(/\bCO2e\b/g, 'CO₂e');
  output = output.replace(/\bCO2\b/g, 'CO₂');
  output = output.replace(/\bH2O\b/g, 'H₂O');
  output = output.replace(/\bkm2\b/g, 'km²');
  output = output.replace(/\bm3\b/g, 'm³');

  output = output.replace(/(\d[\d ]*)(?=\s?(?:kWh|TWh\/an|kgCO₂e|gCO₂e|MtCO₂e|L|km|Go|Mo|%|€|\$|dollars?|euros?|USD|EUR)\b)/g, (match) => formatThousands(match.trim()));

  output = output.replace(/(\d[\d ]*)(?:\s?)(kWh|TWh\/an|kgCO₂e|gCO₂e|MtCO₂e|L|km|Go|Mo)\b/g, (_, number, unit) => `${formatThousands(number.trim())} ${unit}`);
  output = output.replace(/(\d[\d ]*)(?:\s?)(%)(?![^\s])/g, (_, number, unit) => `${formatThousands(number.trim())} ${unit}`);
  output = output.replace(/(\d[\d ]*)(?:\s?)(?:dollars?|USD)\b/gi, (_, number) => `${formatThousands(number.trim())} $`);
  output = output.replace(/(\d[\d ]*)(?:\s?)(?:euros?|EUR)\b/gi, (_, number) => `${formatThousands(number.trim())} €`);
  output = output.replace(/(\d[\d ]*)(?:\s?)(\$)\b/g, (_, number, unit) => `${formatThousands(number.trim())} ${unit}`);
  output = output.replace(/(\d[\d ]*)(?:\s?)(€)\b/g, (_, number, unit) => `${formatThousands(number.trim())} ${unit}`);

  output = output.replace(/(\d)\s?%/g, '$1 %');
  output = output.replace(/(\d)\s?kWh\b/g, '$1 kWh');
  output = output.replace(/(\d)\s?TWh\/an\b/g, '$1 TWh/an');
  output = output.replace(/(\d)\s?kgCO₂e\b/g, '$1 kgCO₂e');
  output = output.replace(/(\d)\s?gCO₂e\b/g, '$1 gCO₂e');
  output = output.replace(/(\d)\s?MtCO₂e\b/g, '$1 MtCO₂e');
  output = output.replace(/(\d)\s?L\b/g, '$1 L');
  output = output.replace(/(\d)\s?km\b/g, '$1 km');
  output = output.replace(/(\d)\s?Go\b/g, '$1 Go');
  output = output.replace(/(\d)\s?Mo\b/g, '$1 Mo');

  return output;
}

function normalizeMarkdownSection(section) {
  const lines = section.split(/\r?\n/);
  let inFence = false;

  return lines
    .map((line) => {
      if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) {
        inFence = !inFence;
        return line;
      }

      if (inFence) {
        return line;
      }

      const protectedLine = protectSegments(line);
      const replaced = normalizeText(protectedLine.protectedLine);
      return protectedLine.restore(replaced);
    })
    .join('\n');
}

const original = fs.readFileSync(reportFile, 'utf8');
const bibliographyToken = '\n# Bibliographie';
const splitIndex = original.indexOf(bibliographyToken);

if (splitIndex === -1) {
  throw new Error('Bibliography section not found in report.');
}

const prefix = original.slice(0, splitIndex);
const suffix = original.slice(splitIndex);
const updated = normalizeMarkdownSection(prefix) + suffix;

fs.writeFileSync(reportFile, updated, 'utf8');
console.log('Scientific typography normalized.');
