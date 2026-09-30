/**
 * Utilitaires de base pour le pipeline de nettoyage de la charte dark.
 * Lecture/écriture de fichiers, détection de références dark, validation CSS.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  DarkReference,
  DarkReferenceKind,
} from './types';

// ============================================================
// CONSTANTES — patterns de détection des références dark
// ============================================================

/** Racine du projet (deux niveaux au-dessus de scripts/cleanup/) */
export const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Patterns CSS pour détecter les références dark.
 * Chaque entrée : [pattern RegExp, kind DarkReferenceKind]
 */
const CSS_DARK_PATTERNS: Array<[RegExp, DarkReferenceKind]> = [
  // Sélecteur principal html[data-theme="dark"]
  [/html\[data-theme=["']dark["']\]/g, 'CSS_SELECTOR'],
  // @custom-variant dark
  [/@custom-variant\s+dark/g, 'CSS_SELECTOR'],
  // Variables glass dark
  [/--glass-bg-dark|--glass-border-dark/g, 'CSS_GLASS_DARK'],
  // Classes utilitaires dark dans CSS (ex: .dark:bg-*)
  [/\.dark:/g, 'CSS_UTILITY_CLASS'],
  // Tokens dark dans @theme inline
  [/--.*-dark\b/g, 'CSS_GLASS_DARK'],
];

/**
 * Patterns JavaScript/JSX pour détecter les références dark.
 */
const JS_DARK_PATTERNS: Array<[RegExp, DarkReferenceKind]> = [
  // Classes Tailwind dark: dans JSX
  [/\bdark:[a-z]/g, 'JS_DARK_CLASS'],
  // Conditions de contraste héritées
  [/isDark|data-theme.*dark|themeName.*dark|dark.*theme/gi, 'JS_DARK_CONDITION'],
  // html.dark (legacy)
  [/html\.dark\b/g, 'JS_DARK_CONDITION'],
];

/**
 * Patterns Figma pour détecter les références dark.
 */
const FIGMA_DARK_PATTERNS: Array<[RegExp, DarkReferenceKind]> = [
  // Objet dark dans buildTokens
  [/\bconst dark\s*=/g, 'FIGMA_DARK_TOKEN'],
  // Styles CMM/Dark/*
  [/["']CMM\/Dark\//g, 'FIGMA_DARK_STYLE'],
  // Appels avec "dark" comme themeName
  [/buildHeaderComponent\s*\([^)]*["']dark["']/g, 'FIGMA_DARK_COMPONENT'],
  [/buildButtonComponent\s*\([^)]*["']dark["']/g, 'FIGMA_DARK_COMPONENT'],
  [/buildCardComponent\s*\([^)]*["']dark["']/g, 'FIGMA_DARK_COMPONENT'],
  [/buildInputComponent\s*\([^)]*["']dark["']/g, 'FIGMA_DARK_COMPONENT'],
  [/buildContentBlockComponent\s*\([^)]*["']dark["']/g, 'FIGMA_DARK_COMPONENT'],
  [/buildTemplateFrame\s*\([^)]*["']dark["']/g, 'FIGMA_DARK_COMPONENT'],
  // darkComponents, darkGroup, darkTemplate
  [/\bdarkComponents\b|\bdarkGroup\b|\bdarkTemplate\b/g, 'FIGMA_DARK_COMPONENT'],
  // tokens.dark, styles.dark
  [/\btokens\.dark\b|\bstyles\.dark\b/g, 'FIGMA_DARK_TOKEN'],
];

// ============================================================
// LECTURE / ÉCRITURE DE FICHIERS
// ============================================================

/**
 * Écrit du contenu dans un fichier.
 * Crée les répertoires parents si nécessaire.
 */
export function writeFile(filePath: string, content: string): void {
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.join(PROJECT_ROOT, filePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content, 'utf-8');
}

/**
 * Calcule le hash SHA-256 d'une chaîne de caractères.
 */
export function sha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

// ============================================================
// DÉTECTION DES RÉFÉRENCES DARK
// ============================================================

function detectDarkReferencesWithPatterns(
  filePath: string,
  content: string,
  patterns: Array<[RegExp, DarkReferenceKind]>,
): DarkReference[] {
  const lines = content.split('\n');
  const references: DarkReference[] = [];

  lines.forEach((line, index) => {
    for (const [pattern, kind] of patterns) {
      // Réinitialiser lastIndex pour les regex globales
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(line)) !== null) {
        references.push({
          file: filePath,
          lineNumber: index + 1,
          lineContent: line.trim(),
          kind,
          match: match[0],
        });
        // Éviter les boucles infinies sur les regex à largeur nulle
        if (match.index === pattern.lastIndex) {
          pattern.lastIndex++;
        }
      }
    }
  });

  return references;
}

/**
 * Détecte toutes les références dark dans un fichier CSS.
 * Retourne la liste des références trouvées avec leur numéro de ligne.
 */
function detectDarkReferencesInCSS(
  filePath: string,
  content: string
): DarkReference[] {
  return detectDarkReferencesWithPatterns(filePath, content, CSS_DARK_PATTERNS);
}

/**
 * Détecte toutes les références dark dans un fichier JavaScript/JSX.
 */
function detectDarkReferencesInJS(
  filePath: string,
  content: string
): DarkReference[] {
  return detectDarkReferencesWithPatterns(filePath, content, JS_DARK_PATTERNS);
}

/**
 * Détecte toutes les références dark dans le plugin Figma.
 */
export function detectDarkReferencesInFigma(
  filePath: string,
  content: string
): DarkReference[] {
  return detectDarkReferencesWithPatterns(filePath, content, FIGMA_DARK_PATTERNS);
}

/**
 * Détecte les références dark dans un fichier selon son extension.
 * Dispatch automatique vers la bonne fonction de détection.
 */
export function detectDarkReferences(
  filePath: string,
  content: string
): DarkReference[] {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath);

  if (ext === '.css') {
    return detectDarkReferencesInCSS(filePath, content);
  }

  // Le plugin Figma utilise des patterns spécifiques
  if (basename === 'code.js' && filePath.includes('figma')) {
    return detectDarkReferencesInFigma(filePath, content);
  }

  if (ext === '.js' || ext === '.ts' || ext === '.tsx' || ext === '.jsx') {
    return detectDarkReferencesInJS(filePath, content);
  }

  return [];
}

// ============================================================
// VALIDATION CSS BASIQUE
// ============================================================

/**
 * Retourne la date/heure courante au format ISO 8601.
 */
export function nowISO(): string {
  return new Date().toISOString();
}
