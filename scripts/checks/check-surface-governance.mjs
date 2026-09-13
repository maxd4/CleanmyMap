import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");

export const canonicalFiles = [
  "apps/web/src/components/ui/cmm-card.tsx",
  "apps/web/src/components/ui/cmm-block-accent.tsx",
  "apps/web/src/components/ui/rubrique-card.tsx",
  "apps/web/src/components/ui/cmm-button.tsx",
  "apps/web/src/lib/ui/page-families/card-presets.ts",
];

const globalsPath = "apps/web/src/app/globals.css";

const forbiddenByFile = new Map([
  ["apps/web/src/components/ui/cmm-card.tsx", ["backdrop-blur", "shadow-[", "ring-cyan", "framer-motion", "whileHover", "whileTap", "animateEntrance"]],
  ["apps/web/src/components/ui/cmm-block-accent.tsx", ["backdrop-blur", "shadow-[", "ring-cyan"]],
  ["apps/web/src/components/ui/rubrique-card.tsx", ["backdrop-blur", "shadow-[", "bg-[linear-gradient", "hover:-translate", "group-hover:scale", "whileHover", "whileTap"]],
  ["apps/web/src/components/ui/cmm-button.tsx", ["framer-motion", "whileHover", "whileTap"]],
  ["apps/web/src/lib/ui/page-families/card-presets.ts", ["backdrop-blur", "shadow-", "bg-[", "gradient", "linear-gradient", "blur-"]],
]);

const requiredSurfaceTokens = [
  "--cmm-surface-background",
  "--cmm-surface-background-muted",
  "--cmm-surface-border",
  "--cmm-surface-border-strong",
  "--cmm-surface-shadow",
  "--cmm-surface-shadow-elevated",
  "--cmm-surface-blur",
  "--cmm-surface-texture-opacity",
  "--cmm-surface-hover-translate",
  "--cmm-surface-transition-duration",
  "--cmm-button-shadow-hover",
];

export const canonicalTextSurfaceSelectors = [
  ".cmm-card--interactive:not([aria-disabled=\"true\"]):hover",
  ".cmm-card--interactive:not([aria-disabled=\"true\"]):active",
  ".cmm-rubrique-card--interactive:hover",
  ".cmm-rubrique-card--interactive:active",
  ".cmm-button:not([data-cmm-button-disabled=\"true\"]):not([data-cmm-button-loading=\"true\"]):hover",
  ".cmm-button:not([data-cmm-button-disabled=\"true\"]):not([data-cmm-button-loading=\"true\"]):active",
  ".cmm-surface-action:hover",
];

const cmmButtonOpeningTagPattern = /<CmmButton\b[^>]*>/g;
const cmmButtonClassNamePattern = /\bclassName\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/;
const cmmButtonScalePattern = /\b(?:hover|active|group-hover):scale-[^\s"'`}]+/g;

export function auditCmmButtonLocalScalesInSource(source, sourceName = "source") {
  const violations = [];

  for (const match of source.matchAll(cmmButtonOpeningTagPattern)) {
    const openingTag = match[0];
    const classNameMatch = openingTag.match(cmmButtonClassNamePattern);
    if (!classNameMatch) continue;

    const className = classNameMatch.slice(1).find(Boolean) ?? "";
    for (const token of className.matchAll(cmmButtonScalePattern)) {
      violations.push(`${sourceName}: CmmButton className contains local text-surface scale: ${token[0]}`);
    }
  }

  return violations;
}

export function auditCmmButtonLocalScales(root = repositoryRoot) {
  const sourceRoot = path.join(root, "apps", "web", "src");
  const violations = [];

  function visit(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
        continue;
      }
      if (!entry.isFile() || !/\.(?:ts|tsx)$/.test(entry.name)) continue;

      const relativePath = path.relative(root, entryPath).split(path.sep).join("/");
      violations.push(...auditCmmButtonLocalScalesInSource(
        fs.readFileSync(entryPath, "utf8"),
        relativePath,
      ));
    }
  }

  visit(sourceRoot);
  return violations;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function auditCanonicalTextSurfaceScales(css, sourceName = "CSS entrypoint") {
  const violations = [];

  for (const selector of canonicalTextSurfaceSelectors) {
    const match = css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^{}]*)\\}`, "m"));
    if (!match) {
      violations.push(`${sourceName}: missing canonical text-surface selector ${selector}`);
      continue;
    }

    const body = match[1];
    if (/transform\s*:[^;]*\bscale\s*\(/.test(body)) {
      violations.push(`${sourceName}: scale() is forbidden in canonical text-surface state ${selector}`);
    }
    if (/(^|[;\s])filter\s*:/.test(body)) {
      violations.push(`${sourceName}: filter is forbidden in canonical text-surface state ${selector}`);
    }
  }

  return violations;
}

export function auditSurfaceRepository(root = repositoryRoot) {
  const violations = [];

  function read(relativePath) {
    const absolutePath = path.join(root, relativePath.replaceAll("/", path.sep));
    if (!fs.existsSync(absolutePath)) {
      violations.push(`${relativePath}: canonical file is missing`);
      return "";
    }
    return fs.readFileSync(absolutePath, "utf8");
  }

  function readCssEntryPoint(relativePath, seen = new Set()) {
    const absolutePath = path.join(root, relativePath.replaceAll("/", path.sep));
    if (seen.has(absolutePath)) return "";
    seen.add(absolutePath);
    const content = read(relativePath);
    const imports = [...content.matchAll(/@import\s+["']([^"']+)["']\s*;/g)];
    return [
      content,
      ...imports
        .map(([, importPath]) => importPath)
        .filter((importPath) => importPath.startsWith("."))
        .map((importPath) => readCssEntryPoint(
          path.relative(root, path.resolve(path.dirname(absolutePath), importPath)).split(path.sep).join("/"),
          seen,
        )),
    ].join("\n");
  }

  for (const relativePath of canonicalFiles) {
    const source = read(relativePath);
    for (const forbidden of forbiddenByFile.get(relativePath) ?? []) {
      if (source.includes(forbidden)) {
        violations.push(`${relativePath}: forbidden direct surface/motion utility or legacy API: ${forbidden}`);
      }
    }
  }

  const globals = readCssEntryPoint(globalsPath);
  for (const token of requiredSurfaceTokens) {
    if (!globals.includes(token)) violations.push(`${globalsPath}: missing canonical surface token ${token}`);
  }

  for (const selector of [
    '[data-display-mode="minimaliste"]',
    '[data-display-mode="sobre"]',
    "@media (prefers-reduced-motion: reduce)",
    ".cmm-card--interactive:focus-visible",
    ".cmm-rubrique-card--interactive:hover",
  ]) {
    if (!globals.includes(selector)) violations.push(`${globalsPath}: missing surface contract selector ${selector}`);
  }

  for (const legacyUtility of [".cmm-clickable", ".cmm-interactive"]) {
    if (globals.includes(legacyUtility)) {
      violations.push(`${globalsPath}: legacy generic surface utility must not be defined: ${legacyUtility}`);
    }
  }

  violations.push(...auditCanonicalTextSurfaceScales(globals, globalsPath));
  violations.push(...auditCmmButtonLocalScales(root));

  return { violations, globals };
}

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  const { violations } = auditSurfaceRepository();
  if (violations.length > 0) {
    console.error("Surface governance check failed:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
  } else {
    console.log(`Surface governance check passed: ${canonicalFiles.length} canonical primitives and the display-mode contracts are covered.`);
  }
}
