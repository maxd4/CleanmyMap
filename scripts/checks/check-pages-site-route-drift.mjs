#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  DYNAMIC_ALIASES_HANDLED_INSIDE_ROUTE,
  REQUIRED_SURFACE_ACCESS_ROUTES,
  extractIndexEntries,
  extractRuntimeSurfaceAccess,
  extractSectionRegistryRoutes,
  pageFileToRoute,
} from "./pages-site-route-drift-routes.mjs";
import {
  hasExactCurrentScopePlaceholder,
  loadCanonicalRouteDocs,
  loadPageFamilyContract,
  loadRoutePackages,
  loadRuntimePageFamilyResolver,
  walkFiles,
} from "./pages-site-route-drift-documents.mjs";
import {
  hasPagesSiteRouteDrift,
  renderPagesSiteRouteDriftMarkdown,
  validateDocumentedAccessCoherence,
  validateRoutePackageLayout,
} from "./pages-site-route-drift-report.mjs";

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

export {
  extractIndexEntries,
  extractRuntimeSurfaceAccess,
  hasExactCurrentScopePlaceholder,
  hasPagesSiteRouteDrift,
  renderPagesSiteRouteDriftMarkdown,
  validateDocumentedAccessCoherence,
  validateRoutePackageLayout,
};

function difference(left, right) {
  return [...left].filter((value) => !right.has(value)).sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
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
      loadPageFamilyContract({
        manifestPath: PAGE_FAMILIES_MANIFEST_PATH,
        pageFamiliesDocPath: PAGE_FAMILIES_DOC_PATH,
      }),
    ]);

  const indexEntries = extractIndexEntries(indexContent);
  const docs = await loadCanonicalRouteDocs({
    indexEntries,
    indexPath: INDEX_PATH,
    repoRoot: REPO_ROOT,
    routesRoot: ROUTES_ROOT,
  });
  const { packages, unexpectedFamilyDirectories } = await loadRoutePackages({
    manifestDocKeys: pageFamilyContract.manifestDocKeys,
    routesRoot: ROUTES_ROOT,
    repoRoot: REPO_ROOT,
  });
  const resolver = await loadRuntimePageFamilyResolver({
    repoRoot: REPO_ROOT,
    resolverPath: PAGE_FAMILY_RESOLVER_PATH,
  });
  const codeRoutes = new Set(
    pageFiles.map((pageFile) => pageFileToRoute(pageFile, APP_ROOT)).filter(Boolean),
  );
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
    indexEntries
      .filter(
        (entry) =>
          !entry.isAliasOrRedirect &&
          !entry.isAwaitingClassification &&
          !entry.isGenericDynamicPattern &&
          !DYNAMIC_ALIASES_HANDLED_INSIDE_ROUTE.has(entry.route),
      )
      .map((entry) => entry.route),
  );
  const indexRoutesMissingCanonicalDoc = difference(
    routesRequiringCanonicalDoc,
    canonicalDocRoutes,
  );

  const runtimeFamilyByRoute = new Map();
  const runtimeFamilyErrors = [];
  if (typeof resolver === "function") {
    for (const entry of indexEntries.filter(
      (item) =>
        !item.isAliasOrRedirect &&
        !item.isAwaitingClassification &&
        !item.isGenericDynamicPattern &&
        !DYNAMIC_ALIASES_HANDLED_INSIDE_ROUTE.has(item.route),
    )) {
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
    indexEntries
      .filter(
        (entry) =>
          !entry.isAliasOrRedirect &&
          !entry.isAwaitingClassification &&
          !entry.isGenericDynamicPattern &&
          !DYNAMIC_ALIASES_HANDLED_INSIDE_ROUTE.has(entry.route),
      )
      .map((entry) => entry.route),
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
