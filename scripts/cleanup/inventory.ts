/**
 * Script d'inventaire des références dark dans les fichiers cibles.
 *
 * Analyse tous les fichiers cibles et génère un rapport détaillé
 * des références dark à supprimer, sans modifier aucun fichier.
 *
 * Usage :
 *   npx ts-node scripts/cleanup/inventory.ts
 *
 * Requirements: 5.1, 5.5
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  detectDarkReferences,
  detectDarkReferencesInFigma,
  PROJECT_ROOT,
  nowISO,
  writeFile,
} from './utils';
import type { DarkReference, DarkReferenceKind, InventoryReport } from './types';

// ============================================================
// CONFIGURATION
// ============================================================

/** Fichiers cibles à analyser */
const TARGET_FILES: Array<{ path: string; type: 'CSS' | 'JS' | 'FIGMA' }> = [
  { path: 'apps/web/src/app/globals.css', type: 'CSS' },
  { path: 'scripts/upgrade-map-ui.js', type: 'JS' },
  { path: 'scripts/refactor_ui.js', type: 'JS' },
  { path: 'scripts/fix_forms_and_map.js', type: 'JS' },
  { path: 'apps/web/figma-plugin-cleanmymap-templates/code.js', type: 'FIGMA' },
];

/** Répertoire de sortie du rapport */
const REPORT_DIR = 'apps/artifacts/dark-cleanup-backup';

// ============================================================
// ANALYSE
// ============================================================

function analyzeFile(
  filePath: string,
  type: 'CSS' | 'JS' | 'FIGMA'
): DarkReference[] {
  const absolute = path.join(PROJECT_ROOT, filePath);

  if (!fs.existsSync(absolute)) {
    console.warn(`  ⚠️  Fichier introuvable : ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(absolute, 'utf-8');

  if (type === 'FIGMA') {
    return detectDarkReferencesInFigma(filePath, content);
  }

  return detectDarkReferences(filePath, content);
}

function groupByKind(
  refs: DarkReference[]
): Partial<Record<DarkReferenceKind, DarkReference[]>> {
  const result: Partial<Record<DarkReferenceKind, DarkReference[]>> = {};

  for (const ref of refs) {
    if (!result[ref.kind]) {
      result[ref.kind] = [];
    }
    result[ref.kind]!.push(ref);
  }

  return result;
}

function buildSummary(
  byFile: Record<string, DarkReference[]>,
  total: number
): string {
  const lines: string[] = [
    `Inventaire des références dark — ${new Date().toLocaleString('fr-FR')}`,
    `Total : ${total} référence(s) dark détectée(s) dans ${Object.keys(byFile).length} fichier(s)`,
    '',
  ];

  for (const [file, refs] of Object.entries(byFile)) {
    lines.push(`  ${file} : ${refs.length} référence(s)`);
    const byKind = groupByKind(refs);
    for (const [kind, kindRefs] of Object.entries(byKind)) {
      lines.push(`    - ${kind} : ${kindRefs!.length}`);
    }
  }

  return lines.join('\n');
}

// ============================================================
// RAPPORT MARKDOWN
// ============================================================

function buildMarkdownReport(report: InventoryReport): string {
  const lines: string[] = [
    '# Inventaire des références dark — CleanMyMap',
    '',
    `**Généré le** : ${new Date(report.generatedAt).toLocaleString('fr-FR')}`,
    `**Total** : ${report.totalDarkReferences} référence(s) dark dans ${Object.keys(report.byFile).length} fichier(s)`,
    '',
    '---',
    '',
    '## Résumé par fichier',
    '',
  ];

  for (const [file, refs] of Object.entries(report.byFile)) {
    lines.push(`### \`${file}\``);
    lines.push('');
    lines.push(`**${refs.length} référence(s)**`);
    lines.push('');

    const byKind = groupByKind(refs);
    for (const [kind, kindRefs] of Object.entries(byKind)) {
      lines.push(`#### ${kind} (${kindRefs!.length})`);
      lines.push('');
      lines.push('| Ligne | Correspondance | Contenu |');
      lines.push('|-------|---------------|---------|');
      for (const ref of kindRefs!.slice(0, 20)) {
        const content = ref.lineContent.replace(/\|/g, '\\|').slice(0, 80);
        lines.push(`| ${ref.lineNumber} | \`${ref.match}\` | ${content} |`);
      }
      if (kindRefs!.length > 20) {
        lines.push(`| ... | *(${kindRefs!.length - 20} autres)* | |`);
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('## Résumé par type de référence');
  lines.push('');
  lines.push('| Type | Nombre |');
  lines.push('|------|--------|');

  for (const [kind, refs] of Object.entries(report.byKind)) {
    lines.push(`| ${kind} | ${refs!.length} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Plan de nettoyage');
  lines.push('');
  lines.push('Les fichiers suivants nécessitent un nettoyage (par ordre de priorité) :');
  lines.push('');

  const sortedFiles = Object.entries(report.byFile).sort(
    ([, a], [, b]) => b.length - a.length
  );

  for (const [file, refs] of sortedFiles) {
    lines.push(`1. **\`${file}\`** — ${refs.length} référence(s) à supprimer`);
  }

  return lines.join('\n');
}

// ============================================================
// POINT D'ENTRÉE
// ============================================================

function runInventory(): InventoryReport {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  CleanMyMap — Inventaire des références dark             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  const byFile: Record<string, DarkReference[]> = {};
  const allRefs: DarkReference[] = [];

  for (const target of TARGET_FILES) {
    console.log(`Analyse : ${target.path}`);
    const refs = analyzeFile(target.path, target.type);
    byFile[target.path] = refs;
    allRefs.push(...refs);
    console.log(`  → ${refs.length} référence(s) dark trouvée(s)`);
  }

  const byKind = groupByKind(allRefs);
  const summary = buildSummary(byFile, allRefs.length);

  const report: InventoryReport = {
    generatedAt: nowISO(),
    totalDarkReferences: allRefs.length,
    byFile,
    byKind,
    summary,
  };

  // Sauvegarder le rapport JSON
  const jsonPath = path.join(REPORT_DIR, 'inventory.json');
  writeFile(jsonPath, JSON.stringify(report, null, 2));
  console.log('');
  console.log(`Rapport JSON : ${jsonPath}`);

  // Sauvegarder le rapport Markdown
  const mdPath = path.join(REPORT_DIR, 'inventory.md');
  writeFile(mdPath, buildMarkdownReport(report));
  console.log(`Rapport Markdown : ${mdPath}`);

  console.log('');
  console.log('─────────────────────────────────────────────────────────');
  console.log(summary);
  console.log('─────────────────────────────────────────────────────────');
  console.log('');

  return report;
}

if (require.main === module) {
  try {
    runInventory();
    process.exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Erreur fatale : ${message}`);
    process.exit(1);
  }
}

export { runInventory };
