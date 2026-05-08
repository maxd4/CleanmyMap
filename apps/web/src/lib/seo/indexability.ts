import { getSectionClerkAccessMode } from "@/lib/clerk-access";
import { RUBRIQUE_REGISTRY } from "@/lib/sections-registry";

export const PUBLIC_APP_SITEMAP_PATHS = [
  "/",
  "/actions/map",
  "/conditions-generales-utilisation",
  "/conditions-utilisation",
  "/declaration-simple",
  "/en",
  "/explorer",
  "/learn",
  "/learn/bonnes-pratiques",
  "/learn/comprendre",
  "/learn/hub",
  "/learn/ressources",
  "/learn/sentrainer",
  "/mentions-legales",
  "/methodologie",
  "/observatoire",
  "/politique-confidentialite",
  "/politique-cookies",
  "/reports",
] as const;

export const PRIVATE_APP_ROUTE_PREFIXES = [
  "/accueil",
  "/admin",
  "/actions/history",
  "/actions/new",
  "/form-comparison",
  "/onboarding",
  "/parcours",
  "/partners/dashboard",
  "/partners/network",
  "/partners/onboarding",
  "/pilotage",
  "/prints/report",
  "/profil",
  "/reglages",
  "/signalement",
  "/sign-in",
  "/sign-up",
  "/sponsor-portal",
] as const;

export const ROBOTS_NOINDEX_VALUE = "noindex, nofollow, noarchive";

function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPrivateAppPath(pathname: string): boolean {
  return PRIVATE_APP_ROUTE_PREFIXES.some((prefix) =>
    matchesPathPrefix(pathname, prefix),
  );
}

export function getPublicSectionSitemapPaths(): string[] {
  return RUBRIQUE_REGISTRY.filter(
    (rubrique) =>
      rubrique.kind === "section" &&
      rubrique.availability === "available" &&
      rubrique.implementation === "finalized" &&
      getSectionClerkAccessMode(rubrique.id) === "visible",
  )
    .map((rubrique) => rubrique.route)
    .sort((a, b) => a.localeCompare(b, "fr"));
}

export function getPrivateSectionRoutes(): string[] {
  return RUBRIQUE_REGISTRY.filter(
    (rubrique) =>
      rubrique.kind === "section" &&
      (getSectionClerkAccessMode(rubrique.id) !== "visible" ||
        rubrique.availability !== "available" ||
        rubrique.implementation !== "finalized"),
  )
    .map((rubrique) => rubrique.route)
    .sort((a, b) => a.localeCompare(b, "fr"));
}
