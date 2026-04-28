#!/usr/bin/env node
/**
 * Script d'analyse des fichiers volumineux
 * Identifie les candidats à la modularisation
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const TARGET_DIR = './apps/web/src';
const THRESHOLDS = {
  critical: 15000,  // > 15KB
  high: 10000,      // > 10KB
  medium: 7000,     // > 7KB
};

const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

function analyzeFile(filePath) {
  const stats = statSync(filePath);
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').length;
  
  return {
    path: filePath,
    size: stats.size,
    lines,
    imports: (content.match(/^import /gm) || []).length,
    exports: (content.match(/^export /gm) || []).length,
    components: (content.match(/function \w+|const \w+ = |class \w+/g) || []).length,
  };
}

function scanDirectory(dir, results = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      scanDirectory(fullPath, results);
    } else if (entry.isFile() && EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      const analysis = analyzeFile(fullPath);
      if (analysis.size > THRESHOLDS.medium) {
        results.push(analysis);
      }
    }
  }
  
  return results;
}

function getPriority(size) {
  if (size > THRESHOLDS.critical) return '🔴 CRITIQUE';
  if (size > THRESHOLDS.high) return '🟡 HAUTE';
  return '🟢 MOYENNE';
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// Analyse
console.log('🔍 Analyse des fichiers volumineux...\n');

const results = scanDirectory(TARGET_DIR);
results.sort((a, b) => b.size - a.size);

console.log(`📊 ${results.length} fichiers identifiés\n`);
console.log('─'.repeat(100));

results.forEach((file, index) => {
  const priority = getPriority(file.size);
  const relativePath = relative(process.cwd(), file.path);
  
  console.log(`${index + 1}. ${priority} ${relativePath}`);
  console.log(`   Taille: ${formatBytes(file.size)} | Lignes: ${file.lines} | Composants: ${file.components}`);
  console.log('');
});

console.log('─'.repeat(100));
console.log('\n💡 Recommandations:');
console.log('   - Fichiers CRITIQUES (>15KB): Modulariser immédiatement');
console.log('   - Fichiers HAUTE priorité (>10KB): Planifier modularisation');
console.log('   - Fichiers MOYENNE priorité (>7KB): Surveiller croissance');
console.log('\n📖 Voir MODULARIZATION_PLAN.md pour le plan détaillé\n');
