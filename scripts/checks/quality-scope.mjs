#!/usr/bin/env node

/**
 * Product quality scopes shared by reports, gates and CI planning.
 *
 * `web` and `mobile` are first-party application scopes. `all` preserves the
 * historical monorepo gate and includes the two application roots. Files
 * outside those roots remain `shared`/transversal; they are never counted in
 * an application's runtime or test totals merely because they influence it.
 */

export const QUALITY_SCOPES = Object.freeze(["web", "mobile", "all"]);

export const QUALITY_SCOPE_ROOTS = Object.freeze({
  web: Object.freeze(["apps/web/src"]),
  mobile: Object.freeze(["apps/mobile"]),
  all: Object.freeze(["apps/web/src", "apps/mobile"]),
});

export const QUALITY_SCOPE_LABELS = Object.freeze({
  web: "Web",
  mobile: "Mobile",
  all: "Monorepo (Web + Mobile)",
});

function normalizePath(file) {
  return String(file ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
}

export function normalizeQualityScope(scope = "all") {
  const value = String(scope ?? "all").trim().toLowerCase();
  if (!QUALITY_SCOPES.includes(value)) {
    throw new Error(`Unsupported quality scope '${scope}'. Use --scope=web|mobile|all.`);
  }
  return value;
}

export function qualityScopeRoots(scope = "all") {
  return QUALITY_SCOPE_ROOTS[normalizeQualityScope(scope)];
}

export function productScopeForPath(file) {
  const normalized = normalizePath(file);
  if (normalized === "apps/web" || normalized.startsWith("apps/web/")) return "web";
  if (normalized === "apps/mobile" || normalized.startsWith("apps/mobile/")) return "mobile";
  return "shared";
}

export function pathInQualityScope(file, scope = "all") {
  const normalizedScope = normalizeQualityScope(scope);
  if (normalizedScope === "all") return true;
  return productScopeForPath(file) === normalizedScope;
}

export function filterPathsByQualityScope(files, scope = "all") {
  return [...new Set((files ?? []).map(normalizePath))]
    .filter((file) => pathInQualityScope(file, scope));
}

export function scopeMetadata(scope = "all") {
  const normalizedScope = normalizeQualityScope(scope);
  return {
    scope: normalizedScope,
    label: QUALITY_SCOPE_LABELS[normalizedScope],
    roots: [...qualityScopeRoots(normalizedScope)],
    transverse: normalizedScope === "all" ? ["scripts", "e2e", "documentation", "configuration", "vendor", ".github"] : [],
  };
}
