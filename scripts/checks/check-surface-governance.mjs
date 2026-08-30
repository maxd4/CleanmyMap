import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const canonicalFiles = [
  "apps/web/src/components/ui/cmm-card.tsx",
  "apps/web/src/components/ui/cmm-block-accent.tsx",
  "apps/web/src/components/ui/rubrique-card.tsx",
  "apps/web/src/lib/ui/page-families/card-presets.ts",
];
const globalsPath = "apps/web/src/app/globals.css";
const violations = [];

const forbiddenByFile = new Map([
  [
    "apps/web/src/components/ui/cmm-card.tsx",
    ["backdrop-blur", "shadow-[", "ring-cyan", "framer-motion", "whileHover", "whileTap", "animateEntrance"],
  ],
  [
    "apps/web/src/components/ui/cmm-block-accent.tsx",
    ["backdrop-blur", "shadow-[", "ring-cyan"],
  ],
  [
    "apps/web/src/components/ui/rubrique-card.tsx",
    ["backdrop-blur", "shadow-[", "bg-[linear-gradient", "hover:-translate", "group-hover:scale"],
  ],
  [
    "apps/web/src/lib/ui/page-families/card-presets.ts",
    ["backdrop-blur", "shadow-", "bg-[", "gradient", "linear-gradient", "blur-"],
  ],
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
  "--cmm-surface-hover-scale",
  "--cmm-surface-active-scale",
  "--cmm-surface-transition-duration",
];

function read(relativePath) {
  const absolutePath = path.join(repositoryRoot, relativePath.replaceAll("/", path.sep));
  if (!fs.existsSync(absolutePath)) {
    violations.push(`${relativePath}: canonical file is missing`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function readCssEntryPoint(relativePath, seen = new Set()) {
  const absolutePath = path.join(repositoryRoot, relativePath.replaceAll("/", path.sep));
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
        path.relative(repositoryRoot, path.resolve(path.dirname(absolutePath), importPath)),
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

if (violations.length > 0) {
  console.error("Surface governance check failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(`Surface governance check passed: ${canonicalFiles.length} canonical primitives and the three display-mode contracts are covered.`);
}
