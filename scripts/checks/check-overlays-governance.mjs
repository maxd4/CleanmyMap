import fs from "node:fs";
import path from "node:path";

export const CANONICAL_DIALOG_PATH = "apps/web/src/components/ui/cmm-dialog.tsx";

export const LEGACY_MODAL_ALLOWLIST = new Set([
  "apps/web/src/components/account/account-completion-modal.tsx",
  "apps/web/src/components/gamification/infinite-badges/BadgeModal.tsx",
  "apps/web/src/components/actions/action-declaration/form/action-declaration-form.tsx",
]);

const MIGRATED_CONSUMERS = new Map([
  [
    "apps/web/src/components/sections/rubriques/rejoindre-un-formulaire-section-dialog.tsx",
    ["@/components/ui/cmm-dialog", "<CmmDialog", "initialFocusRef={confirmButtonRef}"],
  ],
  [
    "apps/web/src/components/actions/action-declaration/form/action-declaration-form-confirmation.tsx",
    [
      "@/components/ui/cmm-dialog",
      "<CmmDialog",
      "dismissible={false}",
      "ariaLabelledBy=\"action-declaration-confirmation-title\"",
      "ariaDescribedBy=\"action-declaration-confirmation-description\"",
    ],
  ],
  [
    "apps/web/src/components/actions/action-declaration/form/action-declaration-export-picker.tsx",
    [
      "@/components/ui/cmm-dialog",
      "<CmmDialog",
      "open={isOpen}",
      "ariaLabelledBy=\"action-declaration-export-title\"",
    ],
  ],
]);

const FORBIDDEN_CONSUMER_RECIPES = [
  'role="dialog"',
  'aria-modal="true"',
  "document.body.style.overflow",
  'document.addEventListener("keydown"',
  "event.key === \"Escape\"",
  "focusableSelector",
  "previouslyFocusedElement",
  "previousFocus",
];

function normalizeRepositoryPath(filePath) {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "");
}

function extractOpeningTags(source) {
  const tags = [];
  for (const match of source.matchAll(/<[A-Za-z][A-Za-z0-9_.:-]*/g)) {
    const start = match.index;
    let quote = null;
    let curlyDepth = 0;

    for (let index = start; index < source.length; index += 1) {
      const character = source[index];
      if (quote) {
        if (character === quote && source[index - 1] !== "\\") quote = null;
        continue;
      }
      if (character === '"' || character === "'" || character === "`") {
        quote = character;
        continue;
      }
      if (character === "{") curlyDepth += 1;
      if (character === "}") curlyDepth = Math.max(0, curlyDepth - 1);
      if (character === ">" && curlyDepth === 0) {
        tags.push(source.slice(start, index + 1));
        break;
      }
    }
  }
  return tags;
}

function hasStaticAttribute(tag, attribute, value) {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${attribute}\\s*=\\s*["']${escapedValue}["']`).test(tag);
}

export function findRawModalDialogs(source, filePath) {
  const normalizedPath = normalizeRepositoryPath(filePath);
  return extractOpeningTags(source)
    .filter(
      (tag) =>
        hasStaticAttribute(tag, "role", "dialog") &&
        hasStaticAttribute(tag, "aria-modal", "true"),
    )
    .map(() => `${normalizedPath}: raw modal dialog must use CmmDialog`);
}

export function auditModalSources(
  entries,
  { allowlist = LEGACY_MODAL_ALLOWLIST } = {},
) {
  const violations = [];
  for (const entry of entries) {
    const filePath = normalizeRepositoryPath(entry.path);
    if (filePath === CANONICAL_DIALOG_PATH) continue;
    if (allowlist.has(filePath)) continue;
    violations.push(...findRawModalDialogs(entry.source, filePath));
  }
  return violations;
}

function absolutePath(repositoryRoot, relativePath) {
  return path.join(repositoryRoot, relativePath.replaceAll("/", path.sep));
}

function readRequired(repositoryRoot, relativePath, violations) {
  const filePath = absolutePath(repositoryRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    violations.push(`${relativePath}: required overlay file is missing`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function collectWebSourceFiles(repositoryRoot) {
  const sourceRoot = absolutePath(repositoryRoot, "apps/web/src");
  const entries = [];

  function visit(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const itemPath = path.join(directory, item.name);
      if (item.isDirectory()) {
        visit(itemPath);
        continue;
      }
      if (!/\.(?:tsx?|jsx?)$/.test(item.name) || /\.(?:test|spec)\./.test(item.name)) {
        continue;
      }
      entries.push({
        path: normalizeRepositoryPath(path.relative(repositoryRoot, itemPath)),
        source: fs.readFileSync(itemPath, "utf8"),
      });
    }
  }

  if (fs.existsSync(sourceRoot)) visit(sourceRoot);
  return entries;
}

function requireText(source, relativePath, marker, violations) {
  if (!source.includes(marker)) {
    violations.push(`${relativePath}: missing canonical overlay marker ${marker}`);
  }
}

function runCheck(repositoryRoot) {
  const violations = [];
  const canonicalSource = readRequired(repositoryRoot, CANONICAL_DIALOG_PATH, violations);
  const overlaysCssPath = "apps/web/src/styles/overlays.css";
  const overlaysCss = readRequired(repositoryRoot, overlaysCssPath, violations);

  for (const marker of [
    "ariaLabel: string",
    "ariaLabelledBy: string",
    'role="dialog"',
    'aria-modal="true"',
    "document.body.style.overflow",
    "event.key === \"Escape\"",
    "event.key !== \"Tab\"",
    "event.shiftKey",
    "previousFocusRef.current",
    "initialFocusRef?: RefObject<HTMLElement | null>",
    "initialFocusRef?.current",
    "focusWithoutScroll(initialFocusElement ?? firstFocusableElement ?? panel)",
  ]) {
    requireText(canonicalSource, CANONICAL_DIALOG_PATH, marker, violations);
  }

  for (const marker of [
    "[data-display-mode=\"minimaliste\"] .cmm-dialog-backdrop",
    "backdrop-filter: none",
    "[data-display-mode=\"sobre\"] .cmm-dialog-backdrop",
    "[data-display-mode=\"sobre\"] .cmm-dialog-panel",
    "background-image: none",
    "box-shadow: none",
    "prefers-reduced-motion: reduce",
    "animation: none !important",
    "transition: none !important",
  ]) {
    requireText(overlaysCss, overlaysCssPath, marker, violations);
  }

  for (const [relativePath, requiredMarkers] of MIGRATED_CONSUMERS) {
    const source = readRequired(repositoryRoot, relativePath, violations);
    for (const marker of requiredMarkers) requireText(source, relativePath, marker, violations);
    for (const forbidden of FORBIDDEN_CONSUMER_RECIPES) {
      if (source.includes(forbidden)) {
        violations.push(`${relativePath}: local modal recipe is forbidden: ${forbidden}`);
      }
    }
  }

  for (const legacyPath of LEGACY_MODAL_ALLOWLIST) {
    const source = readRequired(repositoryRoot, legacyPath, violations);
    if (findRawModalDialogs(source, legacyPath).length === 0) {
      violations.push(`${legacyPath}: legacy modal allowlist entry no longer contains a raw modal`);
    }
  }

  violations.push(
    ...auditModalSources(collectWebSourceFiles(repositoryRoot), {
      allowlist: LEGACY_MODAL_ALLOWLIST,
    }),
  );

  return violations;
}

if (import.meta.main) {
  const repositoryRoot = path.resolve(import.meta.dirname, "../..");
  const violations = runCheck(repositoryRoot);
  if (violations.length > 0) {
    console.error("Overlays governance check failed:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
  } else {
    console.log("Overlays governance check passed: CmmDialog, migrated consumers and bounded legacy exceptions are protected.");
  }
}
