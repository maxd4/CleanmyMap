import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const webSourceRoot = path.join(repositoryRoot, "apps/web/src");
const primitivePath = path.join(webSourceRoot, "components/ui/cmm-section.tsx");
const tokensPath = path.join(webSourceRoot, "styles/tokens.css");
const layoutPath = path.join(webSourceRoot, "styles/layout.css");
const globalRibbonPaths = [
  path.join(webSourceRoot, "components/navigation/app-navigation-ribbon-shell.tsx"),
  path.join(webSourceRoot, "components/accueil/accueil-footer.tsx"),
  path.join(webSourceRoot, "components/layout/root-layout-chrome.tsx"),
  path.join(webSourceRoot, "components/layout/deferred-global-chrome.tsx"),
];

const structuralUtilities = /(?:^|\s)(?:max-w-|mx-auto|p[xy]?-|space-y-|gap-)/;
const hardcodedStructuralWidth = /(?:^|\s)max-w-(?:6xl|7xl)(?:\s|$)|(?:^|\s)max-w-\[[1-9]\d{3,}px\](?:\s|$)|(?:^|\s)container(?:\s|$)/;
const structuralWidthAllowlist = new Map([
  ["apps/web/src/app/loading.tsx", "system state loading surface"],
  ["apps/web/src/components/auth/auth-page-shell.tsx", "authentication composition and form shell"],
  ["apps/web/src/components/learn/quiz/quiz-access-picker.tsx", "interactive quiz selection surface"],
  ["apps/web/src/components/learn/quiz/quiz-reasoning-picker.tsx", "interactive quiz selection surface"],
  ["apps/web/src/components/learn/quiz/school/quiz-school-picker.tsx", "interactive school workshop surface"],
  ["apps/web/src/components/pilotage/access-screen/views/pilotage-locked-page.tsx", "access-state composition before the console"],
  ["apps/web/src/app/(app)/prints/report/page.tsx", "print/export paper composition"],
]);
const violations = [];
const tokensSource = fs.readFileSync(tokensPath, "utf8");
const layoutSource = fs.readFileSync(layoutPath, "utf8");

if (!/--cmm-grid-max-width:\s*90rem\s*;/.test(tokensSource)) {
  violations.push("styles/tokens.css: canonical internal grid max width must remain 90rem");
}
if (!/--cmm-page-max-width:\s*112rem\s*;/.test(tokensSource)) {
  violations.push("styles/tokens.css: canonical page max width must be 112rem");
}
if (/--cmm-page-max-width:\s*var\(--cmm-grid-max-width\)\s*;/.test(tokensSource)) {
  violations.push("styles/tokens.css: page and internal grid max widths must remain decoupled");
}
if (/--cmm-ribbon-max-width\s*:/.test(tokensSource)) {
  violations.push("styles/tokens.css: global ribbon surfaces must not define a page-width token");
}

const ribbonFrameBlock = layoutSource.match(/\.cmm-ribbon-frame\s*\{[^}]*\}/)?.[0] ?? "";
if (!/width:\s*100%\s*;/.test(ribbonFrameBlock) || !/margin-inline:\s*0\s*;/.test(ribbonFrameBlock)) {
  violations.push("styles/layout.css: global ribbon frame must be a full-width viewport surface");
}
if (/(?:cmm-grid-max-width|cmm-page-max-width|--cmm-ribbon-max-width)/.test(ribbonFrameBlock)) {
  violations.push("styles/layout.css: global ribbon frame must not inherit a page or grid max width");
}
for (const ribbonPath of globalRibbonPaths) {
  const source = fs.readFileSync(ribbonPath, "utf8");
  if (/(?:--cmm-grid-max-width|var\(--cmm-grid-max-width\)|--cmm-page-max-width|var\(--cmm-page-max-width\))/.test(source)) {
    violations.push(`${relativePath(ribbonPath)}: global ribbons must not reference the page or internal grid width contract`);
  }
}

function collectSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(entryPath);
    if (!/\.tsx?$/.test(entry.name) || /\.test\.[jt]sx?$/.test(entry.name)) return [];
    return [entryPath];
  });
}

function relativePath(filePath) {
  return path.relative(repositoryRoot, filePath).split(path.sep).join("/");
}

function extractOpeningTag(source, start) {
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
    if (character === ">" && curlyDepth === 0) return source.slice(start, index + 1);
  }
  return source.slice(start);
}

function hasAttribute(tag, attribute) {
  return new RegExp(`\\b${attribute}\\s*=`).test(tag);
}

function classNameValues(tag) {
  return [...tag.matchAll(/className\s*=\s*["']([^"']*)["']/g)].map((match) => match[1]);
}

function isAllowlistedStructuralWidth(relative) {
  return structuralWidthAllowlist.has(relative);
}

const primitiveSource = fs.readFileSync(primitivePath, "utf8");
if (!primitiveSource.includes('"cmm-page-layout"')) {
  violations.push(`${relativePath(primitivePath)}: CmmPageLayout must use the canonical cmm-page-layout class`);
}
if (!primitiveSource.includes('"cmm-section-group"')) {
  violations.push(`${relativePath(primitivePath)}: CmmSectionGroup must use the canonical cmm-section-group class`);
}
if (/maxWidth\??\s*:|padding\??\s*:|spacing\??\s*:/.test(primitiveSource)) {
  violations.push(`${relativePath(primitivePath)}: page layout primitives must not expose width, padding or spacing variants`);
}

for (const sourcePath of collectSourceFiles(webSourceRoot)) {
  const relative = relativePath(sourcePath);
  const source = fs.readFileSync(sourcePath, "utf8");

  for (const match of source.matchAll(/className\s*=\s*["']([^"']*)["']/g)) {
    const className = match[1] ?? "";
    if (hardcodedStructuralWidth.test(className) && !isAllowlistedStructuralWidth(relative)) {
      const line = source.slice(0, match.index ?? 0).split(/\r?\n/).length;
      violations.push(`${relative}:${line}: structural page widths must use cmm-page-width or an explicit allowlist entry`);
      break;
    }
  }

  for (const primitiveName of ["CmmPageLayout", "CmmSectionGroup"]) {
    for (const match of source.matchAll(new RegExp(`<${primitiveName}\\b`, "g"))) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      const openingTag = extractOpeningTag(source, match.index);
      if (
        hasAttribute(openingTag, "maxWidth") ||
        hasAttribute(openingTag, "padding") ||
        hasAttribute(openingTag, "spacing")
      ) {
        violations.push(`${relative}:${line}: ${primitiveName} cannot receive structural variants`);
      }
      if (classNameValues(openingTag).some((value) => structuralUtilities.test(value))) {
        violations.push(`${relative}:${line}: ${primitiveName} cannot receive local shell spacing/width utilities`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Layout governance check failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log("Layout governance check passed: canonical page shell and section rhythm are variant-free.");
}
