import { normalizeRepositoryPath } from "./repository-view.mjs";

const ALLOWED_BASELINE_DECISIONS = new Set([
  "COHESIVE_SINGLE_FILE",
  "DEFERRED_SPLIT",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireNonEmptyString(value, field, index) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`entrée ${index}: ${field} doit être une chaîne non vide.`);
  }
  return value.trim();
}

function requirePositiveInteger(value, field, index) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`entrée ${index}: ${field} doit être un entier positif.`);
  }
  return value;
}

function isCoveredByScanRoot(file, root) {
  return file === root || file.startsWith(`${root}/`);
}

export function loadHeavyFilesBaseline(view, baselinePath, scanRoots) {
  if (!view.isFile(baselinePath)) {
    throw new Error(`baseline absente: ${baselinePath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(view.readText(baselinePath));
  } catch (error) {
    throw new Error(`baseline JSON invalide (${baselinePath}): ${error.message}`);
  }

  if (!isPlainObject(parsed) || parsed.version !== 1 || !Array.isArray(parsed.allowed)) {
    throw new Error(`baseline malformée (${baselinePath}): version 1 et allowed[] sont requis.`);
  }

  const entries = new Map();
  parsed.allowed.forEach((rawEntry, index) => {
    if (!isPlainObject(rawEntry)) {
      throw new Error(`entrée ${index}: objet requis.`);
    }

    const rawPath = requireNonEmptyString(rawEntry.path, "path", index);
    const file = normalizeRepositoryPath(rawPath);
    if (file !== rawPath || !view.isFile(file)) {
      throw new Error(`entrée ${index}: path absent ou non canonique (${rawPath}).`);
    }
    if (!scanRoots.some((root) => isCoveredByScanRoot(file, root))) {
      throw new Error(`entrée ${index}: path hors des roots scannés (${file}).`);
    }
    if (!ALLOWED_BASELINE_DECISIONS.has(rawEntry.decision)) {
      throw new Error(`entrée ${index}: decision non autorisée (${String(rawEntry.decision)}).`);
    }

    const entry = {
      path: file,
      decision: rawEntry.decision,
      reason: requireNonEmptyString(rawEntry.reason, "reason", index),
      reviewedRef: requireNonEmptyString(rawEntry.reviewedRef, "reviewedRef", index),
      maxLines: requirePositiveInteger(rawEntry.maxLines, "maxLines", index),
      maxBytes: requirePositiveInteger(rawEntry.maxBytes, "maxBytes", index),
    };
    if (entries.has(file)) {
      throw new Error(`entrée ${index}: path dupliqué (${file}).`);
    }
    entries.set(file, entry);
  });

  return entries;
}
