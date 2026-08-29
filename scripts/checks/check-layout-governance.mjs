import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const webSourceRoot = path.join(repositoryRoot, "apps/web/src");
const primitivePath = path.join(webSourceRoot, "components/ui/cmm-section.tsx");

const structuralUtilities = /(?:^|\s)(?:max-w-|mx-auto|p[xy]?-|space-y-|gap-)/;
const violations = [];

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
