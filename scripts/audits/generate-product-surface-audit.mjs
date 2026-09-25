#!/usr/bin/env node
/**
 * Audit canonique de la surface produit et de l'accessibilité des routes.
 *
 * Ce rapport ne remplace ni INDEX.md ni les gates SEO/dead-code. Il compose
 * leurs sources et conserve les décisions de suppression hors de l'automate.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  extractIndexEntries,
  extractRuntimeSurfaceAccess,
  pageFileToRoute,
} from "../checks/pages-site-route-drift-routes.mjs";
import {
  createRepositoryView,
  parseRepositoryRef,
} from "../checks/repository-view.mjs";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUTPUT_PATH = "documentation/architecture/product-surface-accessibility-audit.md";
const APP_ROOT = "apps/web/src/app";
const RUNTIME_ROOT = "apps/web/src";
const INDEX_PATH = "documentation/pages_site/INDEX.md";
const PROXY_PATH = "apps/web/src/proxy.ts";
const ROUTE_CONSTANTS_PATH = "apps/web/src/lib/accueil-pilotage-routes.ts";
const SECTION_REGISTRY_PATH = "apps/web/src/lib/sections-registry/config.ts";
const NAVIGATION_PATH = "apps/web/src/lib/navigation.ts";
const SEO_INDEXABILITY_PATH = "apps/web/src/lib/seo/indexability.ts";
const GENERATED_BEGIN = "<!-- PRODUCT_SURFACE_AUDIT:GENERATED:BEGIN -->";
const GENERATED_END = "<!-- PRODUCT_SURFACE_AUDIT:GENERATED:END -->";
const HUMAN_BEGIN = "<!-- PRODUCT_SURFACE_AUDIT:HUMAN_DECISIONS:BEGIN -->";
const HUMAN_END = "<!-- PRODUCT_SURFACE_AUDIT:HUMAN_DECISIONS:END -->";

function git(args, root = REPOSITORY_ROOT) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function resolveRef(ref, root = REPOSITORY_ROOT) {
  if (!ref) throw new Error("REF Git obligatoire : utiliser --ref=<sha|HEAD>.");
  const resolved = git(["rev-parse", "--verify", `${ref}^{commit}`], root);
  const head = git(["rev-parse", "HEAD"], root);
  return {
    requested: ref,
    resolved,
    head,
    status: resolved === head ? "CURRENT_AT_GENERATION" : "HISTORICAL_SNAPSHOT",
  };
}

function normalizeRoute(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed.startsWith("/")) return "";
  const withoutQuery = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  if (withoutQuery === "/") return "/";
  return withoutQuery.replace(/\/+/g, "/").replace(/\/$/, "");
}

export function normalizeRouteTarget(value) {
  let target = String(value ?? "").trim();
  if (!target) return "";
  if (/^https?:\/\//i.test(target)) {
    return "";
  }
  if (!target.startsWith("/")) return "";
  target = target.replace(/\$\{[^}]+\}/g, "[param]");
  return normalizeRoute(target);
}

export function routePatternMatches(pattern, target) {
  const patternParts = normalizeRoute(pattern).split("/").filter(Boolean);
  const targetParts = normalizeRoute(target).split("/").filter(Boolean);
  if (patternParts.length === 0 || targetParts.length === 0) return pattern === target;

  let targetIndex = 0;
  for (const part of patternParts) {
    const catchAll = part.match(/^\[\.\.\..+\]$/);
    if (catchAll) return targetIndex < targetParts.length;
    if (targetIndex >= targetParts.length) return false;
    if (!/^\[.*\]$/.test(part) && part !== targetParts[targetIndex]) return false;
    targetIndex += 1;
  }
  return targetIndex === targetParts.length;
}

function isSourceFileIncluded(file) {
  return /\.(?:ts|tsx)$/.test(file) && !/(?:\.test|\.spec)\.(?:ts|tsx)$/.test(file);
}

function sourceFilesToMap(files) {
  if (files instanceof Map) return files;
  return new Map(Object.entries(files ?? {}));
}

function collectReferenceMatches(source, content) {
  const matches = [];
  const patterns = [
    { kind: "link", expression: /(?:href|route|path|url)\s*[:=]\s*\{?\s*(["'`])([^"'`]+)\1/g },
    { kind: "navigation", expression: /\brouter\.(?:push|replace)\(\s*(["'`])([^"'`]+)\1/g },
    { kind: "redirect", expression: /\b(?:permanentRedirect|redirect)\(\s*(["'`])([^"'`]+)\1/g },
  ];

  for (const { kind, expression } of patterns) {
    for (const match of content.matchAll(expression)) {
      const target = normalizeRouteTarget(match[2]);
      if (!target || target.startsWith("/api/") || target.startsWith("/_next/")) continue;
      matches.push({ source, kind, target });
    }
  }
  return matches;
}

export function collectRuntimeReferences(files) {
  return [...sourceFilesToMap(files).entries()]
    .filter(([file]) => isSourceFileIncluded(file))
    .flatMap(([source, content]) => collectReferenceMatches(source, String(content)))
    .sort((a, b) => a.target.localeCompare(b.target, "fr") || a.source.localeCompare(b.source, "fr"));
}

export function isRedirectOnlyRouteSource(source, files) {
  const content = sourceFilesToMap(files).get(source);
  if (content === undefined) return false;
  return /\b(?:permanentRedirect|redirect)\s*\(/.test(String(content))
    && !/\breturn\s*(?:\(|<)/.test(String(content));
}

function extractRegistryEntries(content, routeConstants = new Map()) {
  const entries = [];
  const blocks = content.matchAll(/(?:^|\r?\n)  \{\r?\n([\s\S]*?)\r?\n  \},?/gm);
  for (const match of blocks) {
    const block = match[1];
    const id = block.match(/^\s*id:\s*["']([^"']+)["']/m)?.[1];
    const routeValue = block.match(/^\s*route:\s*([^,\r\n]+)/m)?.[1]?.trim();
    const route = normalizeRoute(
      routeValue?.replace(/^(["'])(.*)\1$/, "$2") ?? "",
    ) || normalizeRoute(routeConstants.get(routeValue) ?? "");
    if (!id || !route) continue;
    entries.push({
      id,
      route,
      kind: block.match(/^\s*kind:\s*["']([^"']+)["']/m)?.[1] ?? "unknown",
      availability: block.match(/^\s*availability:\s*["']([^"']+)["']/m)?.[1] ?? "unknown",
      implementation: block.match(/^\s*implementation:\s*["']([^"']+)["']/m)?.[1] ?? "unknown",
      anonymousPresentation: block.match(/^\s*anonymousPresentation:\s*["']([^"']+)["']/m)?.[1] ?? null,
    });
  }
  return entries;
}

function extractNavigationRouteIds(content) {
  const bodies = [
    content.match(/const COMMON_PROFILE_SPACE_PAGES[\s\S]*?=\s*\{([\s\S]*?)\n\};/)?.[1] ?? "",
    content.match(/const PARCOURS_SPACE_PAGE_MAP[\s\S]*?=\s*\{([\s\S]*?)\n\};/)?.[1] ?? "",
  ];
  const body = bodies.join("\n");
  return new Set([...body.matchAll(/["']([a-z0-9-]+)["']/g)].map((match) => match[1]));
}

function extractSitemapPaths(content, registryEntries) {
  const paths = new Set();
  const staticBody = content.match(/PUBLIC_APP_SITEMAP_PATHS\s*=\s*\[([\s\S]*?)\]\s*as const/)?.[1] ?? "";
  for (const match of staticBody.matchAll(/["'](\/[^"']+)["']/g)) paths.add(normalizeRoute(match[1]));

  const indexableBody = content.match(/PUBLIC_INDEXABLE_SECTION_IDS[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? "";
  const indexableIds = new Set([...indexableBody.matchAll(/["']([^"']+)["']/g)].map((match) => match[1]));
  for (const entry of registryEntries) {
    if (entry.kind === "section" && entry.availability === "available" && indexableIds.has(entry.id)) {
      paths.add(entry.route);
    }
  }
  return paths;
}

function extractSeoRedirects(content) {
  const redirects = [];
  const body = content.match(/SEO_REDIRECT_TARGETS\s*=\s*\{([\s\S]*?)\}\s*as const/)?.[1] ?? "";
  for (const match of body.matchAll(/["'](\/[^"']+)["']\s*:\s*["']([^"']+)["']/g)) {
    const source = normalizeRoute(match[1]);
    const target = normalizeRouteTarget(match[2]);
    if (source && target) redirects.push({ source, target, kind: "seo-redirect" });
  }
  return redirects;
}

function extractRouteConstants(content) {
  return new Map(
    [...String(content).matchAll(/(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*=\s*["']([^"']+)["']/g)]
      .map((match) => [match[1], match[2]]),
  );
}

function routeFilePattern(file, root = REPOSITORY_ROOT) {
  const absoluteFile = path.resolve(root, file);
  const appRoot = path.resolve(root, APP_ROOT);
  const relative = path.relative(appRoot, absoluteFile).replaceAll("\\", "/");
  const parts = relative.split("/");
  parts.pop();
  const routeParts = parts.filter((part) => !(part.startsWith("(") && part.endsWith(")"))).map((part) => {
    if (/^\[\[\.\.\..+\]\]$/.test(part)) return "";
    const catchAll = part.match(/^\[\.\.\.(.+)\]$/);
    return catchAll ? `[${catchAll[1]}]` : part;
  }).filter(Boolean);
  return normalizeRoute(`/${routeParts.join("/")}`);
}

function extractRuntimeRouteDefinitions(view, root) {
  const routes = new Map();
  for (const file of view.listFiles(APP_ROOT).filter((item) => /\/page\.tsx$/.test(item) || item === `${APP_ROOT}/page.tsx`)) {
    const route = pageFileToRoute(path.resolve(root, file), path.resolve(root, APP_ROOT));
    if (!route) continue;
    if (!routes.has(route)) routes.set(route, { route, source: file, kind: "page" });
  }
  const handlers = new Set();
  for (const file of view.listFiles(APP_ROOT).filter((item) => /\/route\.tsx?$/.test(item) || item === `${APP_ROOT}/route.ts`)) {
    const route = routeFilePattern(file, root);
    if (route) handlers.add(route);
  }
  return { routes, handlers };
}

function compactSources(items, limit = 3) {
  const sources = [...new Set(items.map((item) => item.source ?? item))].sort((a, b) => a.localeCompare(b, "fr"));
  if (sources.length === 0) return "—";
  const visible = sources.slice(0, limit).join(", ");
  return sources.length > limit ? `${visible} (+${sources.length - limit})` : visible;
}

function routeMatchesAny(route, patterns) {
  return [...patterns].some((pattern) => routePatternMatches(pattern, route));
}

function isDeepLinkSource(source) {
  return /(?:email|notification|template|share|invite|deep|magic|token|action-link)/i.test(source);
}

function isQaRoute(route, source = "") {
  return route.startsWith("/preview/") || /(?:qa|fixture|storybook|preview)/i.test(source);
}

function isProtectedToolRoute(route) {
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
  isProtectedTool = false,
  isSpecial = false,
  documentationOnly = false,
  authGate = "UNKNOWN",
}) {
  if (canonicalStatus === "REDIRECT_COMPAT") return "REDIRECT_COMPAT";
  if (isQa) return "QA_TOOL";
  if (isProtectedTool) return "PROTECTED_TOOL";
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

function buildDocumentationMap(indexEntries, view) {
  return new Map(indexEntries.map((entry) => [entry.route, {
    ...entry,
    documentationStatus: entry.readmePath
      ? view.isFile(path.posix.join("documentation/pages_site", entry.readmePath.replace(/^\.\//, ""))) ? (entry.isAliasOrRedirect ? "CURRENT_ALIAS" : "CURRENT_INDEX") : "INDEX_FICHE_ABSENTE"
      : "INDEX_SANS_FICHE",
  }]));
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
  const knownPatterns = new Set([...runtimeRoutes.keys(), ...handlerRoutes, ...registryEntries.map((entry) => entry.route), ...redirects.map((entry) => entry.source)]);
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
    const isProtectedTool = isProtectedToolRoute(route);
    const isSpecial = isSpecialRoute(route);
    const status = classifySurfaceRoute({
      canonicalStatus,
      inRibbon,
      dynamicRoute,
      inboundRuntimeCount: inbound.count,
      deepLinkCount: deepConsumers.length,
      isQa,
      isProtectedTool,
      isSpecial,
      documentationOnly: isDocumentationOnly,
      authGate: runtimeAccess,
    });
    const inRegistry = registry || registryShared ? "YES" : "NO";
    const inSitemap = routeMatchesAny(route, sitemapPaths) || (dynamicRoute && [...sitemapPaths].some((candidate) => routePatternMatches(route, candidate))) ? "YES" : "NO";
    const rationale = status === "PRIMARY_NAV"
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
      qaOrInternalUsage: isQa ? "QA_TOOL" : isProtectedTool ? "PROTECTED_TOOL" : isSpecial ? "SPECIAL_ROUTE" : "NONE_DEMONSTRATED",
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

function renderSummary(rows, unresolvedTargets, invariantViolations) {
  const statuses = ["PRIMARY_NAV", "SECONDARY_NAV", "DEEP_LINK", "PROTECTED_TOOL", "QA_TOOL", "REDIRECT_COMPAT", "ORPHAN_ROUTE", "OBSOLETE", "UNKNOWN"];
  return [
    "| STATUS | COUNT |",
    "| --- | ---: |",
    ...statuses.map((status) => `| ${status} | ${rows.filter((row) => row.status === status).length} |`),
    `| ROUTES_RUNTIME | ${rows.filter((row) => row.canonicalStatus !== "DOCUMENTATION_ONLY").length} |`,
    `| LIENS_RUNTIME_NON_RESOLUS | ${unresolvedTargets.length} |`,
    `| INVARIANTS_CERTAINS_EN_ERREUR | ${invariantViolations.length} |`,
  ].join("\n");
}

function renderMainTable(rows) {
  const header = [
    "| ROUTE | STATUS | IN_RIBBON | INBOUND | ACCESS | CANONICAL | RATIONALE |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  return [...header, ...rows.map((row) => `| \`${row.route}\` | ${row.status} | ${row.inRibbon} | ${row.inboundText} | ${row.access} | ${row.canonicalStatus} | ${row.rationale} |`)].join("\n");
}

function renderDetailedTable(rows) {
  const header = [
    "| ROUTE | SOURCE | IN_REGISTRY | IN_SITEMAP | DEEP_LINK_CONSUMERS | INBOUND_REDIRECTS | DYNAMIC_ROUTE | QA_OR_INTERNAL_USAGE | DOCUMENTATION_STATUS | REACHABILITY_STATUS |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  return [...header, ...rows.map((row) => `| \`${row.route}\` | \`${row.source}\` | ${row.inRegistry} | ${row.inSitemap} | ${row.deepLinkText} | ${row.redirectText} | ${row.dynamicRoute} | ${row.qaOrInternalUsage} | ${row.documentationStatus} | ${row.reachabilityStatus} |`)].join("\n");
}

function renderRowsSection(title, rows) {
  if (rows.length === 0) return `### ${title}\n\n_Aucune route dans cette catégorie._`;
  return `### ${title}\n\n${rows.map((row) => `- \`${row.route}\` — ${row.status} — ${row.rationale}.`).join("\n")}`;
}

function sanitizeGeneratedText(value) {
  return String(value)
    .replace(/\/?docs\/[^\s)`|]+/g, "[chemin documentaire interne]")
    .replace(/\/?documentation\/[^\s)`|]+/g, "[chemin documentaire interne]");
}

export function renderProductSurfaceAudit({ report, generatedAt = new Date().toISOString(), humanDecisions = "" }) {
  const { refInfo, rows, unresolvedTargets, invariantViolations } = report;
  const docsOnly = rows.filter((row) => row.canonicalStatus === "DOCUMENTATION_ONLY");
  const runtimeUndocumented = rows.filter((row) => row.canonicalStatus === "RUNTIME_UNDOCUMENTED");
  return `# Audit de surface produit et accessibilité des routes

${GENERATED_BEGIN}
## En-tête

\`AUDIT_REF=${refInfo.resolved}\`
\`AUDIT_GENERATED_AT=${generatedAt}\`
\`AUDIT_STATUS=${refInfo.status}\`

Commande :

\`npm run audit:product-surface -- --ref=${refInfo.requested}\`

Le rapport est généré depuis les routes runtime, la navigation, le registre
de rubriques, l’index pages-site, l’indexabilité SEO, le proxy et le sitemap.
Il ne remplace aucune de ces sources et ne transforme pas l’absence de lien en
décision automatique de suppression.

## Résumé

${renderSummary(rows, unresolvedTargets, invariantViolations)}

## Table principale

${renderMainTable(rows)}

## Routes orphelines candidates

${renderRowsSection("Candidats", rows.filter((row) => row.status === "ORPHAN_ROUTE"))}

## Legacy et redirects à réexaminer

${renderRowsSection("Compatibilités", rows.filter((row) => row.status === "REDIRECT_COMPAT"))}

## Outils internes et QA

${renderRowsSection("Surfaces internes", rows.filter((row) => row.status === "PROTECTED_TOOL" || row.status === "QA_TOOL"))}

## Deep-links légitimes

${renderRowsSection("Deep-links", rows.filter((row) => row.status === "DEEP_LINK"))}

## Divergences documentation/runtime

${renderRowsSection("Références documentation-only", docsOnly)}

${renderRowsSection("Routes runtime absentes de l’index", runtimeUndocumented)}

### Liens runtime vers une route non résolue

${unresolvedTargets.length === 0 ? "Aucun." : unresolvedTargets.map((target) => `- \`${sanitizeGeneratedText(target)}\``).join("\n")}

### Invariants certains

${invariantViolations.length === 0 ? "Aucun." : invariantViolations.map((violation) => `- ${sanitizeGeneratedText(violation)}`).join("\n")}

## Graphe détaillé

${renderDetailedTable(rows)}

## Taxonomie et limites

- \`PRIMARY_NAV\` : route visible dans la navigation principale issue du registre.
- \`SECONDARY_NAV\` : consumer runtime utilisateur démontré hors ruban principal.
- \`DEEP_LINK\` : consumer de contexte, email, notification ou workflow démontré.
- \`PROTECTED_TOOL\` : surface interne protégée ; l’absence du ruban n’est pas un finding.
- \`QA_TOOL\` : preview ou outil de contrôle identifié.
- \`REDIRECT_COMPAT\` : alias/redirect déclaré, dont l’utilité externe reste une décision humaine.
- \`ORPHAN_ROUTE\` : aucun consumer runtime, redirect, deep-link ou usage interne démontré ; candidat d’audit, jamais suppression automatique.
- \`OBSOLETE\` : réservé à une décision humaine confirmée ; le générateur ne l’infère pas.
- \`UNKNOWN\` : preuve insuffisante, notamment pour les routes dynamiques, auth/callback et erreurs.

Les URLs dynamiques non résolues restent \`UNKNOWN\`. Les tests, les références
documentaires et les listes de dead-code ne sont pas des consumers runtime.
Les routes d’erreur, auth/callback, exports et pages protégées ne sont pas
classées orphelines uniquement parce qu’elles ne figurent pas dans le ruban.

## Reproductibilité

Régénérer avec \`--ref=HEAD\`. Le mode \`--strict\` bloque seulement les liens
runtime inexistants, les fiches CURRENT sans route, les cibles de redirect
inexistantes et les incohérences certaines du registre. Une décision
\`ORPHAN_ROUTE\`, \`OBSOLETE\` ou de suppression reste hors du garde automatique.
La génération normale est read-only ; utiliser \`--write\` explicitement pour
actualiser ce fichier généré.
${GENERATED_END}
${humanDecisions ? `\n\n${humanDecisions.trim()}\n` : ""}
`;
}

function readPreservedHumanDecisions(outputPath) {
  if (!existsSync(outputPath)) return "";
  const content = readFileSync(outputPath, "utf8");
  const begin = content.indexOf(HUMAN_BEGIN);
  const end = content.indexOf(HUMAN_END);
  if (begin < 0 || end < begin) return "";
  return content.slice(begin, end + HUMAN_END.length).trim();
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
  const unresolvedTargets = findUnresolvedRuntimeTargets(references, knownPatterns);
  const invariantViolations = [
    ...unresolvedTargets.map((target) => `lien runtime non résolu : ${target}`),
    ...rows.filter((row) => row.documentationStatus === "INDEX_FICHE_ABSENTE").map((row) => `fiche CURRENT absente : ${row.route}`),
    ...redirects.filter((redirect) => !routeMatchesAny(redirect.target, knownPatterns)).map((redirect) => `cible de redirect inexistante : ${redirect.source} → ${redirect.target}`),
    ...registryEntries.filter((entry) => !routeMatchesAny(entry.route, new Set([...runtimeRoutes.keys(), ...handlerRoutes]))).map((entry) => `route du registre sans runtime : ${entry.route}`),
  ];
  return {
    refInfo,
    rows,
    unresolvedTargets,
    invariantViolations: [...new Set(invariantViolations)],
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
