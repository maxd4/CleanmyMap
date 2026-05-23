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
  ValidationResult,
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
export const CSS_DARK_PATTERNS: Array<[RegExp, DarkReferenceKind]> = [
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
export const JS_DARK_PATTERNS: Array<[RegExp, DarkReferenceKind]> = [
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
export const FIGMA_DARK_PATTERNS: Array<[RegExp, DarkReferenceKind]> = [
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
 * Lit un fichier texte et retourne son contenu.
 * Lance une erreur si le fichier n'existe pas.
 */
export function readFile(filePath: string): string {
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.join(PROJECT_ROOT, filePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Fichier introuvable : ${absolute}`);
  }
  return fs.readFileSync(absolute, 'utf-8');
}

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
 * Retourne le chemin absolu d'un chemin relatif à la racine du projet.
 */
export function toAbsolute(relativePath: string): string {
  return path.isAbsolute(relativePath)
    ? relativePath
    : path.join(PROJECT_ROOT, relativePath);
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

/**
 * Détecte toutes les références dark dans un fichier CSS.
 * Retourne la liste des références trouvées avec leur numéro de ligne.
 */
export function detectDarkReferencesInCSS(
  filePath: string,
  content: string
): DarkReference[] {
  const lines = content.split('\n');
  const references: DarkReference[] = [];

  lines.forEach((line, index) => {
    for (const [pattern, kind] of CSS_DARK_PATTERNS) {
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
 * Détecte toutes les références dark dans un fichier JavaScript/JSX.
 */
export function detectDarkReferencesInJS(
  filePath: string,
  content: string
): DarkReference[] {
  const lines = content.split('\n');
  const references: DarkReference[] = [];

  lines.forEach((line, index) => {
    for (const [pattern, kind] of JS_DARK_PATTERNS) {
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
        if (match.index === pattern.lastIndex) {
          pattern.lastIndex++;
        }
      }
    }
  });

  return references;
}

/**
 * Détecte toutes les références dark dans le plugin Figma.
 */
export function detectDarkReferencesInFigma(
  filePath: string,
  content: string
): DarkReference[] {
  const lines = content.split('\n');
  const references: DarkReference[] = [];

  lines.forEach((line, index) => {
    for (const [pattern, kind] of FIGMA_DARK_PATTERNS) {
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
        if (match.index === pattern.lastIndex) {
          pattern.lastIndex++;
        }
      }
    }
  });

  return references;
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
 * Vérifie l'équilibre des accolades dans un fichier CSS.
 * Retourne true si le nombre d'ouvertures = nombre de fermetures.
 */
export function validateCSSBraceBalance(content: string): boolean {
  let depth = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    // Gestion des chaînes (pour éviter les faux positifs dans les valeurs)
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      continue;
    }
    if (inString && char === stringChar && content[i - 1] !== '\\') {
      inString = false;
      continue;
    }
    if (inString) continue;

    if (char === '{') depth++;
    else if (char === '}') depth--;

    // Détection précoce d'un déséquilibre
    if (depth < 0) return false;
  }

  return depth === 0;
}

/**
 * Vérifie qu'un fichier CSS ne contient plus de références dark.
 * Retourne le nombre de références restantes.
 */
export function countRemainingDarkReferences(
  content: string,
  filePath: string
): number {
  const refs = detectDarkReferences(filePath, content);
  return refs.length;
}

/**
 * Valide un fichier CSS après nettoyage.
 * Vérifie la syntaxe et l'absence de références dark.
 */
export function validateCSSFile(
  filePath: string,
  content: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Vérification de l'équilibre des accolades
  if (!validateCSSBraceBalance(content)) {
    errors.push('Déséquilibre des accolades CSS détecté');
  }

  // Vérification de l'absence de références dark
  const darkRefs = detectDarkReferencesInCSS(filePath, content);
  const darkCount = darkRefs.length;

  if (darkCount > 0) {
    warnings.push(
      `${darkCount} référence(s) dark encore présente(s) : ${darkRefs
        .slice(0, 3)
        .map((r) => `ligne ${r.lineNumber}: ${r.match}`)
        .join(', ')}${darkCount > 3 ? '...' : ''}`
    );
  }

  // Vérification que le fichier n'est pas vide
  if (content.trim().length === 0) {
    errors.push('Le fichier CSS est vide après nettoyage');
  }

  return {
    file: filePath,
    isValid: errors.length === 0,
    errors,
    warnings,
    darkReferencesRemaining: darkCount,
  };
}

/**
 * Valide un fichier JavaScript après nettoyage.
 */
export function validateJSFile(
  filePath: string,
  content: string,
  isFigma = false
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Vérification que le fichier n'est pas vide
  if (content.trim().length === 0) {
    errors.push('Le fichier JS est vide après nettoyage');
  }

  // Détection des références dark restantes
  const darkRefs = isFigma
    ? detectDarkReferencesInFigma(filePath, content)
    : detectDarkReferencesInJS(filePath, content);

  const darkCount = darkRefs.length;

  if (darkCount > 0) {
    warnings.push(
      `${darkCount} référence(s) dark encore présente(s) : ${darkRefs
        .slice(0, 3)
        .map((r) => `ligne ${r.lineNumber}: ${r.match}`)
        .join(', ')}${darkCount > 3 ? '...' : ''}`
    );
  }

  return {
    file: filePath,
    isValid: errors.length === 0,
    errors,
    warnings,
    darkReferencesRemaining: darkCount,
  };
}

// ============================================================
// UTILITAIRES DIVERS
// ============================================================

/**
 * Formate un rapport de validation en texte lisible.
 */
export function formatValidationResult(result: ValidationResult): string {
  const status = result.isValid ? '✅ VALIDE' : '❌ INVALIDE';
  const lines = [
    `${status} — ${result.file}`,
    `  Références dark restantes : ${result.darkReferencesRemaining}`,
  ];

  if (result.errors.length > 0) {
    lines.push('  Erreurs :');
    result.errors.forEach((e) => lines.push(`    - ${e}`));
  }

  if (result.warnings.length > 0) {
    lines.push('  Avertissements :');
    result.warnings.forEach((w) => lines.push(`    - ${w}`));
  }

  return lines.join('\n');
}

/**
 * Retourne la date/heure courante au format ISO 8601.
 */
export function nowISO(): string {
  return new Date().toISOString();
}
