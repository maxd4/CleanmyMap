#!/usr/bin/env node
/**
 * Script d'analyse des fichiers volumineux
 * Identifie les candidats à la modularisation
 */

import { readFileSync, readdirSync } from 'fs';
import { join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { HARD_THRESHOLD, REVIEW_THRESHOLD, isAboveThreshold } from '../checks/top-heavy-policy.mjs';

const TARGET_DIR = './apps/web/src';
const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

export function analyzeFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const size = Buffer.byteLength(content, 'utf8');
  const lines = content.split('\n').length;

  return {
    path: filePath,
    size,
    lines,
    imports: (content.match(/^import /gm) || []).length,
    exports: (content.match(/^export /gm) || []).length,
    components: (content.match(/function \w+|const \w+ = |class \w+/g) || []).length,
  };
}

export function scanDirectory(dir, results = []) {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      scanDirectory(fullPath, results);
    } else if (entry.isFile() && EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      const analysis = analyzeFile(fullPath);
      if (isAboveThreshold({ lines: analysis.lines, bytes: analysis.size }, REVIEW_THRESHOLD)) {
        results.push(analysis);
      }
    }
  }

  return results;
}

export function getPriority(size, lines = 0) {
  return isAboveThreshold({ lines, bytes: size }, HARD_THRESHOLD) ? '🔴 HARD' : '🟡 REVIEW_REQUIRED';
}

export function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function main() {
  // Analyse
  console.log('🔍 Analyse des fichiers volumineux...\n');

  const results = scanDirectory(TARGET_DIR);
  results.sort((a, b) => b.size - a.size);

  console.log(`📊 ${results.length} fichiers identifiés\n`);
  console.log('─'.repeat(100));

  results.forEach((file, index) => {
    const priority = getPriority(file.size, file.lines);
    const relativePath = relative(process.cwd(), file.path);

    console.log(`${index + 1}. ${priority} ${relativePath}`);
    console.log(`   Taille: ${formatBytes(file.size)} | Lignes: ${file.lines} | Composants: ${file.components}`);
    console.log('');
  });

  console.log('─'.repeat(100));
  console.log('\n💡 Recommandations:');
  console.log(`   - REVIEW_REQUIRED: >${REVIEW_THRESHOLD.lines} lignes ou >${REVIEW_THRESHOLD.bytes / 1024} KiB; auditer sans split automatique`);
  console.log(`   - HARD: >${HARD_THRESHOLD.lines} lignes ou >${HARD_THRESHOLD.bytes / 1024} KiB; nouveau dépassement bloquant`);
  console.log('\n📖 Voir MODULARIZATION_PLAN.md pour le plan détaillé\n');
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) {
  main();
}
