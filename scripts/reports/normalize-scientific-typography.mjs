import fs from 'fs';
import { readImpactReportDocuments } from './impact-report-files.mjs';

function formatThousands(value) {
  return value.split(' ').map((part) => {
    let result = '';
    for (let index = 0; index < part.length; index += 1) {
      if (index > 0 && (part.length - index) % 3 === 0) result += ' ';
      result += part[index];
    }
    return result;
  }).join(' ');
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

  for (const [source, replacement] of [['MtCO2e', 'MtCO₂e'], ['MtCO2', 'MtCO₂'], ['kgCO2e', 'kgCO₂e'], ['gCO2e', 'gCO₂e'], ['CO2e', 'CO₂e'], ['CO2', 'CO₂'], ['H2O', 'H₂O'], ['km2', 'km²'], ['m3', 'm³']]) {
    output = output.replaceAll(source, replacement);
  }
  output = normalizeMetricUnits(output);

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

function normalizeMetricUnits(text) {
  const units = [
    ['TWh/an', 'TWh/an'], ['kgCO₂e', 'kgCO₂e'], ['gCO₂e', 'gCO₂e'], ['MtCO₂e', 'MtCO₂e'],
    ['dollars', '$'], ['dollar', '$'], ['USD', '$'], ['euros', '€'], ['euro', '€'], ['EUR', '€'],
    ['kWh', 'kWh'], ['L', 'L'], ['km', 'km'], ['Go', 'Go'], ['Mo', 'Mo'], ['%', '%'], ['$', '$'], ['€', '€'],
  ];
  let output = '';
  let cursor = 0;
  while (cursor < text.length) {
    const code = text.charCodeAt(cursor);
    if (code < 48 || code > 57) {
      output += text[cursor++];
      continue;
    }
    const numberStart = cursor;
    while (cursor < text.length && ((text.charCodeAt(cursor) >= 48 && text.charCodeAt(cursor) <= 57) || text[cursor] === ' ')) cursor += 1;
    const number = text.slice(numberStart, cursor).trim();
    let unitStart = cursor;
    while (text[unitStart] === ' ' || text[unitStart] === '\t') unitStart += 1;
    const candidate = units.find(([unit]) => text.slice(unitStart, unitStart + unit.length).toLowerCase() === unit.toLowerCase());
    if (!candidate) {
      output += text.slice(numberStart, unitStart);
      cursor = unitStart;
      continue;
    }
    const unitEnd = unitStart + candidate[0].length;
    const following = text[unitEnd] ?? '';
    if (/[A-Za-z0-9_]/.test(following) && /[A-Za-z0-9_]/.test(candidate[0].at(-1) ?? '')) {
      output += text.slice(numberStart, unitStart);
      cursor = unitStart;
      continue;
    }
    output += `${formatThousands(number)} ${candidate[1]}`;
    cursor = unitEnd;
  }
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

for (const document of readImpactReportDocuments()) {
  const bibliographyToken = '\n# Bibliographie';
  const splitIndex = document.text.indexOf(bibliographyToken);
  const prefix = splitIndex === -1 ? document.text : document.text.slice(0, splitIndex);
  const suffix = splitIndex === -1 ? '' : document.text.slice(splitIndex);
  const updated = normalizeMarkdownSection(prefix) + suffix;

  if (updated !== document.text) {
    fs.writeFileSync(document.absolutePath, updated, 'utf8');
  }
}

console.log('Scientific typography normalized.');
