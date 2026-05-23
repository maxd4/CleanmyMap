/**
 * Types TypeScript pour le processus de nettoyage de la charte dark.
 * Utilisés par tous les modules du pipeline de suppression.
 */

// ============================================================
// CHANGE RECORD — trace chaque modification effectuée
// ============================================================

export type ChangeType = 'REMOVAL' | 'MODIFICATION';
export type ChangeCategory = 'CSS' | 'SCRIPT' | 'FIGMA';

export interface ChangeRecord {
  /** Chemin relatif du fichier modifié (depuis la racine du projet) */
  file: string;
  /** Numéro de ligne (1-based) où la modification a eu lieu */
  lineNumber: number;
  /** Contenu original avant modification */
  originalContent: string;
  /** Contenu après modification (vide si suppression pure) */
  newContent: string;
  /** Type de changement : suppression ou modification */
  changeType: ChangeType;
  /** Catégorie du fichier traité */
  category: ChangeCategory;
}

// ============================================================
// VALIDATION RESULT — résultat de validation d'un fichier
// ============================================================

export interface ValidationResult {
  /** Chemin relatif du fichier validé */
  file: string;
  /** true si le fichier est valide après nettoyage */
  isValid: boolean;
  /** Liste des erreurs bloquantes détectées */
  errors: string[];
  /** Liste des avertissements non-bloquants */
  warnings: string[];
  /** Nombre de références dark encore présentes (0 = nettoyage complet) */
  darkReferencesRemaining: number;
}

// ============================================================
// CLEANUP REPORT — rapport global du processus de nettoyage
// ============================================================

export interface CleanupReport {
  /** Nombre total de fichiers traités */
  totalFilesProcessed: number;
  /** Nombre total de changements effectués */
  totalChanges: number;
  /** Répartition des changements par catégorie */
  changesByCategory: Record<ChangeCategory, number>;
  /** Résultats de validation par fichier */
  validationResults: ValidationResult[];
  /** Résumé textuel du nettoyage */
  summary: string;
  /** Horodatage ISO du rapport */
  timestamp: string;
  /** Indique si le nettoyage est considéré comme réussi */
  success: boolean;
}

// ============================================================
// BACKUP MANIFEST — manifeste de la sauvegarde
// ============================================================

export interface BackupEntry {
  /** Chemin original du fichier (relatif à la racine du projet) */
  originalPath: string;
  /** Chemin de la copie de sauvegarde (relatif à la racine du projet) */
  backupPath: string;
  /** Taille du fichier en octets */
  sizeBytes: number;
  /** Hash SHA-256 du contenu original pour vérification d'intégrité */
  sha256: string;
  /** Horodatage ISO de la sauvegarde */
  backedUpAt: string;
}

export interface BackupManifest {
  /** Version du manifeste */
  version: '1.0';
  /** Horodatage ISO de la création du backup */
  createdAt: string;
  /** Répertoire de destination des sauvegardes (relatif à la racine) */
  backupDir: string;
  /** Liste des fichiers sauvegardés */
  entries: BackupEntry[];
}

// ============================================================
// DARK REFERENCE — référence dark détectée dans un fichier
// ============================================================

export type DarkReferenceKind =
  | 'CSS_SELECTOR'      // html[data-theme="dark"] { ... }
  | 'CSS_VARIABLE'      // --some-var dans un bloc dark
  | 'CSS_UTILITY_CLASS' // .dark:bg-*, .dark:text-*, etc.
  | 'CSS_GLASS_DARK'    // --glass-bg-dark, --glass-border-dark
  | 'JS_DARK_CLASS'     // dark:bg-*, dark:text-*, dark:border-* dans du JSX
  | 'JS_DARK_CONDITION' // conditions if/ternaire liées au contraste hérité
  | 'FIGMA_DARK_TOKEN'  // objet dark dans buildTokens()
  | 'FIGMA_DARK_STYLE'  // CMM/Dark/* dans createStyles()
  | 'FIGMA_DARK_COMPONENT'; // buildHeaderComponent(styles, "dark"), etc.

export interface DarkReference {
  /** Chemin relatif du fichier */
  file: string;
  /** Numéro de ligne (1-based) */
  lineNumber: number;
  /** Contenu brut de la ligne */
  lineContent: string;
  /** Type de référence dark détectée */
  kind: DarkReferenceKind;
  /** Extrait de la correspondance (pour diagnostic) */
  match: string;
}

// ============================================================
// INVENTORY REPORT — rapport d'inventaire initial (tâche 1)
// ============================================================

export interface InventoryReport {
  /** Horodatage ISO de l'inventaire */
  generatedAt: string;
  /** Nombre total de références dark trouvées */
  totalDarkReferences: number;
  /** Références groupées par fichier */
  byFile: Record<string, DarkReference[]>;
  /** Références groupées par type */
  byKind: Partial<Record<DarkReferenceKind, DarkReference[]>>;
  /** Résumé textuel */
  summary: string;
}
