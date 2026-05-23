/**
 * Script de sauvegarde JavaScript (version exécutable sans TypeScript).
 * Copie les fichiers cibles dans apps/artifacts/dark-cleanup-backup/
 * et génère un manifeste JSON.
 *
 * Usage : node scripts/cleanup/run-backup.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const BACKUP_DIR = path.join(PROJECT_ROOT, 'apps', 'artifacts', 'dark-cleanup-backup');

const TARGET_FILES = [
  'apps/web/src/app/globals.css',
  'scripts/upgrade-map-ui.js',
  'scripts/refactor_ui.js',
  'scripts/fix_forms_and_map.js',
  'apps/web/figma-plugin-cleanmymap-templates/code.js',
];

function sha256(content) {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

function backupFile(relativePath) {
  const absoluteSrc = path.join(PROJECT_ROOT, relativePath);

  if (!fs.existsSync(absoluteSrc)) {
    throw new Error(`Fichier source introuvable : ${absoluteSrc}`);
  }

  const content = fs.readFileSync(absoluteSrc, 'utf-8');
  const hash = sha256(content);
  const sizeBytes = Buffer.byteLength(content, 'utf-8');

  // Préserver la structure de répertoires dans le backup
  const backupRelativePath = path.join('apps', 'artifacts', 'dark-cleanup-backup', relativePath);
  const absoluteDest = path.join(PROJECT_ROOT, backupRelativePath);

  fs.mkdirSync(path.dirname(absoluteDest), { recursive: true });
  fs.copyFileSync(absoluteSrc, absoluteDest);

  console.log(`  ✅ Sauvegardé : ${relativePath}`);
  console.log(`     → ${backupRelativePath.replace(/\\/g, '/')}`);
  console.log(`     SHA-256 : ${hash.slice(0, 16)}...`);

  return {
    originalPath: relativePath,
    backupPath: backupRelativePath.replace(/\\/g, '/'),
    sizeBytes,
    sha256: hash,
    backedUpAt: new Date().toISOString(),
  };
}

function runBackup() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  CleanMyMap — Sauvegarde avant nettoyage dark            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Répertoire de backup : apps/artifacts/dark-cleanup-backup/`);
  console.log(`Fichiers à sauvegarder : ${TARGET_FILES.length}`);
  console.log('');

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const entries = [];
  const errors = [];

  for (const filePath of TARGET_FILES) {
    try {
      const entry = backupFile(filePath);
      entries.push(entry);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ Erreur pour ${filePath} : ${message}`);
      errors.push(`${filePath}: ${message}`);
    }
  }

  const manifest = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    backupDir: 'apps/artifacts/dark-cleanup-backup',
    entries,
  };

  const manifestPath = path.join(BACKUP_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log('');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`Manifeste écrit : apps/artifacts/dark-cleanup-backup/manifest.json`);
  console.log(`Fichiers sauvegardés : ${entries.length} / ${TARGET_FILES.length}`);

  if (errors.length > 0) {
    console.log('');
    console.warn(`⚠️  ${errors.length} erreur(s) rencontrée(s) :`);
    errors.forEach((e) => console.warn(`   - ${e}`));
  } else {
    console.log('');
    console.log('✅ Sauvegarde complète — tous les fichiers sont protégés.');
  }

  // Vérification d'intégrité immédiate
  console.log('');
  console.log('Vérification d\'intégrité...');
  let allValid = true;

  for (const entry of entries) {
    const backupAbsolute = path.join(PROJECT_ROOT, entry.backupPath);
    if (!fs.existsSync(backupAbsolute)) {
      console.error(`  ❌ Fichier de backup manquant : ${entry.backupPath}`);
      allValid = false;
      continue;
    }
    const content = fs.readFileSync(backupAbsolute, 'utf-8');
    const currentHash = sha256(content);
    if (currentHash !== entry.sha256) {
      console.error(`  ❌ Hash invalide pour : ${entry.originalPath}`);
      allValid = false;
    } else {
      console.log(`  ✅ Intégrité OK : ${entry.originalPath}`);
    }
  }

  console.log('');
  if (allValid) {
    console.log('🎉 Sauvegarde et vérification réussies. Prêt pour le nettoyage.');
  } else {
    console.error('❌ La vérification d\'intégrité a échoué.');
    process.exit(1);
  }

  return manifest;
}

runBackup();
