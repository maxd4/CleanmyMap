/**
 * Script de sauvegarde des fichiers originaux avant nettoyage.
 *
 * Copie les fichiers cibles dans apps/artifacts/dark-cleanup-backup/
 * et génère un manifeste JSON pour traçabilité et rollback.
 *
 * Usage :
 *   npx ts-node scripts/cleanup/backup.ts
 *
 * Requirements: 5.1, 5.5
 */

import * as fs from 'fs';
import * as path from 'path';
import { writeFile, sha256, nowISO, PROJECT_ROOT } from './utils';
import type { BackupEntry, BackupManifest } from './types';

// ============================================================
// CONFIGURATION
// ============================================================

/** Répertoire de destination des sauvegardes (relatif à la racine) */
const BACKUP_DIR = 'apps/artifacts/dark-cleanup-backup';

/** Fichiers cibles à sauvegarder avant toute modification */
const TARGET_FILES: string[] = [
  'apps/web/src/app/globals.css',
  'scripts/upgrade-map-ui.js',
  'scripts/refactor_ui.js',
  'scripts/fix_forms_and_map.js',
  'apps/web/figma-plugin-cleanmymap-templates/code.js',
];

// ============================================================
// FONCTIONS DE SAUVEGARDE
// ============================================================

/**
 * Sauvegarde un fichier unique dans le répertoire de backup.
 * Retourne l'entrée de manifeste correspondante.
 */
function backupFile(relativePath: string): BackupEntry {
  const absoluteSrc = path.join(PROJECT_ROOT, relativePath);

  if (!fs.existsSync(absoluteSrc)) {
    throw new Error(`Fichier source introuvable : ${absoluteSrc}`);
  }

  const content = fs.readFileSync(absoluteSrc, 'utf-8');
  const hash = sha256(content);
  const sizeBytes = Buffer.byteLength(content, 'utf-8');

  // Construire le chemin de destination en préservant la structure
  // ex: apps/web/src/app/globals.css → apps/artifacts/dark-cleanup-backup/apps/web/src/app/globals.css
  const backupRelativePath = path.join(BACKUP_DIR, relativePath).replace(/\\/g, '/');
  const absoluteDest = path.join(PROJECT_ROOT, backupRelativePath);

  // Créer les répertoires parents si nécessaire
  fs.mkdirSync(path.dirname(absoluteDest), { recursive: true });

  // Copier le fichier
  fs.copyFileSync(absoluteSrc, absoluteDest);

  console.log(`  ✅ Sauvegardé : ${relativePath}`);
  console.log(`     → ${backupRelativePath}`);
  console.log(`     SHA-256 : ${hash.slice(0, 16)}...`);

  return {
    originalPath: relativePath,
    backupPath: backupRelativePath,
    sizeBytes,
    sha256: hash,
    backedUpAt: nowISO(),
  };
}

/**
 * Sauvegarde tous les fichiers cibles et génère le manifeste.
 */
function runBackup(): BackupManifest {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  CleanMyMap — Sauvegarde avant nettoyage dark            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Répertoire de backup : ${BACKUP_DIR}`);
  console.log(`Fichiers à sauvegarder : ${TARGET_FILES.length}`);
  console.log('');

  const entries: BackupEntry[] = [];
  const errors: string[] = [];

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

  const manifest: BackupManifest = {
    version: '1.0',
    createdAt: nowISO(),
    backupDir: BACKUP_DIR,
    entries,
  };

  // Écrire le manifeste JSON
  const manifestPath = path.join(BACKUP_DIR, 'manifest.json');
  writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`Manifeste écrit : ${manifestPath}`);
  console.log(`Fichiers sauvegardés : ${entries.length} / ${TARGET_FILES.length}`);

  if (errors.length > 0) {
    console.log('');
    console.warn(`⚠️  ${errors.length} erreur(s) rencontrée(s) :`);
    errors.forEach((e) => console.warn(`   - ${e}`));
  } else {
    console.log('');
    console.log('✅ Sauvegarde complète — tous les fichiers sont protégés.');
  }

  console.log('');

  return manifest;
}

/**
 * Vérifie l'intégrité d'une sauvegarde en comparant les hashes.
 * Retourne true si tous les fichiers sauvegardés correspondent à l'original.
 */
export function verifyBackup(manifest: BackupManifest): boolean {
  console.log('Vérification de l\'intégrité de la sauvegarde...');
  let allValid = true;

  for (const entry of manifest.entries) {
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
      console.error(`     Attendu  : ${entry.sha256.slice(0, 16)}...`);
      console.error(`     Obtenu   : ${currentHash.slice(0, 16)}...`);
      allValid = false;
    } else {
      console.log(`  ✅ Intégrité OK : ${entry.originalPath}`);
    }
  }

  return allValid;
}

/**
 * Restaure un fichier depuis la sauvegarde.
 * Utile pour le rollback en cas d'erreur lors du nettoyage.
 */
export function restoreFile(
  originalPath: string,
  manifest: BackupManifest
): boolean {
  const entry = manifest.entries.find((e) => e.originalPath === originalPath);

  if (!entry) {
    console.error(`Aucune sauvegarde trouvée pour : ${originalPath}`);
    return false;
  }

  const backupAbsolute = path.join(PROJECT_ROOT, entry.backupPath);
  const originalAbsolute = path.join(PROJECT_ROOT, entry.originalPath);

  if (!fs.existsSync(backupAbsolute)) {
    console.error(`Fichier de backup manquant : ${entry.backupPath}`);
    return false;
  }

  fs.copyFileSync(backupAbsolute, originalAbsolute);
  console.log(`✅ Restauré : ${originalPath}`);
  return true;
}

/**
 * Charge le manifeste depuis le répertoire de backup.
 */
export function loadManifest(): BackupManifest | null {
  const manifestPath = path.join(PROJECT_ROOT, BACKUP_DIR, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content) as BackupManifest;
  } catch {
    return null;
  }
}

// ============================================================
// POINT D'ENTRÉE
// ============================================================

// Exécution directe du script
if (require.main === module) {
  try {
    const manifest = runBackup();

    // Vérification d'intégrité immédiate
    const isValid = verifyBackup(manifest);

    if (!isValid) {
      console.error('❌ La vérification d\'intégrité a échoué. Vérifiez les erreurs ci-dessus.');
      process.exit(1);
    }

    console.log('🎉 Sauvegarde et vérification réussies. Prêt pour le nettoyage.');
    process.exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Erreur fatale : ${message}`);
    process.exit(1);
  }
}
