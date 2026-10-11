import {
  SECTION_REGISTRY_PATH,
  SEO_INDEXABILITY_PATH,
  routePatternMatches,
  isRedirectOnlyRouteSource,
  compactSources,
} from "./generate-product-surface-collection.mjs";

function routeMatchesAny(route, patterns) {
  return [...patterns].some((pattern) => routePatternMatches(pattern, route));
}

function isDeepLinkSource(source) {
  return /(?:email|notification|template|share|invite|deep|magic|token|action-link)/i.test(source);
}

function isQaRoute(route, source = "") {
  return route.startsWith("/preview/") || /(?:qa|fixture|storybook|preview)/i.test(source);
}

function isProtectedRoute(route) {
  return route === "/admin" || route.startsWith("/admin/") || route.startsWith("/prints/") || route === "/actions/history";
}

function isSpecialRoute(route) {
  return /^(?:\/error\/|\/auth(?:\/|$)|\/callback(?:\/|$)|\/exports(?:\/|$))/.test(route);
}

export function classifySurfaceRoute({
  canonicalStatus = "RUNTIME_ONLY",
  inRibbon = "NO",
  dynamicRoute = false,
  inboundRuntimeCount = 0,
  deepLinkCount = 0,
  isQa = false,
  protectedRoute = false,
  protectedEvidence = false,
  isSpecial = false,
  documentationOnly = false,
  authGate = "UNKNOWN",
}) {
  if (canonicalStatus === "REDIRECT_COMPAT") return "REDIRECT_COMPAT";
  if (isQa) return "QA_TOOL";
  if (protectedRoute && protectedEvidence) return "PROTECTED_TOOL";
  if (documentationOnly) return "UNKNOWN";
  if (isSpecial) return "UNKNOWN";
  if (inRibbon === "YES") return "PRIMARY_NAV";
  if (deepLinkCount > 0) return "DEEP_LINK";
  if (inboundRuntimeCount > 0) return "SECONDARY_NAV";
  if (dynamicRoute || authGate === "protected" || authGate === "auth-entry") return "UNKNOWN";
  return "ORPHAN_ROUTE";
}

export function findUnresolvedRuntimeTargets(references, knownPatterns) {
  return [...new Set(references
    .map((reference) => reference.target)
    .filter((target) => !routeMatchesAny(target, knownPatterns)))].sort((a, b) => a.localeCompare(b, "fr"));
}

export function classifyUnresolvedRuntimeReferences(references, knownPatterns) {
  const grouped = new Map();
  for (const reference of references) {
    if (routeMatchesAny(reference.target, knownPatterns)) continue;
    const current = grouped.get(reference.target) ?? [];
    current.push(reference);
    grouped.set(reference.target, current);
  }

  return [...grouped.entries()]
    .map(([target, items]) => ({
      target,
      severity: items.every((item) => ["link", "navigation", "redirect"].includes(item.kind))
        ? "INVARIANT_ERROR"
        : "REVIEW_FINDING",
      items,
    }))
    .sort((a, b) => a.target.localeCompare(b.target, "fr"));
}

function formatInbound(route, references) {
  const matches = references.filter((reference) => routePatternMatches(route, reference.target));
  return {
    items: matches,
    count: matches.length,
    text: compactSources(matches),
  };
}

function formatRows({
  runtimeRoutes,
  handlerRoutes,
  registryEntries,
  indexEntries,
  documentationByRoute,
  sitemapPaths,
  redirects,
  references,
  runtimeAccessByRoute,
  navigationIds,
  runtimeFiles,
}) {
  const registryByRoute = new Map(registryEntries.map((entry) => [entry.route, entry]));
  const routeKeys = new Set([
    ...runtimeRoutes.keys(),
    ...registryEntries.map((entry) => entry.route),
    ...indexEntries.map((entry) => entry.route),
    ...redirects.map((entry) => entry.source),
  ]);
  const redirectByTarget = new Map();
  for (const redirect of redirects) {
    if (!redirectByTarget.has(redirect.target)) redirectByTarget.set(redirect.target, []);
    redirectByTarget.get(redirect.target).push({ source: redirect.source, kind: redirect.kind });
  }

  return [...routeKeys].sort((a, b) => a.localeCompare(b, "fr")).map((route) => {
    const runtime = runtimeRoutes.get(route);
    const registry = registryByRoute.get(route);
    const documentation = documentationByRoute.get(route);
    const source = runtime?.source ?? (registry ? SECTION_REGISTRY_PATH : documentation?.readmePath?.replace(/^\.\//, "") ?? SEO_INDEXABILITY_PATH);
    const dynamicRoute = route.includes("[");
    const registryShared = !registry && dynamicRoute && registryEntries.some((entry) => routePatternMatches(route, entry.route));
    const registryEntry = registry ?? (registryShared ? { id: "[section]", availability: "available", kind: "section" } : null);
    const inRibbon = registryEntry && registryEntry.availability === "available" && navigationIds.has(registryEntry.id) ? "YES" : "NO";
    const redirectSource = redirects.some((entry) => entry.source === route) || references.some((entry) => entry.source === source && entry.kind === "redirect" && isRedirectOnlyRouteSource(entry.source, runtimeFiles));
    const canonicalStatus = redirectSource
      ? "REDIRECT_COMPAT"
      : documentation?.isAliasOrRedirect
        ? "REDIRECT_COMPAT"
        : documentation
          ? "CURRENT"
          : runtime || registry
            ? "RUNTIME_UNDOCUMENTED"
            : "DOCUMENTATION_ONLY";
    const inbound = formatInbound(route, references);
    const inboundRedirects = redirectByTarget.get(route) ?? [...redirectByTarget.entries()]
      .filter(([target]) => routePatternMatches(route, target))
      .flatMap(([, entries]) => entries);
    const deepConsumers = inbound.items.filter((item) => isDeepLinkSource(item.source));
    const runtimeAccess = runtimeAccessByRoute.get(route) ?? "UNKNOWN";
    const documentedAccess = documentation?.documentedAccessModes ?? [];
    const authGate = documentedAccess.length > 0 && runtimeAccess !== "UNKNOWN" && !documentedAccess.includes(runtimeAccess)
      ? `runtime=${runtimeAccess}; documenté=${documentedAccess.join(",")}`
      : runtimeAccess;
    const isDocumentationOnly = canonicalStatus === "DOCUMENTATION_ONLY";
    const isQa = isQaRoute(route, source);
    const protectedRoute = isProtectedRoute(route);
    const protectedEvidence = protectedRoute && (inRibbon === "YES" || inbound.count > 0 || deepConsumers.length > 0);
    const isSpecial = isSpecialRoute(route);
    const status = classifySurfaceRoute({
      canonicalStatus,
      inRibbon,
      dynamicRoute,
      inboundRuntimeCount: inbound.count,
      deepLinkCount: deepConsumers.length,
      isQa,
      protectedRoute,
      protectedEvidence,
      isSpecial,
      documentationOnly: isDocumentationOnly,
      authGate: runtimeAccess,
    });
    const inRegistry = registry || registryShared ? "YES" : "NO";
    const inSitemap = routeMatchesAny(route, sitemapPaths) || (dynamicRoute && [...sitemapPaths].some((candidate) => routePatternMatches(route, candidate))) ? "YES" : "NO";
    const rationale = protectedRoute && !protectedEvidence
      ? "route protégée sans consumer, navigation ou usage interne démontré"
      : status === "PRIMARY_NAV"
      ? "entrée visible du registre/navigation"
      : status === "SECONDARY_NAV"
        ? "consumer runtime hors ruban principal"
        : status === "DEEP_LINK"
          ? "consumer de deep-link démontré"
          : status === "PROTECTED_TOOL"
            ? "surface interne protégée ; absence du ruban non probante"
            : status === "QA_TOOL"
              ? "outil QA/support identifié"
              : status === "REDIRECT_COMPAT"
                ? "alias ou redirect déclaré ; utilité externe à réexaminer"
                : status === "ORPHAN_ROUTE"
                  ? "aucun consumer runtime, redirect ou usage interne démontré"
                  : isDocumentationOnly
                    ? "référence documentaire sans route runtime correspondante"
                    : dynamicRoute
                      ? "pattern dynamique ; les consumers concrets doivent être résolus séparément"
                      : "preuve de reachability insuffisante";
    return {
      route,
      source,
      access: authGate,
      canonicalStatus,
      inRibbon,
      inRegistry,
      inSitemap,
      inboundRuntimeLinks: inbound.items,
      inboundRedirects,
      deepLinkConsumers: deepConsumers,
      authOrRoleGate: authGate,
      dynamicRoute: dynamicRoute ? "YES" : "NO",
      qaOrInternalUsage: isQa
        ? "QA_TOOL"
        : protectedEvidence
          ? "PROTECTED_TOOL"
          : protectedRoute
            ? "PROTECTED_REVIEW"
            : isSpecial
              ? "SPECIAL_ROUTE"
              : "NONE_DEMONSTRATED",
      documentationStatus: documentation?.documentationStatus ?? (canonicalStatus === "RUNTIME_UNDOCUMENTED" ? "NOT_IN_INDEX" : "NOT_APPLICABLE"),
      reachabilityStatus: status === "ORPHAN_ROUTE" ? "ORPHAN_CANDIDATE" : status === "DEEP_LINK" ? "DEEP_LINK_ONLY" : status === "REDIRECT_COMPAT" ? "REDIRECT_ONLY" : status === "PROTECTED_TOOL" || status === "QA_TOOL" ? "INTERNAL_OR_QA" : status === "UNKNOWN" ? "UNKNOWN" : "REACHABLE",
      rationale,
      status,
      inboundText: inbound.count === 0 ? "—" : `${inbound.count} — ${compactSources(inbound.items)}`,
      redirectText: inboundRedirects.length === 0 ? "—" : compactSources(inboundRedirects),
      deepLinkText: deepConsumers.length === 0 ? "—" : compactSources(deepConsumers),
    };
  });
}

export {
  routeMatchesAny,
  formatRows,
};
