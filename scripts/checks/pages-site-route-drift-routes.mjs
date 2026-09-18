import path from "node:path";

export const REQUIRED_SURFACE_ACCESS_ROUTES = new Set([
  "/actions/map",
  "/actions/new",
  "/signalement",
  "/dashboard",
]);

export const DYNAMIC_ALIASES_HANDLED_INSIDE_ROUTE = new Set([
  "/sections/dm",
  "/sections/guide",
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

export function normalizeRoute(value) {
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

export function normalizeRelativePath(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

export function pageFileToRoute(filePath, appRoot) {
  const relativeParts = path.relative(appRoot, filePath).split(path.sep);
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

export function extractDocumentedAccessModes(value) {
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

export function extractSectionRegistryRoutes(content) {
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
