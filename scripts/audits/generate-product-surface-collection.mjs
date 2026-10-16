import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pageFileToRoute } from "../checks/pages-site-route-drift-routes.mjs";
import { gitExecutable } from "../ci/git-executable.mjs";

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
  return execFileSync(gitExecutable(), args, { cwd: root, encoding: "utf8" }).trim();
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
    const optionalCatchAll = part.match(/^\[\[\.\.\..+\]\]$/);
    if (optionalCatchAll) return true;
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
    { kind: "link", expression: /\bhref[ \t]*[:=][ \t]*(?:\{[ \t]*)?["'`]([^"'`\r\n]+)["'`]/g },
    { kind: "reference", expression: /\b(?:route|path|url)[ \t]*[:=][ \t]*(?:\{[ \t]*)?["'`]([^"'`\r\n]+)["'`]/g },
    { kind: "navigation", expression: /\brouter\.(?:push|replace)\(\s*["'`]([^"'`]+)["'`]/g },
    { kind: "redirect", expression: /\b(?:permanentRedirect|redirect)\(\s*["'`]([^"'`]+)["'`]/g },
  ];

  for (const { kind, expression } of patterns) {
    for (const match of content.matchAll(expression)) {
      const target = normalizeRouteTarget(match[1]);
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
  const lines = String(content).split(/\r?\n/);
  const blocks = [];
  let cursor = 0;
  while (cursor < lines.length) {
    if (lines[cursor] !== "  {") {
      cursor += 1;
      continue;
    }
    const end = lines.findIndex((line, candidate) => candidate > cursor && (line === "  }," || line === "  }"));
    if (end === -1) {
      cursor += 1;
      continue;
    }
    blocks.push(lines.slice(cursor + 1, end).join("\n"));
    cursor = end + 1;
  }
  for (const block of blocks) {
    const readProperty = (property) => {
      const prefix = `${property}:`;
      for (const line of block.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith(prefix)) continue;
        const value = trimmed.slice(prefix.length).trim().replace(/,$/, "");
        if (value.startsWith("\"") || value.startsWith("'")) {
          const quote = value[0];
          const end = value.indexOf(quote, 1);
          return end > 0 ? value.slice(1, end) : undefined;
        }
        return value;
      }
      return undefined;
    };
    const id = readProperty("id");
    const routeValue = readProperty("route");
    const route = normalizeRoute(routeValue ?? "") || normalizeRoute(routeConstants.get(routeValue) ?? "");
    if (!id || !route) continue;
    entries.push({
      id,
      route,
      kind: readProperty("kind") ?? "unknown",
      availability: readProperty("availability") ?? "unknown",
      implementation: readProperty("implementation") ?? "unknown",
      anonymousPresentation: readProperty("anonymousPresentation") ?? null,
    });
  }
  return entries;
}

function extractStringArrayConstants(content) {
  const arrays = new Map();
  let cursor = 0;
  while (cursor < content.length) {
    const declarationStart = content.indexOf("const ", cursor);
    if (declarationStart < 0) break;
    const nameStart = declarationStart + "const ".length;
    let nameEnd = nameStart;
    while (/[A-Z0-9_]/.test(content[nameEnd] ?? "")) nameEnd += 1;
    const name = content.slice(nameStart, nameEnd);
    const equals = content.indexOf("=", nameEnd);
    const arrayStart = equals < 0 ? -1 : content.indexOf("[", equals);
    const arrayEnd = arrayStart < 0 ? -1 : content.indexOf("]", arrayStart);
    if (name && arrayStart >= 0 && arrayEnd >= 0) {
      const values = content.slice(arrayStart + 1, arrayEnd);
      arrays.set(name, [...values.matchAll(/["']([a-z0-9-]+)["']/g)].map((item) => item[1]));
      cursor = arrayEnd + 1;
    } else {
      cursor = nameEnd || declarationStart + 1;
    }
  }
  return arrays;
}

function extractNamedObjectBody(content, name) {
  const declarationStart = content.indexOf("const " + name);
  if (declarationStart < 0) return "";
  const equals = content.indexOf("=", declarationStart + name.length + 6);
  const objectStart = equals < 0 ? -1 : content.indexOf("{", equals);
  const objectEnd = objectStart < 0 ? -1 : content.indexOf("};", objectStart);
  return objectStart >= 0 && objectEnd >= 0 ? content.slice(objectStart + 1, objectEnd) : "";
}

export function extractNavigationRouteIds(content) {
  const arrays = extractStringArrayConstants(content);
  const bodies = [
    extractNamedObjectBody(content, "COMMON_PROFILE_SPACE_PAGES"),
    extractNamedObjectBody(content, "PARCOURS_SPACE_PAGE_MAP"),
  ];
  const routeIds = new Set();
  for (const body of bodies) {
    for (const match of body.matchAll(/["']([a-z0-9-]+)["']/g)) {
      routeIds.add(match[1]);
    }
    for (const match of body.matchAll(/\b([A-Z][A-Z0-9_]*)\b/g)) {
      for (const routeId of arrays.get(match[1]) ?? []) routeIds.add(routeId);
    }
  }
  return routeIds;
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

export function routeFilePattern(file, root = REPOSITORY_ROOT) {
  const absoluteFile = path.resolve(root, file);
  const appRoot = path.resolve(root, APP_ROOT);
  const relative = path.relative(appRoot, absoluteFile).replaceAll("\\", "/");
  const parts = relative.split("/");
  parts.pop();
  const routeParts = parts.filter((part) => !(part.startsWith("(") && part.endsWith(")"))).map((part) => {
    if (/^\[\[\.\.\..+\]\]$/.test(part)) return part;
    const catchAll = part.match(/^\[\.\.\.(.+)\]$/);
    return catchAll ? `[...${catchAll[1]}]` : part;
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

export {
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
  GENERATED_BEGIN,
  GENERATED_END,
  HUMAN_BEGIN,
  HUMAN_END,
  resolveRef,
  isSourceFileIncluded,
  extractRegistryEntries,
  extractRuntimeRouteDefinitions,
  compactSources,
  extractSitemapPaths,
  extractSeoRedirects,
  extractRouteConstants,
};
