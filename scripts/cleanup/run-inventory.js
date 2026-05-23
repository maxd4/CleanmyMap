/**
 * Script d'inventaire JavaScript (version exécutable sans TypeScript).
 * Analyse les fichiers cibles et génère le rapport d'inventaire.
 *
 * Usage : node scripts/cleanup/run-inventory.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const REPORT_DIR = path.join(PROJECT_ROOT, 'apps', 'artifacts', 'dark-cleanup-backup');

// ============================================================
// PATTERNS DE DÉTECTION
// ============================================================

const CSS_DARK_PATTERNS = [
  [/html\[data-theme=["']dark["']\]/g, 'CSS_SELECTOR'],
  [/@custom-variant\s+dark/g, 'CSS_SELECTOR'],
  [/--glass-bg-dark|--glass-border-dark/g, 'CSS_GLASS_DARK'],
  [/\.dark:/g, 'CSS_UTILITY_CLASS'],
  [/--.*-dark\b/g, 'CSS_GLASS_DARK'],
];

const JS_DARK_PATTERNS = [
  [/\bdark:[a-z]/g, 'JS_DARK_CLASS'],
  [/isDark|data-theme.*dark|themeName.*dark/gi, 'JS_DARK_CONDITION'],
  [/html\.dark\b/g, 'JS_DARK_CONDITION'],
];

const FIGMA_DARK_PATTERNS = [
  [/\bconst dark\s*=/g, 'FIGMA_DARK_TOKEN'],
  [/["']CMM\/Dark\//g, 'FIGMA_DARK_STYLE'],
  [/buildHeaderComponent\s*\([^)]*["']dark["']/g, 'FIGMA_DARK_COMPONENT'],
  [/buildButtonComponent\s*\([^)]*["']dark["']/g, 'FIGMA_DARK_COMPONENT'],
  [/buildCardComponent\s*\([^)]*["']dark["']/g, 'FIGMA_DARK_COMPONENT'],
  [/buildInputComponent\s*\([^)]*["']dark["']/g, 'FIGMA_DARK_COMPONENT'],
  [/buildContentBlockComponent\s*\([^)]*["']dark["']/g, 'FIGMA_DARK_COMPONENT'],
  [/buildTemplateFrame\s*\([^)]*["']dark["']/g, 'FIGMA_DARK_COMPONENT'],
  [/\bdarkComponents\b|\bdarkGroup\b|\bdarkTemplate\b/g, 'FIGMA_DARK_COMPONENT'],
  [/\btokens\.dark\b|\bstyles\.dark\b/g, 'FIGMA_DARK_TOKEN'],
];

function detectRefs(filePath, content, patterns) {
  const lines = content.split('\n');
  const refs = [];

  lines.forEach((line, index) => {
    for (const [pattern, kind] of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        refs.push({
          file: filePath,
          lineNumber: index + 1,
          lineContent: line.trim(),
          kind,
          match: match[0],
        });
        if (match.index === pattern.lastIndex) pattern.lastIndex++;
      }
    }
  });

  return refs;
}

// ============================================================
// FICHIERS CIBLES
// ============================================================

const TARGET_FILES = [
  { path: 'apps/web/src/app/globals.css', type: 'CSS' },
  { path: 'scripts/upgrade-map-ui.js', type: 'JS' },
  { path: 'scripts/refactor_ui.js', type: 'JS' },
  { path: 'scripts/fix_forms_and_map.js', type: 'JS' },
  { path: 'apps/web/figma-plugin-cleanmymap-templates/code.js', type: 'FIGMA' },
];

// ============================================================
// ANALYSE
// ============================================================

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  CleanMyMap — Inventaire des références dark             ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

const byFile = {};
const allRefs = [];

for (const target of TARGET_FILES) {
  const absolute = path.join(PROJECT_ROOT, target.path);

  if (!fs.existsSync(absolute)) {
    console.warn(`  ⚠️  Fichier introuvable : ${target.path}`);
    byFile[target.path] = [];
    continue;
  }

  const content = fs.readFileSync(absolute, 'utf-8');
  let patterns;

  if (target.type === 'CSS') patterns = CSS_DARK_PATTERNS;
  else if (target.type === 'FIGMA') patterns = FIGMA_DARK_PATTERNS;
  else patterns = JS_DARK_PATTERNS;

  const refs = detectRefs(target.path, content, patterns);
  byFile[target.path] = refs;
  allRefs.push(...refs);

  console.log(`Analyse : ${target.path}`);
  console.log(`  → ${refs.length} référence(s) dark trouvée(s)`);

  // Détail par type
  const byKind = {};
  for (const ref of refs) {
    if (!byKind[ref.kind]) byKind[ref.kind] = 0;
    byKind[ref.kind]++;
  }
  for (const [kind, count] of Object.entries(byKind)) {
    console.log(`     ${kind}: ${count}`);
  }
}

// ============================================================
// RAPPORT
// ============================================================

const byKind = {};
for (const ref of allRefs) {
  if (!byKind[ref.kind]) byKind[ref.kind] = [];
  byKind[ref.kind].push(ref);
}

const report = {
  generatedAt: new Date().toISOString(),
  totalDarkReferences: allRefs.length,
  byFile,
  byKind,
  summary: `Total : ${allRefs.length} référence(s) dark dans ${Object.keys(byFile).length} fichier(s)`,
};

// Créer le répertoire de rapport
fs.mkdirSync(REPORT_DIR, { recursive: true });

// Sauvegarder le rapport JSON
const jsonPath = path.join(REPORT_DIR, 'inventory.json');
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

// Générer le rapport Markdown
const mdLines = [
  '# Inventaire des références dark — CleanMyMap',
  '',
  `**Généré le** : ${new Date().toLocaleString('fr-FR')}`,
  `**Total** : ${allRefs.length} référence(s) dark dans ${Object.keys(byFile).length} fichier(s)`,
  '',
  '---',
  '',
  '## Résumé par fichier',
  '',
];

for (const [file, refs] of Object.entries(byFile)) {
  mdLines.push(`### \`${file}\``);
  mdLines.push('');
  mdLines.push(`**${refs.length} référence(s)**`);
  mdLines.push('');

  const kindMap = {};
  for (const ref of refs) {
    if (!kindMap[ref.kind]) kindMap[ref.kind] = [];
    kindMap[ref.kind].push(ref);
  }

  for (const [kind, kindRefs] of Object.entries(kindMap)) {
    mdLines.push(`#### ${kind} (${kindRefs.length})`);
    mdLines.push('');
    mdLines.push('| Ligne | Correspondance | Contenu |');
    mdLines.push('|-------|---------------|---------|');
    for (const ref of kindRefs.slice(0, 15)) {
      const content = ref.lineContent.replace(/\|/g, '\\|').slice(0, 80);
      mdLines.push(`| ${ref.lineNumber} | \`${ref.match}\` | ${content} |`);
    }
    if (kindRefs.length > 15) {
      mdLines.push(`| ... | *(${kindRefs.length - 15} autres)* | |`);
    }
    mdLines.push('');
  }
}

mdLines.push('---');
mdLines.push('');
mdLines.push('## Résumé par type de référence');
mdLines.push('');
mdLines.push('| Type | Nombre |');
mdLines.push('|------|--------|');
for (const [kind, refs] of Object.entries(byKind)) {
  mdLines.push(`| ${kind} | ${refs.length} |`);
}

mdLines.push('');
mdLines.push('---');
mdLines.push('');
mdLines.push('## Plan de nettoyage (ordre de priorité)');
mdLines.push('');

const sortedFiles = Object.entries(byFile).sort(([, a], [, b]) => b.length - a.length);
let i = 1;
for (const [file, refs] of sortedFiles) {
  mdLines.push(`${i}. **\`${file}\`** — ${refs.length} référence(s) à supprimer`);
  i++;
}

const mdPath = path.join(REPORT_DIR, 'inventory.md');
fs.writeFileSync(mdPath, mdLines.join('\n'), 'utf-8');

console.log('');
console.log('─────────────────────────────────────────────────────────');
console.log(`Total : ${allRefs.length} référence(s) dark dans ${Object.keys(byFile).length} fichier(s)`);
console.log('');
console.log('Répartition par type :');
for (const [kind, refs] of Object.entries(byKind)) {
  console.log(`  ${kind}: ${refs.length}`);
}
console.log('─────────────────────────────────────────────────────────');
console.log('');
console.log(`Rapport JSON    : ${jsonPath}`);
console.log(`Rapport Markdown: ${mdPath}`);
console.log('');
console.log('✅ Inventaire terminé.');
