#!/usr/bin/env node
/**
 * Audit canonique de la surface produit et de l'accessibilité des routes.
 *
 * Ce rapport ne remplace ni INDEX.md ni les gates SEO/dead-code. Il compose
 * leurs sources et conserve les décisions de suppression hors de l'automate.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  extractIndexEntries,
  extractRuntimeSurfaceAccess,
} from "../checks/pages-site-route-drift-routes.mjs";
import {
  createRepositoryView,
  parseRepositoryRef,
} from "../checks/repository-view.mjs";
import {
  REPOSITORY_ROOT,
  OUTPUT_PATH,
  APP_ROOT,
  RUNTIME_ROOT,
  INDEX_PATH,
  PROXY_PATH,
  ROUTE_CONSTANTS_PATH,
  SECTION_REGISTRY_PATH,
  NAVIGATION_PATH,
  SEO_INDEXABILITY_PATH,
  resolveRef,
  normalizeRouteTarget,
  isSourceFileIncluded,
  routePatternMatches,
  routeFilePattern,
  collectRuntimeReferences,
  isRedirectOnlyRouteSource,
  extractRegistryEntries,
  extractNavigationRouteIds,
  extractRuntimeRouteDefinitions,
  extractSitemapPaths,
  extractSeoRedirects,
  extractRouteConstants,
} from "./generate-product-surface-collection.mjs";
import {
  formatRows,
  classifySurfaceRoute,
  routeMatchesAny,
  findUnresolvedRuntimeTargets,
  classifyUnresolvedRuntimeReferences,
} from "./generate-product-surface-classification.mjs";
import {
  renderProductSurfaceAudit,
  readPreservedHumanDecisions,
} from "./generate-product-surface-report.mjs";

function buildDocumentationMap(indexEntries, view) {
  return new Map(indexEntries.map((entry) => [entry.route, {
    ...entry,
    documentationStatus: entry.readmePath
      ? view.isFile(path.posix.join("documentation/pages_site", entry.readmePath.replace(/^\.\//, ""))) ? (entry.isAliasOrRedirect ? "CURRENT_ALIAS" : "CURRENT_INDEX") : "INDEX_FICHE_ABSENTE"
      : "INDEX_SANS_FICHE",
  }]));
}

export function buildProductSurfaceReport({ root = REPOSITORY_ROOT, ref }) {
  const refInfo = resolveRef(ref, root);
  const view = createRepositoryView({ root, ref: refInfo.resolved });
  const indexContent = view.readText(INDEX_PATH);
  const proxyContent = view.readText(PROXY_PATH);
  const routeConstantsContent = view.readText(ROUTE_CONSTANTS_PATH);
  const sectionRegistryContent = view.readText(SECTION_REGISTRY_PATH);
  const navigationContent = view.readText(NAVIGATION_PATH);
  const seoContent = view.readText(SEO_INDEXABILITY_PATH);
  const registryEntries = extractRegistryEntries(
    sectionRegistryContent,
    extractRouteConstants(routeConstantsContent),
  );
  const indexEntries = extractIndexEntries(indexContent);
  const documentationByRoute = buildDocumentationMap(indexEntries, view);
  const { routes: runtimeRoutes, handlers: handlerRoutes } = extractRuntimeRouteDefinitions(view, root);
  const runtimeFiles = new Map(view.listFiles(RUNTIME_ROOT).filter(isSourceFileIncluded).map((file) => [file, view.readText(file)]));
  const references = collectRuntimeReferences(runtimeFiles)
    .filter((reference) => reference.source !== SECTION_REGISTRY_PATH)
    .filter((reference) => !reference.source.startsWith(`${APP_ROOT}/api/`));
  const redirects = extractSeoRedirects(seoContent);
  for (const reference of references.filter((item) => item.kind === "redirect")) {
    const source = reference.source.startsWith(`${APP_ROOT}/`) ? routeFilePattern(reference.source, root) : "";
    if (source && isRedirectOnlyRouteSource(reference.source, runtimeFiles)) {
      redirects.push({ source, target: reference.target, kind: "runtime-redirect" });
    }
  }
  const sitemapPaths = extractSitemapPaths(seoContent, registryEntries);
  const navigationIds = extractNavigationRouteIds(navigationContent);
  const routeCandidates = [...new Set([
    ...runtimeRoutes.keys(),
    ...registryEntries.map((entry) => entry.route),
    ...indexEntries.map((entry) => entry.route),
    ...redirects.map((entry) => entry.source),
  ])];
  const runtimeAccess = extractRuntimeSurfaceAccess({
    proxyContent,
    routeConstantsContent,
    sectionRegistryContent,
    routes: routeCandidates,
  }).accessByRoute;
  const rows = formatRows({
    runtimeRoutes,
    handlerRoutes,
    registryEntries,
    indexEntries,
    documentationByRoute,
    sitemapPaths,
    redirects,
    references,
    runtimeAccessByRoute: runtimeAccess,
    navigationIds,
    runtimeFiles,
  });
  const knownPatterns = new Set([...runtimeRoutes.keys(), ...handlerRoutes, ...registryEntries.map((entry) => entry.route), ...redirects.map((entry) => entry.source)]);
  const unresolvedFindings = classifyUnresolvedRuntimeReferences(references, knownPatterns);
  const unresolvedTargets = findUnresolvedRuntimeTargets(references, knownPatterns);
  const findingsReview = unresolvedFindings.filter((finding) => finding.severity === "FINDING_REVIEW");
  const invariantErrors = [
    ...unresolvedFindings.filter((finding) => finding.severity === "INVARIANT_ERROR"),
    ...rows
      .filter((row) => row.documentationStatus === "INDEX_FICHE_ABSENTE")
      .map((row) => ({ target: `fiche CURRENT absente : ${row.route}`, severity: "INVARIANT_ERROR", items: [] })),
    ...redirects
      .filter((redirect) => !routeMatchesAny(redirect.target, knownPatterns))
      .map((redirect) => ({ target: `cible de redirect inexistante : ${redirect.source} → ${redirect.target}`, severity: "INVARIANT_ERROR", items: [] })),
    ...registryEntries
      .filter((entry) => !routeMatchesAny(entry.route, new Set([...runtimeRoutes.keys(), ...handlerRoutes])))
      .map((entry) => ({ target: `route du registre sans runtime : ${entry.route}`, severity: "INVARIANT_ERROR", items: [] })),
  ];
  return {
    refInfo,
    rows,
    unresolvedTargets,
    findingsReview,
    invariantErrors,
    invariantViolations: invariantErrors.map((finding) => finding.target),
    counts: {
      runtimeRoutes: runtimeRoutes.size,
      registryRoutes: registryEntries.length,
      indexRoutes: indexEntries.length,
      reportRows: rows.length,
    },
  };
}

function getOption(args, name) {
  const prefix = `--${name}=`;
  const value = args.find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

export function main(args = process.argv.slice(2)) {
  try {
    const ref = parseRepositoryRef(args);
    const report = buildProductSurfaceReport({ ref });
    const outputPath = path.resolve(REPOSITORY_ROOT, getOption(args, "output") ?? OUTPUT_PATH);
    const markdown = renderProductSurfaceAudit({
      report,
      generatedAt: getOption(args, "generated-at") ?? new Date().toISOString(),
      humanDecisions: readPreservedHumanDecisions(outputPath),
    });
    process.stdout.write(`${markdown}\n`);
    if (args.includes("--write")) {
      if (report.refInfo.status !== "CURRENT_AT_GENERATION" && !args.includes("--allow-historical")) {
        throw new Error(`Ref ${report.refInfo.resolved} is ${report.refInfo.status}; --write exige --ref=HEAD ou --allow-historical.`);
      }
      writeFileSync(outputPath, markdown, "utf8");
      console.error(`Rapport écrit dans ${path.relative(REPOSITORY_ROOT, outputPath)}`);
    }
    if (args.includes("--strict") && report.invariantViolations.length > 0) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const isDirectExecution = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) main();

export {
  normalizeRouteTarget,
  routePatternMatches,
  collectRuntimeReferences,
  isRedirectOnlyRouteSource,
  extractNavigationRouteIds,
  routeFilePattern,
  classifySurfaceRoute,
  findUnresolvedRuntimeTargets,
  classifyUnresolvedRuntimeReferences,
  renderProductSurfaceAudit,
};
