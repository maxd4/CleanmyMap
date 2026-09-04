import fs from "node:fs";
import path from "node:path";

export const CANONICAL_CONSUMERS = new Set([
  "apps/web/src/components/actions/actions-map-table.tsx",
  "apps/web/src/components/admin/role-management-panel.tsx",
  "apps/web/src/components/dashboard/system-status-panel.tsx",
]);

export const LEGACY_RUNTIME_TABLE_ALLOWLIST = new Set();

export const PRINT_EXPORT_EXCLUSIONS = new Set([
  "apps/web/src/components/reports/web-document/ui.tsx",
]);

const REQUIRED_FILES = {
  styles: "apps/web/src/styles/data-display.css",
  card: "apps/web/src/components/ui/cmm-card.tsx",
  pageStructure: "apps/web/src/components/ui/page-structure.tsx",
  globals: "apps/web/src/app/globals.css",
};

function normalizeRepositoryPath(filePath) {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "");
}

function extractOpeningTags(source, tagName) {
  const tags = [];
  const matcher = new RegExp(`<${tagName}\\b`, "g");

  for (const match of source.matchAll(matcher)) {
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

export function findNativeTableTags(source) {
  return extractOpeningTags(source, "table");
}

function hasCanonicalTableClass(tag) {
  return /\bcmm-data-table\b/.test(tag);
}

function hasColumnScope(tag) {
  return /\bscope\s*=\s*["']col["']/.test(tag);
}

export function auditRuntimeTables(
  entries,
  {
    legacyAllowlist = LEGACY_RUNTIME_TABLE_ALLOWLIST,
    printExportExclusions = PRINT_EXPORT_EXCLUSIONS,
  } = {},
) {
  const violations = [];
  const entryMap = new Map(entries.map((entry) => [normalizeRepositoryPath(entry.path), entry]));

  for (const entry of entries) {
    const filePath = normalizeRepositoryPath(entry.path);
    const tableTags = findNativeTableTags(entry.source);
    if (tableTags.length === 0) continue;

    if (legacyAllowlist.has(filePath) || printExportExclusions.has(filePath)) continue;

    for (const tag of tableTags) {
      if (!hasCanonicalTableClass(tag)) {
        violations.push(`${filePath}: raw runtime table must use cmm-data-table`);
      }
    }
  }

  for (const filePath of legacyAllowlist) {
    const entry = entryMap.get(filePath);
    if (!entry || findNativeTableTags(entry.source).length === 0) {
      violations.push(`${filePath}: stale legacy table exception must be removed from the allowlist`);
    }
  }

  return violations;
}

function absolutePath(repositoryRoot, relativePath) {
  return path.join(repositoryRoot, relativePath.replaceAll("/", path.sep));
}

function readRequired(repositoryRoot, relativePath, violations) {
  const filePath = absolutePath(repositoryRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    violations.push(`${relativePath}: required data-display file is missing`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function collectRuntimeTsx(repositoryRoot) {
  const sourceRoot = absolutePath(repositoryRoot, "apps/web/src");
  const entries = [];

  function visit(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const itemPath = path.join(directory, item.name);
      if (item.isDirectory()) {
        visit(itemPath);
        continue;
      }
      if (!/\.tsx$/.test(item.name) || /\.(?:test|spec)\.tsx$/.test(item.name)) continue;
      entries.push({
        path: normalizeRepositoryPath(path.relative(repositoryRoot, itemPath)),
        source: fs.readFileSync(itemPath, "utf8"),
      });
    }
  }

  if (fs.existsSync(sourceRoot)) visit(sourceRoot);
  return entries;
}

function extractScope(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) return "";
  const end = endMarker ? source.indexOf(endMarker, start + startMarker.length) : -1;
  return source.slice(start, end === -1 ? source.length : end);
}

function requireText(source, filePath, marker, violations) {
  if (!source.includes(marker)) violations.push(`${filePath}: missing canonical marker ${marker}`);
}

function auditCanonicalConsumer(filePath, source, violations) {
  requireText(source, filePath, "cmm-data-table-wrap", violations);
  requireText(source, filePath, "cmm-data-table", violations);

  const tableTags = findNativeTableTags(source);
  if (tableTags.length === 0) {
    violations.push(`${filePath}: canonical consumer must contain a native table`);
  }
  for (const tag of tableTags) {
    if (!hasCanonicalTableClass(tag)) {
      violations.push(`${filePath}: every native table must use cmm-data-table`);
    }
  }

  const headerTags = extractOpeningTags(source, "th");
  if (headerTags.length === 0) {
    violations.push(`${filePath}: canonical consumer must contain column headers`);
  }
  for (const tag of headerTags) {
    if (!hasColumnScope(tag)) {
      violations.push(`${filePath}: every column header must use scope=\"col\"`);
    }
  }
}

export function auditDataDisplayRepository(repositoryRoot) {
  const violations = [];
  const sources = Object.fromEntries(
    Object.entries(REQUIRED_FILES).map(([key, relativePath]) => [
      key,
      readRequired(repositoryRoot, relativePath, violations),
    ]),
  );

  const stylesPath = REQUIRED_FILES.styles;
  for (const marker of [
    ".cmm-data-table-wrap",
    ".cmm-data-table",
    ".cmm-data-table__numeric",
    ".cmm-data-table__end",
    ".cmm-data-table__nowrap",
    'data-density="compact"',
  ]) {
    requireText(sources.styles, stylesPath, marker, violations);
  }
  if (/(?:box-shadow|text-shadow|backdrop-filter|filter|animation(?:-[a-z]+)?|transition)\s*:/i.test(sources.styles)) {
    violations.push(`${stylesPath}: table styles must not define blur, shadow, filter or animation recipes`);
  }

  const globalsPath = REQUIRED_FILES.globals;
  const dataImport = sources.globals.indexOf('@import "../styles/data-display.css";');
  const mapsImport = sources.globals.indexOf('@import "../styles/maps.css";');
  const printImport = sources.globals.indexOf('@import "../styles/print.css";');
  if (dataImport === -1) violations.push(`${globalsPath}: data-display.css import is missing`);
  if (mapsImport === -1 || printImport === -1 || dataImport > mapsImport || dataImport > printImport) {
    violations.push(`${globalsPath}: data-display.css must be imported before maps.css and print.css`);
  }

  const statCardScope = extractScope(
    sources.pageStructure,
    "export function StatCard",
    "export type CTAGroupProps",
  );
  for (const marker of ["CmmCard", "as=\"article\"", "tabular-nums"]) {
    requireText(statCardScope, REQUIRED_FILES.pageStructure, marker, violations);
  }
  if (sources.pageStructure.includes("statCardToneClasses")) {
    violations.push(`${REQUIRED_FILES.pageStructure}: statCardToneClasses must not return`);
  }

  for (const filePath of CANONICAL_CONSUMERS) {
    const source = readRequired(repositoryRoot, filePath, violations);
    auditCanonicalConsumer(filePath, source, violations);
  }

  violations.push(...auditRuntimeTables(collectRuntimeTsx(repositoryRoot)));
  return violations;
}

if (import.meta.main) {
  const repositoryRoot = path.resolve(import.meta.dirname, "../..");
  const violations = auditDataDisplayRepository(repositoryRoot);
  if (violations.length > 0) {
    console.error("Data display governance check failed:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
  } else {
    console.log("Data display governance check passed: canonical KPI/table contracts and bounded raw-table legacy are protected.");
  }
}
