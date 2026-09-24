import { RUBRIQUE_REGISTRY } from "@/lib/sections-registry";
import {
  ADMIN_ROUTE,
  ACCOUNT_EVOLUTION_ROUTE,
  DASHBOARD_ROUTE,
  PARCOURS_ROUTE,
  PILOTAGE_ROUTE,
  PROFIL_ROUTE,
  SPONSOR_PORTAL_ROUTE,
} from "@/lib/accueil-pilotage-routes";

export const PUBLIC_APP_SITEMAP_PATHS = [
  "/",
  "/actions/map",
  "/actions/new",
  "/contact",
  "/conditions-generales-utilisation",
  "/learn/bonnes-pratiques",
  "/learn/comprendre",
  "/learn/ecole",
  "/learn/sentrainer",
  "/mentions-legales",
  "/methodologie",
  "/politique-confidentialite",
  "/politique-cookies",
  "/reports",
  "/signalement",
  "/signaler-contenu-illicite",
] as const;

export const PRIVATE_APP_ROUTE_PREFIXES = [
  ADMIN_ROUTE,
  "/actions/history",
  "/form-comparison",
  "/onboarding",
  ACCOUNT_EVOLUTION_ROUTE,
  DASHBOARD_ROUTE,
  PARCOURS_ROUTE,
  "/partners/dashboard",
  "/partners/onboarding",
  PILOTAGE_ROUTE,
  "/prints/report",
  PROFIL_ROUTE,
  "/reglages",
  SPONSOR_PORTAL_ROUTE,
] as const;

const PUBLIC_NOINDEX_ROUTE_PREFIXES = [
  "/declaration-simple",
  "/docs",
  "/error/429",
  "/preview/actions/new",
  "/sign-in",
  "/sign-up",
] as const;

export const SEO_REDIRECT_TARGETS = {
  "/en": "/",
  "/conditions-utilisation": "/conditions-generales-utilisation",
  "/declaration": "/actions/new",
  "/community": "/sections/community",
  "/open-data": "/sections/open-data",
  "/messagerie": "/sections/messagerie",
  "/gamification": "/sections/gamification",
  "/sections/dm": "/sections/messagerie?tab=dm",
  "/sections/guide": "/actions/new?panel=meteo",
  "/sections/route": "/actions/new?panel=itineraire",
  "/sections/weather": "/actions/new?panel=meteo",
  "/sections/rejoindre-un-formulaire": "/sections/rejoindre-une-action",
  "/partners/network": "/sections/community?tab=partners",
  "/partners/network/pepite": "/sections/community?tab=partners",
  "/onboarding/localisation": "/onboarding",
} as const;

export const PUBLIC_INDEXABLE_SECTION_IDS: ReadonlySet<string> = new Set([
  "actors",
  "annuaire",
  "climate",
  "compost",
  "community",
  "funding",
  "open-data",
  "recycling",
  "rejoindre-une-action",
] as const);

export const PUBLIC_NOINDEX_SECTION_IDS: ReadonlySet<string> = new Set([
  "feedback",
  "trash-spotter",
] as const);

const PRIVATE_SECTION_IDS: ReadonlySet<string> = new Set([
  "elus",
  "gamification",
  "messagerie",
] as const);

export type SeoRedirectSource = keyof typeof SEO_REDIRECT_TARGETS;

function appendPreservedSearchParams(
  target: string,
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const [pathname, query = ""] = target.split("?", 2);
  const params = new URLSearchParams(query);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (params.has(key)) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      params.append(key, item);
    }
  }
  const serialized = params.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

export function buildSeoRedirectTarget(
  source: SeoRedirectSource,
  searchParams: Record<string, string | string[] | undefined>,
): string {
  return appendPreservedSearchParams(SEO_REDIRECT_TARGETS[source], searchParams);
}

export const ROBOTS_NOINDEX_VALUE = "noindex, nofollow, noarchive";
export const PUBLIC_ROBOTS_NOINDEX_VALUE = "noindex, follow, noarchive";

function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPrivateAppPath(pathname: string): boolean {
  return PRIVATE_APP_ROUTE_PREFIXES.some((prefix) =>
    matchesPathPrefix(pathname, prefix),
  );
}

export function isPublicNoindexPath(pathname: string): boolean {
  return PUBLIC_NOINDEX_ROUTE_PREFIXES.some((prefix) =>
    matchesPathPrefix(pathname, prefix),
  );
}

export function getPublicSectionSitemapPaths(): string[] {
  return RUBRIQUE_REGISTRY.filter(
    (rubrique) =>
      rubrique.kind === "section" &&
      PUBLIC_INDEXABLE_SECTION_IDS.has(rubrique.id) &&
      rubrique.availability === "available" &&
      rubrique.implementation === "finalized",
  )
    .map((rubrique) => rubrique.route)
    .sort((a, b) => a.localeCompare(b, "fr"));
}

export function getPrivateSectionRoutes(): string[] {
  return RUBRIQUE_REGISTRY.filter(
    (rubrique) =>
      rubrique.kind === "section" && PRIVATE_SECTION_IDS.has(rubrique.id),
  )
    .map((rubrique) => rubrique.route)
    .sort((a, b) => a.localeCompare(b, "fr"));
}

export function getPublicNoindexSectionRoutes(): string[] {
  return RUBRIQUE_REGISTRY.filter(
    (rubrique) =>
      rubrique.kind === "section" && PUBLIC_NOINDEX_SECTION_IDS.has(rubrique.id),
  )
    .map((rubrique) => rubrique.route)
    .sort((a, b) => a.localeCompare(b, "fr"));
}
