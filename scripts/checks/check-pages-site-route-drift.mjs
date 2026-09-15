#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APP_ROOT = path.join(REPO_ROOT, "apps", "web", "src", "app");
const INDEX_PATH = path.join(REPO_ROOT, "documentation", "pages_site", "INDEX.md");
const ROUTES_ROOT = path.join(REPO_ROOT, "documentation", "pages_site", "routes");
const PAGE_FAMILIES_MANIFEST_PATH = path.join(
  REPO_ROOT,
  "apps",
  "web",
  "src",
  "lib",
  "ui",
  "page-families",
  "page-families.manifest.json",
);
const PAGE_FAMILIES_DOC_PATH = path.join(
  REPO_ROOT,
  "documentation",
  "pages_site",
  "PAGE_FAMILIES.md",
);
const PAGE_FAMILY_RESOLVER_PATH = path.join(
  REPO_ROOT,
  "apps",
  "web",
  "src",
  "lib",
  "ui",
  "page-families",
  "resolve-page-family.ts",
);
const SECTION_REGISTRY_PATH = path.join(
  REPO_ROOT,
  "apps",
  "web",
  "src",
  "lib",
  "sections-registry",
  "config.ts",
);
const PROXY_PATH = path.join(REPO_ROOT, "apps", "web", "src", "proxy.ts");
const ROUTE_CONSTANTS_PATH = path.join(
  REPO_ROOT,
  "apps",
  "web",
  "src",
  "lib",
  "accueil-pilotage-routes.ts",
);

const REQUIRED_SURFACE_ACCESS_ROUTES = new Set([
  "/actions/map",
  "/actions/new",
  "/signalement",
  "/dashboard",
]);

const DOCUMENTED_ACCESS_MODES = [
  "public-visible",
  "auth-blur-gate",
  "auth-disabled-gate",
  "clerk-context",
  "protected",
];

const SECTION_PRESENTATION_TO_ACCESS = new Map([
  ["visible", "public-visible"],
  ["blur", "auth-blur-gate"],
  ["disabled", "auth-disabled-gate"],
]);

const DYNAMIC_ALIASES_HANDLED_INSIDE_ROUTE = new Set([
  "/sections/dm",
  "/sections/guide",
]);
const ALLOWED_FAMILY_DIRECTORIES = new Set(["screenshots"]);
const EXACT_CURRENT_SCOPE_PLACEHOLDER = /^\s*-\s+\*\*Scope\*\*\s*:\s*à corriger\s*$/im;

function normalizeRoute(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed.startsWith("/")) {
    return "";
  }

  const withoutExample = trimmed.replace(/\s+\(ex\..*$/i, "").trim();
  const withoutQuery = withoutExample.split("?")[0]?.split("#")[0] ?? withoutExample;
  const collapsed = withoutQuery.replace(/\/+/g, "/");

  if (collapsed === "/") {
    return "/";
  }

  return collapsed.replace(/\/$/, "");
}

function normalizeRelativePath(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function walkFiles(root, predicate) {
  const files = [];

  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const absolute = path.join(current, entry.name);

      if (entry.isDirectory()) {
        await walk(absolute);
        continue;
      }

      if (entry.isFile() && predicate(absolute, entry.name)) {
        files.push(absolute);
      }
    }
  }

  await walk(root);
  return files.sort((a, b) => a.localeCompare(b, "fr"));
}

function pageFileToRoute(filePath) {
  const relativeParts = path.relative(APP_ROOT, filePath).split(path.sep);
  const routeParts = [];

  for (const part of relativeParts) {
    if (part === "page.tsx") {
      continue;
    }

    if (part.startsWith("(") && part.endsWith(")")) {
      continue;
    }

    if (/^\[\[\.\.\..+\]\]$/.test(part)) {
      continue;
    }

    const catchAll = part.match(/^\[\.\.\.(.+)\]$/);
    if (catchAll) {
      routeParts.push(`[${catchAll[1]}]`);
      continue;
    }

    routeParts.push(part);
  }

  return normalizeRoute(`/${routeParts.join("/")}`);
}

export function extractIndexEntries(content) {
  const entries = [];

  for (const [lineIndex, line] of content.split(/\r?\n/).entries()) {
    if (!line.trim().startsWith("|")) {
      continue;
    }

    const columns = line.split("|").slice(1, -1).map((column) => column.trim());
    if (columns.length < 3) {
      continue;
    }

    const routeMatch = columns[0].match(/`([^`]+)`/);
    if (!routeMatch) {
      continue;
    }

    const route = normalizeRoute(routeMatch[1]);
    if (!route) {
      continue;
    }

    const normalizedLine = line.toLowerCase();
    const readmeMatch = columns[1].match(/\[[^\]]+\]\(([^)]+)\)/);
    const pageType = columns[2].toLowerCase();
    const isAliasOrRedirect =
      pageType.includes("redirection") ||
      pageType.includes("alias") ||
      normalizedLine.includes("`redirect`") ||
      normalizedLine.includes("alias technique") ||
      normalizedLine.includes("redirection");

    const isAwaitingClassification =
      normalizedLine.includes("famille à arbitrer") ||
      normalizedLine.includes("à arbitrer");

    entries.push({
      route,
      pageType: columns[2],
      documentedAccessModes: extractDocumentedAccessModes(columns[2]),
      familyLabel: columns[3] ?? "",
      readmePath: readmeMatch ? readmeMatch[1] : null,
      isAliasOrRedirect,
      isAwaitingClassification,
      isGenericDynamicPattern: route.includes("[sectionId]"),
      line: lineIndex + 1,
    });
  }

  return entries;
}

function extractDocumentedAccessModes(value) {
  const text = String(value ?? "").toLowerCase();
  const modes = DOCUMENTED_ACCESS_MODES.filter((mode) => text.includes(mode));

  if (/(^|\W)public(\W|$)/u.test(text) && !modes.includes("public-visible")) {
    modes.push("public-visible");
  }
  if (/(^|\W)(?:protégé|protégée|protected)(\W|$)/u.test(text)) {
    modes.push("protected");
  }

  return [...new Set(modes)];
}

function groupIndexEntriesByRoute(entries) {
  const grouped = new Map();

  for (const entry of entries) {
    const routeEntries = grouped.get(entry.route) ?? [];
    routeEntries.push(entry);
    grouped.set(entry.route, routeEntries);
  }

  return grouped;
}

function extractSectionRegistryRoutes(content) {
  const routes = new Set();
  const pattern = /route:\s*["'](\/sections\/[^"']+)["']/g;

  for (const match of content.matchAll(pattern)) {
    const route = normalizeRoute(match[1]);
    if (route) {
      routes.add(route);
    }
  }

  return routes;
}

function extractSectionAnonymousPresentations(content) {
  const presentations = new Map();
  const pattern =
    /anonymousPresentation:\s*["'](visible|blur|disabled)["'][\s\S]{0,240}?route:\s*["'](\/sections\/[^"']+)["']/g;

  for (const match of content.matchAll(pattern)) {
    const route = normalizeRoute(match[2]);
    const access = SECTION_PRESENTATION_TO_ACCESS.get(match[1]);
    if (route && access) {
      presentations.set(route, access);
    }
  }

  return presentations;
}

function extractArrayBody(content, name, property = false) {
  const declaration = property
    ? new RegExp(`${name}\\s*:\\s*\\[([\\s\\S]*?)\\]`)
    : new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`);
  return content.match(declaration)?.[1] ?? null;
}

function extractStringConstants(content) {
  const constants = new Map();
  const pattern = /(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*=\s*["']([^"']+)["']/g;

  for (const match of content.matchAll(pattern)) {
    constants.set(match[1], normalizeRoute(match[2]));
  }

  return constants;
}

function extractArrayValues(body, constants = new Map()) {
  if (!body) {
    return [];
  }

  return body
    .replace(/\/\/.*$/gm, "")
    .split(",")
    .map((item) => item.trim())
    .map((item) => {
      const literal = item.match(/^["']([^"']+)["']$/)?.[1];
      if (literal) {
        return literal;
      }

      const identifier = item.match(/^([A-Z][A-Z0-9_]*)$/)?.[1];
      return identifier ? constants.get(identifier) ?? "" : "";
    })
    .filter(Boolean)
    .map(normalizeRoute);
}

function matchesRoutePrefix(route, prefixes) {
  return prefixes.some(
    (prefix) => route === prefix || route.startsWith(`${prefix}/`),
  );
}

export function extractRuntimeSurfaceAccess({
  proxyContent,
  routeConstantsContent = "",
  sectionRegistryContent,
  routes,
}) {
  const constants = new Map([
    ...extractStringConstants(routeConstantsContent),
    ...extractStringConstants(proxyContent),
  ]);
  const protectedPrefixes = extractArrayValues(
    extractArrayBody(proxyContent, "PROTECTED_APP_PAGE_ROUTE_PREFIXES"),
    constants,
  );
  const contextPrefixes = extractArrayValues(
    extractArrayBody(proxyContent, "CLERK_CONTEXT_ROUTE_PREFIXES"),
    constants,
  );
  const matcherPrefixes = extractArrayValues(
    extractArrayBody(proxyContent, "matcher", true),
    constants,
  ).map((value) => value.replace(/\(\.\*\)$/, ""));
  const sectionRoutes = extractSectionRegistryRoutes(sectionRegistryContent);
  const sectionPresentations = extractSectionAnonymousPresentations(
    sectionRegistryContent,
  );
  const unclassifiedSectionRoutes = [...sectionRoutes]
    .filter((route) => !sectionPresentations.has(route))
    .sort((a, b) => a.localeCompare(b, "fr"));
  const accessByRoute = new Map();
  const unresolvedRoutes = [];

  for (const candidate of routes) {
    const route = normalizeRoute(candidate);
    if (!route) {
      continue;
    }

    if (sectionRoutes.has(route)) {
      const access = sectionPresentations.get(route);
      if (access) {
        accessByRoute.set(route, access);
      }
      continue;
    }

    if (matchesRoutePrefix(route, protectedPrefixes)) {
      accessByRoute.set(route, "protected");
      continue;
    }

    if (matchesRoutePrefix(route, contextPrefixes)) {
      accessByRoute.set(route, "clerk-context");
      continue;
    }

    if (matchesRoutePrefix(route, matcherPrefixes)) {
      unresolvedRoutes.push({
        route,
        reason: "route couverte par le matcher sans classification de surface",
      });
      continue;
    }

    // Absence from the proxy matcher is evidence that the proxy does not
    // impose a page gate, not a blanket authorization decision. This is used
    // for the public page surfaces covered by this check (not for APIs).
    accessByRoute.set(route, "public-visible");
  }

  return {
    accessByRoute,
    unclassifiedSectionRoutes,
    unresolvedRoutes,
  };
}

function documentedModesFor(value, fallback = []) {
  if (Array.isArray(value?.documentedAccessModes)) {
    return value.documentedAccessModes;
  }

  return extractDocumentedAccessModes(value?.pageType ?? fallback);
}

export function hasExactCurrentScopePlaceholder(content) {
  return EXACT_CURRENT_SCOPE_PLACEHOLDER.test(String(content ?? ""));
}

function accessMismatch({ route, source, expected, modes }) {
  const conflicts = modes.filter((mode) => mode !== expected);
  if (modes.includes(expected) && conflicts.length === 0) {
    return null;
  }

  return {
    route,
    source,
    expected,
    documented: modes,
  };
}

export function validateDocumentedAccessCoherence({
  indexEntries,
  routeDocs,
  runtimeAccessByRoute,
  unclassifiedSectionRoutes = [],
  unresolvedRoutes = [],
}) {
  const documentedAccessContradictions = [];
  const canonicalEntries = indexEntries.filter(isCanonicalIndexEntry);

  for (const [route, expected] of runtimeAccessByRoute) {
    for (const entry of canonicalEntries.filter((item) => item.route === route)) {
      const mismatch = accessMismatch({
        route,
        source: "INDEX.md",
        expected,
        modes: documentedModesFor(entry),
      });
      if (mismatch) {
        documentedAccessContradictions.push({ ...mismatch, line: entry.line });
      }
    }

    for (const doc of routeDocs.filter(
      (item) => item.route === route && !item.isAlias && !item.isGenericDynamicPattern,
    )) {
      if (!Array.isArray(doc.documentedAccessModes) || doc.documentedAccessModes.length === 0) {
        // A fiche may omit an access assertion. This check detects an
        // explicit contradiction; it does not invent a public fallback.
        continue;
      }

      const mismatch = accessMismatch({
        route,
        source: doc.readme,
        expected,
        modes: doc.documentedAccessModes,
      });
      if (mismatch) {
        documentedAccessContradictions.push(mismatch);
      }
    }
  }

  const runtimeAccessErrors = [
    ...unclassifiedSectionRoutes.map(
      (route) => `${route} : anonymousPresentation absent du registre runtime`,
    ),
    ...unresolvedRoutes.map(
      ({ route, reason }) => `${route} : ${reason}`,
    ),
  ];

  return { documentedAccessContradictions, runtimeAccessErrors };
}

async function fileExists(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

function routeDocPackageKey(readmePath) {
  const relativeToRoutes = normalizeRelativePath(path.relative(ROUTES_ROOT, readmePath));
  const parts = relativeToRoutes.split("/");
  if (parts.length !== 3) {
    return null;
  }

  return `${parts[0]}/${parts[1]}`;
}

async function loadCanonicalRouteDocs(indexEntries) {
  const routeDocs = [];
  const incompleteNuclei = [];
  const canonicalReadmesWithScopePlaceholder = [];
  const indexReadmeTargetsMissing = [];
  const indexReadmeTargetsOutsideRoutes = [];

  for (const entry of indexEntries) {
    if (!entry.readmePath) {
      continue;
    }

    const readmePath = path.resolve(path.dirname(INDEX_PATH), entry.readmePath);
    const relativeReadme = normalizeRelativePath(path.relative(REPO_ROOT, readmePath));

    if (!isWithin(ROUTES_ROOT, readmePath)) {
      indexReadmeTargetsOutsideRoutes.push({
        route: entry.route,
        readme: relativeReadme,
        line: entry.line,
      });
      continue;
    }

    if (!(await fileExists(readmePath))) {
      indexReadmeTargetsMissing.push({
        route: entry.route,
        readme: relativeReadme,
        line: entry.line,
      });
      continue;
    }

    const readmeContent = await fs.readFile(readmePath, "utf8");

    if (!entry.isAliasOrRedirect && !entry.isGenericDynamicPattern && hasExactCurrentScopePlaceholder(readmeContent)) {
      canonicalReadmesWithScopePlaceholder.push({
        route: entry.route,
        readme: relativeReadme,
        line: entry.line,
      });
    }

    routeDocs.push({
      route: entry.route,
      readme: relativeReadme,
      packageKey: routeDocPackageKey(readmePath),
      isAlias: entry.isAliasOrRedirect,
      isGenericDynamicPattern: entry.isGenericDynamicPattern,
      documentedAccessModes: extractDocumentedAccessModes(
        [...readmeContent.matchAll(/^\s*-\s+\*\*(Accès runtime|Statut)\*\*\s*:\s*(.*)$/gim)]
          .map((match) => match[2])
          .join(" "),
      ),
      line: entry.line,
    });

    if (entry.isAliasOrRedirect || entry.isGenericDynamicPattern) {
      continue;
    }

    const filename = path.basename(readmePath);
    const prefix = filename.slice(0, -"-README.md".length);
    const directory = path.dirname(readmePath);
    const companionNames = [
      `${prefix}-presentation-detaillee.md`,
      `${prefix}-liste-propositions-a-traiter.md`,
      `${prefix}-objectifs-non-pertinents.md`,
    ];

    const companionPresence = await Promise.all(
      companionNames.map((fileName) => fileExists(path.join(directory, fileName))),
    );

    if (!companionPresence.some(Boolean)) {
      continue;
    }

    const missing = [];
    for (const requiredName of [filename, ...companionNames]) {
      if (!(await fileExists(path.join(directory, requiredName)))) {
        missing.push(requiredName);
      }
    }

    if (missing.length > 0) {
      incompleteNuclei.push({
        route: entry.route,
        readme: relativeReadme,
        missing,
      });
    }
  }

  return {
    routeDocs,
    incompleteNuclei,
    canonicalReadmesWithScopePlaceholder,
    indexReadmeTargetsMissing,
    indexReadmeTargetsOutsideRoutes,
  };
}

async function loadRoutePackages(manifestDocKeys) {
  const packages = [];
  const unexpectedFamilyDirectories = [];
  const familyEntries = await fs.readdir(ROUTES_ROOT, { withFileTypes: true });

  for (const familyEntry of familyEntries) {
    if (!familyEntry.isDirectory()) {
      continue;
    }

    const family = familyEntry.name;
    const familyPath = path.join(ROUTES_ROOT, family);
    if (!manifestDocKeys.has(family)) {
      unexpectedFamilyDirectories.push(
        normalizeRelativePath(path.relative(REPO_ROOT, familyPath)),
      );
    }
    const childEntries = await fs.readdir(familyPath, { withFileTypes: true });

    for (const childEntry of childEntries) {
      if (!childEntry.isDirectory() || ALLOWED_FAMILY_DIRECTORIES.has(childEntry.name)) {
        continue;
      }

      const packagePath = path.join(familyPath, childEntry.name);
      // Git cannot version empty directories. Ignore filesystem-only remnants
      // while still checking any directory that contains a real artifact.
      const packageFilesOnDisk = await walkFiles(packagePath, () => true);
      if (packageFilesOnDisk.length === 0) {
        continue;
      }
      const packageFiles = await fs.readdir(packagePath, { withFileTypes: true });
      const canonicalReadmes = packageFiles
        .filter((entry) => entry.isFile() && entry.name.endsWith("-README.md"))
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b, "fr"));

      packages.push({
        key: `${family}/${childEntry.name}`,
        family,
        name: childEntry.name,
        path: normalizeRelativePath(path.relative(REPO_ROOT, packagePath)),
        canonicalReadmes,
      });
    }
  }

  return { packages, unexpectedFamilyDirectories };
}

function extractPageFamiliesDocKeys(content) {
  const docKeys = [];
  const taxonomy = content.split("## Routage structurant", 1)[0].split("## Taxonomie")[1] ?? "";

  for (const line of taxonomy.split(/\r?\n/)) {
    const columns = line.split("|").slice(1, -1).map((column) => column.trim());
    if (columns.length < 3) {
      continue;
    }

    const docKey = columns[0].match(/^`([^`]+)`$/)?.[1];
    const runtimeId = columns[1].match(/^`([^`]+)`$/)?.[1];
    if (docKey && runtimeId) {
      docKeys.push({ docKey, runtimeId });
    }
  }

  return docKeys;
}

async function loadPageFamilyContract() {
  const [manifestContent, pageFamiliesContent] = await Promise.all([
    fs.readFile(PAGE_FAMILIES_MANIFEST_PATH, "utf8"),
    fs.readFile(PAGE_FAMILIES_DOC_PATH, "utf8"),
  ]);
  const manifest = JSON.parse(manifestContent);
  const manifestEntries = Array.isArray(manifest) ? manifest : [];
  const manifestByRuntimeId = new Map(
    manifestEntries.map((entry) => [entry.runtimeId, entry]),
  );
  const manifestDocKeys = new Set(manifestEntries.map((entry) => entry.docKey));
  const documentedFamilies = extractPageFamiliesDocKeys(pageFamiliesContent);
  const documentedByRuntimeId = new Map(
    documentedFamilies.map((entry) => [entry.runtimeId, entry]),
  );
  const errors = [];

  if (!Array.isArray(manifest) || manifestEntries.length === 0) {
    errors.push("page-families.manifest.json doit être un tableau non vide");
  }

  if (manifestByRuntimeId.size !== manifestEntries.length) {
    errors.push("page-families.manifest.json contient des runtimeId dupliqués");
  }

  if (manifestDocKeys.size !== manifestEntries.length) {
    errors.push("page-families.manifest.json contient des docKey dupliqués");
  }

  const manifestEntriesWithoutFallback = manifestEntries.filter(
    (entry) => entry.runtimeId !== "secours",
  );

  if (documentedByRuntimeId.size !== manifestEntriesWithoutFallback.length) {
    errors.push(
      "PAGE_FAMILIES.md ne reprend pas exactement les familles documentaires du manifeste courant",
    );
  }

  for (const entry of manifestEntriesWithoutFallback) {
    const documented = documentedByRuntimeId.get(entry.runtimeId);
    if (!documented || documented.docKey !== entry.docKey) {
      errors.push(
        `PAGE_FAMILIES.md diverge du manifeste pour ${entry.runtimeId}`,
      );
    }
  }

  return { manifestByRuntimeId, manifestDocKeys, errors };
}

async function loadRuntimePageFamilyResolver() {
  try {
    const { createJiti } = await import("jiti");
    const jiti = createJiti(REPO_ROOT, {
      alias: { "@": path.join(REPO_ROOT, "apps", "web", "src") },
    });
    const resolver = await jiti.import(PAGE_FAMILY_RESOLVER_PATH);
    if (typeof resolver.resolvePageFamily !== "function") {
      throw new Error("resolvePageFamily export introuvable");
    }
    return resolver.resolvePageFamily;
  } catch (error) {
    return {
      error:
        `Impossible de charger resolvePageFamily depuis ${normalizeRelativePath(
          path.relative(REPO_ROOT, PAGE_FAMILY_RESOLVER_PATH),
        )}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function difference(left, right) {
  return [...left].filter((value) => !right.has(value)).sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
}

function isCanonicalIndexEntry(entry) {
  return (
    !entry.isAliasOrRedirect &&
    !entry.isAwaitingClassification &&
    !entry.isGenericDynamicPattern &&
    !DYNAMIC_ALIASES_HANDLED_INSIDE_ROUTE.has(entry.route)
  );
}

export function validateRoutePackageLayout({
  indexEntries,
  routeDocs,
  packages,
  runtimeFamilyByRoute = new Map(),
  manifestDocKeys = new Set(),
}) {
  const indexEntriesByRoute = groupIndexEntriesByRoute(indexEntries);
  const routeDocsByRoute = new Map();
  const canonicalEntries = indexEntries.filter(isCanonicalIndexEntry);
  const packageReferences = new Map();
  const packageRoutes = new Map();
  const duplicateIndexRoutes = [];
  const canonicalRoutesWithMultipleDocs = [];
  const canonicalRoutesMissingPackage = [];
  const aliasesWithCanonicalPackages = [];
  const genericPatternsWithCanonicalPackages = [];
  const orphanPagePackages = [];
  const packagesWithMultipleCanonicalRoutes = [];
  const packagesWithInvalidCanonicalReadmes = [];
  const packageIdentityMismatches = [];
  const canonicalRoutesWithWrongPackageFamily = [];
  const invalidCanonicalReadmeLocations = [];

  for (const [route, entries] of indexEntriesByRoute) {
    if (entries.length > 1) {
      duplicateIndexRoutes.push({ route, lines: entries.map((entry) => entry.line) });
    }
  }

  for (const doc of routeDocs) {
    const docs = routeDocsByRoute.get(doc.route) ?? [];
    docs.push(doc);
    routeDocsByRoute.set(doc.route, docs);

    if (doc.packageKey) {
      const references = packageReferences.get(doc.packageKey) ?? [];
      references.push(doc.route);
      packageReferences.set(doc.packageKey, references);
    }
  }

  for (const entry of canonicalEntries) {
    const docs = routeDocsByRoute.get(entry.route) ?? [];
    const canonicalDocs = docs.filter(
      (doc) => !doc.isAlias && !doc.isGenericDynamicPattern,
    );

    if (canonicalDocs.length === 0) {
      canonicalRoutesMissingPackage.push({ route: entry.route });
      continue;
    }

    if (canonicalDocs.length > 1) {
      canonicalRoutesWithMultipleDocs.push({
        route: entry.route,
        readmes: canonicalDocs.map((doc) => doc.readme),
      });
    }

    for (const doc of canonicalDocs) {
      if (!doc.packageKey) {
        invalidCanonicalReadmeLocations.push({ route: entry.route, readme: doc.readme });
        continue;
      }

      const packageRoutesForDoc = packageRoutes.get(doc.packageKey) ?? [];
      packageRoutesForDoc.push(entry.route);
      packageRoutes.set(doc.packageKey, packageRoutesForDoc);
    }
  }

  for (const entry of indexEntries) {
    if (!entry.readmePath) {
      continue;
    }

    const docs = routeDocsByRoute.get(entry.route) ?? [];
    const hasPackage = docs.some((doc) => Boolean(doc.packageKey));
    if (entry.isAliasOrRedirect && hasPackage) {
      aliasesWithCanonicalPackages.push({ route: entry.route });
    }
    if (entry.isGenericDynamicPattern && hasPackage) {
      genericPatternsWithCanonicalPackages.push({ route: entry.route });
    }
  }

  for (const packageEntry of packages) {
    const linkedRoutes = [...new Set(packageReferences.get(packageEntry.key) ?? [])];
    const canonicalRoutes = [...new Set(packageRoutes.get(packageEntry.key) ?? [])];
    const readmes = packageEntry.canonicalReadmes;

    if (readmes.length !== 1) {
      packagesWithInvalidCanonicalReadmes.push({
        package: packageEntry.path,
        canonicalReadmes: readmes,
      });
    }

    if (readmes.length === 1 && readmes[0] !== `${packageEntry.name}-README.md`) {
      packageIdentityMismatches.push({
        package: packageEntry.path,
        expected: `${packageEntry.name}-README.md`,
        actual: readmes[0],
      });
    }

    if (linkedRoutes.length === 0) {
      orphanPagePackages.push({
        package: packageEntry.path,
        reason:
          readmes.length === 0
            ? "aucune fiche *-README.md canonique"
            : "aucune route canonique de INDEX.md ne pointe vers la fiche",
      });
      continue;
    }

    if (canonicalRoutes.length > 1) {
      packagesWithMultipleCanonicalRoutes.push({
        package: packageEntry.path,
        routes: canonicalRoutes,
      });
    }

    for (const route of canonicalRoutes) {
      const expectedFamily = runtimeFamilyByRoute.get(route);
      if (expectedFamily && packageEntry.family !== expectedFamily) {
        canonicalRoutesWithWrongPackageFamily.push({
          route,
          package: packageEntry.path,
          expectedFamily,
          actualFamily: packageEntry.family,
        });
      }
    }
  }

  const unknownPackageFamilies = packages
    .filter((entry) => !manifestDocKeys.has(entry.family))
    .map((entry) => entry.path);

  return {
    duplicateIndexRoutes,
    canonicalRoutesWithMultipleDocs,
    canonicalRoutesMissingPackage,
    aliasesWithCanonicalPackages,
    genericPatternsWithCanonicalPackages,
    orphanPagePackages,
    packagesWithMultipleCanonicalRoutes,
    packagesWithInvalidCanonicalReadmes,
    packageIdentityMismatches,
    canonicalRoutesWithWrongPackageFamily,
    invalidCanonicalReadmeLocations,
    unknownPackageFamilies,
  };
}

function toMarkdownList(items, emptyLabel = "Aucun.") {
  if (items.length === 0) {
    return emptyLabel;
  }

  return items.map((item) => `- \`${item}\``).join("\n");
}

function toMarkdownJsonList(items, emptyLabel = "Aucun.") {
  if (items.length === 0) {
    return emptyLabel;
  }

  return items.map((item) => `- \`${JSON.stringify(item)}\``).join("\n");
}

export async function runPagesSiteRouteDriftAudit() {
  const [
    pageFiles,
    indexContent,
    proxyContent,
    routeConstantsContent,
    sectionRegistryContent,
    pageFamilyContract,
  ] =
    await Promise.all([
      walkFiles(APP_ROOT, (_absolute, name) => name === "page.tsx"),
      fs.readFile(INDEX_PATH, "utf8"),
      fs.readFile(PROXY_PATH, "utf8"),
      fs.readFile(ROUTE_CONSTANTS_PATH, "utf8"),
      fs.readFile(SECTION_REGISTRY_PATH, "utf8"),
      loadPageFamilyContract(),
    ]);

  const indexEntries = extractIndexEntries(indexContent);
  const docs = await loadCanonicalRouteDocs(indexEntries);
  const { packages, unexpectedFamilyDirectories } = await loadRoutePackages(
    pageFamilyContract.manifestDocKeys,
  );
  const resolver = await loadRuntimePageFamilyResolver();
  const codeRoutes = new Set(pageFiles.map(pageFileToRoute).filter(Boolean));
  const sectionRoutes = extractSectionRegistryRoutes(sectionRegistryContent);
  const indexRoutes = new Set(indexEntries.map((entry) => entry.route));
  const canonicalDocRoutes = new Set(
    docs.routeDocs
      .filter((entry) => !entry.isAlias && !entry.isGenericDynamicPattern)
      .map((entry) => entry.route)
      .filter(Boolean),
  );

  const runtimeRoutes = new Set([
    ...codeRoutes,
    ...sectionRoutes,
    ...DYNAMIC_ALIASES_HANDLED_INSIDE_ROUTE,
  ]);

  const codeRoutesMissingFromIndex = difference(codeRoutes, indexRoutes);
  const sectionRoutesMissingFromIndex = difference(sectionRoutes, indexRoutes);
  const indexRoutesMissingFromRuntime = difference(indexRoutes, runtimeRoutes);
  const routesRequiringCanonicalDoc = new Set(
    indexEntries.filter(isCanonicalIndexEntry).map((entry) => entry.route),
  );
  const indexRoutesMissingCanonicalDoc = difference(
    routesRequiringCanonicalDoc,
    canonicalDocRoutes,
  );

  const runtimeFamilyByRoute = new Map();
  const runtimeFamilyErrors = [];
  if (typeof resolver === "function") {
    for (const entry of indexEntries.filter(isCanonicalIndexEntry)) {
      try {
        const resolved = resolver(entry.route);
        if (resolved.id === "secours") {
          // The resolver documents `secours` as an explicit runtime fallback;
          // it is intentionally not a documentary family in the manifest.
          continue;
        }
        const manifestEntry = pageFamilyContract.manifestByRuntimeId.get(resolved.id);
        if (!manifestEntry) {
          runtimeFamilyErrors.push(
            `${entry.route} résout vers une famille absente du manifeste: ${resolved.id}`,
          );
          continue;
        }
        // `resolvePageFamily` exposes the visual family. Named exceptions and
        // the explicit secours fallback do not define the documentary folder:
        // their package remains governed by INDEX.md and the package layout.
        if (!resolved.exceptionId && resolved.id !== "secours") {
          runtimeFamilyByRoute.set(entry.route, manifestEntry.docKey);
        }
      } catch (error) {
        runtimeFamilyErrors.push(
          `${entry.route}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  } else {
    runtimeFamilyErrors.push(resolver.error);
  }

  const packageLayout = validateRoutePackageLayout({
    indexEntries,
    routeDocs: docs.routeDocs,
    packages,
    runtimeFamilyByRoute,
    manifestDocKeys: pageFamilyContract.manifestDocKeys,
  });

  const canonicalIndexRoutes = new Set(
    indexEntries.filter(isCanonicalIndexEntry).map((entry) => entry.route),
  );
  const accessRoutes = [
    ...REQUIRED_SURFACE_ACCESS_ROUTES,
    ...[...sectionRoutes].filter((route) => canonicalIndexRoutes.has(route)),
  ];
  const runtimeSurfaceAccess = extractRuntimeSurfaceAccess({
    proxyContent,
    routeConstantsContent,
    sectionRegistryContent,
    routes: accessRoutes,
  });
  const accessCoherence = validateDocumentedAccessCoherence({
    indexEntries,
    routeDocs: docs.routeDocs,
    runtimeAccessByRoute: runtimeSurfaceAccess.accessByRoute,
    unclassifiedSectionRoutes: runtimeSurfaceAccess.unclassifiedSectionRoutes,
    unresolvedRoutes: runtimeSurfaceAccess.unresolvedRoutes,
  });

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      codeRoutes: codeRoutes.size,
      sectionRoutes: sectionRoutes.size,
      indexRoutes: indexRoutes.size,
      canonicalRouteDocs: canonicalDocRoutes.size,
      pagePackages: packages.length,
    },
    codeRoutesMissingFromIndex,
    sectionRoutesMissingFromIndex,
    indexRoutesMissingFromRuntime,
    indexRoutesMissingCanonicalDoc,
    incompleteNuclei: docs.incompleteNuclei,
    canonicalReadmesWithScopePlaceholder: docs.canonicalReadmesWithScopePlaceholder,
    indexReadmeTargetsMissing: docs.indexReadmeTargetsMissing,
    indexReadmeTargetsOutsideRoutes: docs.indexReadmeTargetsOutsideRoutes,
    pageFamilyContractErrors: pageFamilyContract.errors,
    runtimeFamilyErrors,
    unexpectedFamilyDirectories,
    ...accessCoherence,
    ...packageLayout,
  };
}

export function hasPagesSiteRouteDrift(report) {
  return [
    report.codeRoutesMissingFromIndex,
    report.sectionRoutesMissingFromIndex,
    report.indexRoutesMissingFromRuntime,
    report.indexRoutesMissingCanonicalDoc,
    report.incompleteNuclei,
    report.indexReadmeTargetsMissing,
    report.indexReadmeTargetsOutsideRoutes,
    report.pageFamilyContractErrors,
    report.runtimeFamilyErrors,
    report.duplicateIndexRoutes,
    report.canonicalRoutesWithMultipleDocs,
    report.canonicalRoutesMissingPackage,
    report.aliasesWithCanonicalPackages,
    report.genericPatternsWithCanonicalPackages,
    report.orphanPagePackages,
    report.packagesWithMultipleCanonicalRoutes,
    report.packagesWithInvalidCanonicalReadmes,
    report.packageIdentityMismatches,
    report.canonicalRoutesWithWrongPackageFamily,
    report.invalidCanonicalReadmeLocations,
    report.unknownPackageFamilies,
    report.unexpectedFamilyDirectories,
    report.documentedAccessContradictions,
    report.runtimeAccessErrors,
    report.canonicalReadmesWithScopePlaceholder,
  ].some((items) => items.length > 0);
}

export function renderPagesSiteRouteDriftMarkdown(report) {
  const incompleteNuclei =
    report.incompleteNuclei.length === 0
      ? "Aucun."
      : report.incompleteNuclei
          .map(
            (entry) =>
              `- \`${entry.route}\` — \`${entry.readme}\`\n` +
              entry.missing.map((name) => `  - manque \`${name}\``).join("\n"),
          )
          .join("\n");

  return `# Audit de dérive \`pages_site\`

Généré : \`${report.generatedAt}\`

## Comptes

- routes \`page.tsx\` : ${report.counts.codeRoutes}
- routes de sections dans le registre : ${report.counts.sectionRoutes}
- routes inventoriées dans \`INDEX.md\` : ${report.counts.indexRoutes}
- fiches canoniques : ${report.counts.canonicalRouteDocs}
- packages de pages détectés : ${report.counts.pagePackages}

## Routes code absentes de l'index

${toMarkdownList(report.codeRoutesMissingFromIndex)}

## Routes de sections absentes de l'index

${toMarkdownList(report.sectionRoutesMissingFromIndex)}

## Routes d'index sans route runtime correspondante

${toMarkdownList(report.indexRoutesMissingFromRuntime)}

## Routes d'index sans fiche canonique dédiée

${toMarkdownList(report.indexRoutesMissingCanonicalDoc)}

## Duplications de routes ou fiches

${toMarkdownJsonList(report.duplicateIndexRoutes)}

${toMarkdownJsonList(report.canonicalRoutesWithMultipleDocs)}

## Packages invalides ou orphelins

${toMarkdownJsonList(report.canonicalRoutesMissingPackage)}

${toMarkdownJsonList(report.orphanPagePackages)}

${toMarkdownJsonList(report.packagesWithInvalidCanonicalReadmes)}

${toMarkdownJsonList(report.packageIdentityMismatches)}

## Familles

### Routes dans une mauvaise famille runtime

${toMarkdownJsonList(report.canonicalRoutesWithWrongPackageFamily)}

### Familles de packages inconnues

${toMarkdownList(report.unknownPackageFamilies)}

### Dossiers de familles inconnus

${toMarkdownList(report.unexpectedFamilyDirectories)}

### Contrat manifeste / documentation

${toMarkdownList(report.pageFamilyContractErrors)}

### Resolver runtime

${toMarkdownList(report.runtimeFamilyErrors)}

## Accès documentaire vs runtime

### Contradictions documentées

${toMarkdownJsonList(report.documentedAccessContradictions)}

### Contrat runtime indéterminé ou incomplet

${toMarkdownList(report.runtimeAccessErrors)}

## Placeholders de métadonnées CURRENT

${toMarkdownJsonList(report.canonicalReadmesWithScopePlaceholder)}

## Packages autonomes interdits

### Alias avec package canonique

${toMarkdownJsonList(report.aliasesWithCanonicalPackages)}

### Pattern dynamique générique avec package canonique

${toMarkdownJsonList(report.genericPatternsWithCanonicalPackages)}

### Un package pour plusieurs routes canoniques

${toMarkdownJsonList(report.packagesWithMultipleCanonicalRoutes)}

### Fiche canonique hors package

${toMarkdownJsonList(report.invalidCanonicalReadmeLocations)}

## Liens INDEX invalides

### Fiche absente

${toMarkdownJsonList(report.indexReadmeTargetsMissing)}

### Fiche hors de routes/

${toMarkdownJsonList(report.indexReadmeTargetsOutsideRoutes)}

## Noyaux documentaires incomplets

${incompleteNuclei}
`;
}

async function main() {
  const args = process.argv.slice(2);
  const strict = args.includes("--strict");
  const reportIndex = args.indexOf("--report");
  const reportPath =
    reportIndex >= 0 && args[reportIndex + 1]
      ? path.resolve(REPO_ROOT, args[reportIndex + 1])
      : null;

  const report = await runPagesSiteRouteDriftAudit();
  const markdown = renderPagesSiteRouteDriftMarkdown(report);

  process.stdout.write(`${markdown}\n`);

  if (reportPath) {
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, markdown, "utf8");
    console.log(`Rapport écrit dans ${path.relative(REPO_ROOT, reportPath)}`);
  }

  if (strict && hasPagesSiteRouteDrift(report)) {
    process.exitCode = 1;
  }
}

const isDirectExecution =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
