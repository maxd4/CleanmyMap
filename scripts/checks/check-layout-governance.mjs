import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const primitiveRelativePath = "apps/web/src/components/ui/cmm-section.tsx";
const tokensRelativePath = "apps/web/src/styles/tokens.css";
const layoutRelativePath = "apps/web/src/styles/layout.css";
const baseRelativePath = "apps/web/src/styles/base.css";
const globalRibbonRelativePaths = [
  "apps/web/src/components/navigation/app-navigation-ribbon-shell.tsx",
  "apps/web/src/components/accueil/accueil-footer.tsx",
  "apps/web/src/components/layout/root-layout-chrome.tsx",
  "apps/web/src/components/layout/deferred-global-chrome.tsx",
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
function collectFiles(directory, predicate) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(entryPath, predicate);
    if (!predicate(entry.name)) return [];
    return [entryPath];
  });
}

function collectSourceFiles(directory) {
  return collectFiles(directory, (fileName) => /\.[cm]?[jt]sx?$/.test(fileName) && !/\.test\.[cm]?[jt]sx?$/.test(fileName));
}

function collectCssFiles(directory) {
  return collectFiles(directory, (fileName) => /\.css$/.test(fileName));
}

function relativePath(filePath, root = repositoryRoot) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function maskCssComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\r\n]/g, " "));
}

export function auditTailwindZoomSources(entries) {
  const violations = [];
  const arbitraryZoomClass = /\[\s*zoom\s*:[^\]]+\]/;

  for (const { path: filePath, source } of entries) {
    const match = arbitraryZoomClass.exec(source);
    if (match) {
      violations.push(`${filePath}:${lineNumber(source, match.index)}: page-level CSS zoom is forbidden; use density tokens instead`);
    }
  }

  return violations;
}

export function auditCssZoomSources(entries) {
  const violations = [];
  const cssZoomProperty = /(?:^|[\s{;])zoom\s*:/m;

  for (const { path: filePath, source } of entries) {
    const scanSource = maskCssComments(source);
    const match = cssZoomProperty.exec(scanSource);
    if (match) {
      violations.push(`${filePath}:${lineNumber(source, match.index)}: application CSS zoom is forbidden; use density tokens instead`);
    }
  }

  return violations;
}

export function auditZoomSources({ sourceEntries = [], cssEntries = [] } = {}) {
  return [
    ...auditTailwindZoomSources(sourceEntries),
    ...auditCssZoomSources(cssEntries),
  ];
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

export function auditLayoutRepository(root = repositoryRoot) {
  const webRoot = path.join(root, "apps/web/src");
  const primitiveSource = fs.readFileSync(path.join(root, primitiveRelativePath), "utf8");
  const tokensSource = fs.readFileSync(path.join(root, tokensRelativePath), "utf8");
  const layoutSource = fs.readFileSync(path.join(root, layoutRelativePath), "utf8");
  const baseSource = fs.readFileSync(path.join(root, baseRelativePath), "utf8");
  const violations = [];

  if (/html\s*\{[\s\S]*zoom\s*:|font-size\s*:\s*80%/.test(baseSource)) {
    violations.push("styles/base.css: global CSS zoom and the 80% font-size fallback are forbidden");
  }

  const sourceEntries = collectSourceFiles(webRoot).map((filePath) => ({
    path: relativePath(filePath, root),
    source: fs.readFileSync(filePath, "utf8"),
  }));
  const cssEntries = collectCssFiles(webRoot).map((filePath) => ({
    path: relativePath(filePath, root),
    source: fs.readFileSync(filePath, "utf8"),
  }));
  violations.push(...auditZoomSources({ sourceEntries, cssEntries }));

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
  for (const ribbonRelativePath of globalRibbonRelativePaths) {
    const source = fs.readFileSync(path.join(root, ribbonRelativePath), "utf8");
    if (/(?:--cmm-grid-max-width|var\(--cmm-grid-max-width\)|--cmm-page-max-width|var\(--cmm-page-max-width\))/.test(source)) {
      violations.push(`${ribbonRelativePath}: global ribbons must not reference the page or internal grid width contract`);
    }
  }

  if (!primitiveSource.includes('"cmm-page-layout"')) {
    violations.push(`${primitiveRelativePath}: CmmPageLayout must use the canonical cmm-page-layout class`);
  }
  if (!primitiveSource.includes('"cmm-section-group"')) {
    violations.push(`${primitiveRelativePath}: CmmSectionGroup must use the canonical cmm-section-group class`);
  }
  if (/maxWidth\??\s*:|padding\??\s*:|spacing\??\s*:/.test(primitiveSource)) {
    violations.push(`${primitiveRelativePath}: page layout primitives must not expose width, padding or spacing variants`);
  }

  for (const { path: relative, source } of sourceEntries) {
    for (const match of source.matchAll(/className\s*=\s*["']([^"']*)["']/g)) {
      const className = match[1] ?? "";
      if (hardcodedStructuralWidth.test(className) && !isAllowlistedStructuralWidth(relative)) {
        const line = lineNumber(source, match.index ?? 0);
        violations.push(`${relative}:${line}: structural page widths must use cmm-page-width or an explicit allowlist entry`);
        break;
      }
    }

    for (const primitiveName of ["CmmPageLayout", "CmmSectionGroup"]) {
      for (const match of source.matchAll(new RegExp(`<${primitiveName}\\b`, "g"))) {
        const line = lineNumber(source, match.index);
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

  return violations;
}

if (import.meta.main) {
  const violations = auditLayoutRepository();
  if (violations.length > 0) {
    console.error("Layout governance check failed:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
  } else {
    console.log("Layout governance check passed: canonical page shell and section rhythm are variant-free.");
  }
}
