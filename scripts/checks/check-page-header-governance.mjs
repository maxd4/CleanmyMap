import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const webSourceRoot = path.join(repositoryRoot, "apps/web/src");

// Exceptions are intentionally small and mirror documentation/design-system/UI_EXCEPTION_PAGES.md.
const rawH1Allowlist = new Map([
  ["apps/web/src/app/(app)/explorer/page.tsx", "navigation summary composition"],
  ["apps/web/src/app/not-found.tsx", "404 system state"],
  ["apps/web/src/app/onboarding/page.tsx", "onboarding flow shell"],
  ["apps/web/src/app/sign-in/[[...sign-in]]/page.tsx", "Clerk auth branding"],
  ["apps/web/src/app/sign-up/[[...sign-up]]/page.tsx", "Clerk auth branding"],
  ["apps/web/src/components/account/account-setup-form.tsx", "onboarding form step"],
  ["apps/web/src/components/account/user-location-onboarding-form.tsx", "onboarding form step"],
  ["apps/web/src/components/actions/action-declaration-entry-flow.tsx", "declaration flow state"],
  ["apps/web/src/components/actions/action-declaration/before/form.tsx", "declaration sub-form"],
  ["apps/web/src/components/profil/impact-profile-page.tsx", "internal impact label"],
  ["apps/web/src/components/reports/web-document/report-cover.tsx", "PDF/export cover"],
  ["apps/web/src/components/sections/rubriques/connect-section.tsx", "compact messaging sub-view"],
  ["apps/web/src/components/ui/system-state.tsx", "specialized system state"],
  ["apps/web/src/app/docs/[...segments]/route.ts", "generated documentation HTML renderer"],
  ["apps/web/src/lib/actions/exports/export-form-pdf.ts", "PDF/export renderer"],
  ["apps/web/src/lib/pdf-export/generate-pdf-html.ts", "PDF/export renderer"],
  ["apps/web/src/lib/pdf-export/official-report-html.ts", "PDF/export renderer"],
]);

const forbiddenTypographyClass = /(?:^|\s)(?:text-|font-|leading-|tracking-|max-w-|whitespace-|line-clamp-)/;

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
    if (character === "{") {
      curlyDepth += 1;
      continue;
    }
    if (character === "}") {
      curlyDepth = Math.max(0, curlyDepth - 1);
      continue;
    }
    if (character === ">" && curlyDepth === 0) {
      return source.slice(start, index + 1);
    }
  }
  return source.slice(start);
}

function topLevelAttributeValues(tag, attributeName) {
  const values = [];
  let quote = null;
  let curlyDepth = 0;
  for (let index = 0; index < tag.length; index += 1) {
    const character = tag[index];
    if (quote) {
      if (character === quote && tag[index - 1] !== "\\") quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") {
      curlyDepth += 1;
      continue;
    }
    if (character === "}") {
      curlyDepth = Math.max(0, curlyDepth - 1);
      continue;
    }
    if (curlyDepth === 0 && /\s/.test(character)) {
      const match = tag.slice(index + 1).match(
        new RegExp(`^${attributeName}\\s*=\\s*[\\"']([^\\"']*)[\\"']`),
      );
      if (match) values.push(match[1]);
    }
  }
  return values;
}

function hasTopLevelAttribute(tag, attributeName) {
  let quote = null;
  let curlyDepth = 0;
  for (let index = 0; index < tag.length; index += 1) {
    const character = tag[index];
    if (quote) {
      if (character === quote && tag[index - 1] !== "\\") quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") {
      curlyDepth += 1;
      continue;
    }
    if (character === "}") {
      curlyDepth = Math.max(0, curlyDepth - 1);
      continue;
    }
    if (
      curlyDepth === 0 &&
      /\s/.test(character) &&
      new RegExp(`^${attributeName}\\s*=`).test(tag.slice(index + 1))
    ) {
      return true;
    }
  }
  return false;
}

const violations = [];
let pageHeaderCount = 0;
let rawH1Count = 0;

for (const sourcePath of collectSourceFiles(webSourceRoot)) {
  const relative = relativePath(sourcePath);
  const source = fs.readFileSync(sourcePath, "utf8");
  const lines = source.split(/\r?\n/);

  for (const match of source.matchAll(/<PageHeader\b/g)) {
    pageHeaderCount += 1;
    const startLine = source.slice(0, match.index).split(/\r?\n/).length;
    const openingTag = extractOpeningTag(source, match.index);
    if (
      relative !== "apps/web/src/components/ui/page-header.tsx" &&
      ["eyebrow", "badge", "badges", "titleSize", "badgesClassName"].some((attribute) =>
        hasTopLevelAttribute(openingTag, attribute),
      )
    ) {
      violations.push(`${relative}:${startLine}: legacy PageHeader API usage`);
    }
    const localClassValues = topLevelAttributeValues(openingTag, "className");
    if (localClassValues.some((value) => forbiddenTypographyClass.test(value))) {
      violations.push(
        `${relative}:${startLine}: PageHeader wrapper contains a local typography/width override`,
      );
    }
  }

  if (relative === "apps/web/src/components/ui/page-header.tsx") continue;
  for (const match of source.matchAll(/<h1\b/g)) {
    rawH1Count += 1;
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    if (!rawH1Allowlist.has(relative)) {
      violations.push(`${relative}:${line}: raw page heading bypasses PageHeader`);
    }
  }
}

for (const [relative, reason] of rawH1Allowlist) {
  const absolute = path.join(repositoryRoot, relative.replaceAll("/", path.sep));
  if (!fs.existsSync(absolute)) {
    violations.push(`${relative}: allowlisted exception file is missing (${reason})`);
  }
}

if (violations.length > 0) {
  console.error("PageHeader governance check failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(
    `PageHeader governance check passed: ${pageHeaderCount} PageHeader usages, ${rawH1Count} documented specialized raw h1 usages.`,
  );
}
