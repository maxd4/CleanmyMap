import { getSectionClerkAccessMode } from "@/lib/clerk-access";
import { RUBRIQUE_REGISTRY } from "@/lib/sections-registry";
import { HOME_ALIAS_ROUTE } from "@/lib/home-routes";
import {
  ADMIN_ROUTE,
  DASHBOARD_ROUTE,
  EXPLORER_ROUTE,
  PARCOURS_ROUTE,
  PILOTAGE_ROUTE,
  PROFIL_ROUTE,
  SPONSOR_PORTAL_ROUTE,
} from "@/lib/accueil-pilotage-routes";

export const PUBLIC_APP_SITEMAP_PATHS = [
  "/",
  "/actions/map",
  "/conditions-generales-utilisation",
  "/conditions-utilisation",
  "/en",
  EXPLORER_ROUTE,
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
  HOME_ALIAS_ROUTE,
  ADMIN_ROUTE,
  "/actions/history",
  "/actions/new",
  "/declaration",
  "/form-comparison",
  "/onboarding",
  DASHBOARD_ROUTE,
  PARCOURS_ROUTE,
  "/partners/dashboard",
  "/partners/network",
  "/partners/onboarding",
  PILOTAGE_ROUTE,
  "/prints/report",
  PROFIL_ROUTE,
  "/reglages",
  "/signalement",
  "/sign-in",
  "/sign-up",
  SPONSOR_PORTAL_ROUTE,
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
