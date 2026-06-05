import {
  EXPLORER_SOMMAIRE_FAMILY,
  IMPACT_REPORTS_FAMILY,
  METHODOLOGIE_FAMILY,
  PAGE_FAMILIES,
  PARTNERS_NETWORK_FAMILY,
  STATE_429_FAMILY,
} from "@/lib/ui/page-families/families/registry";
import { PAGE_FAMILY_ROUTE_EXCEPTIONS } from "@/lib/ui/page-families/exceptions";
import { ADMIN_ROUTE } from "@/lib/accueil-pilotage-routes";
import type {
  PageFamilyId,
  ResolvedPageFamily,
} from "@/lib/ui/page-families/types";

function isRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isAnyRoute(pathname: string, routes: readonly string[]): boolean {
  return routes.some((route) => isRoute(pathname, route));
}

/**
 * Famille par défaut déduite du pathname (sans exceptions).
 */
export function resolveBasePageFamilyId(pathname: string): PageFamilyId {
  if (!pathname || pathname === "/") {
    return "homepage";
  }

  const base = pathname.split("/")[1] ?? "";

  if (base === "sign-in" || base === "sign-up" || isRoute(pathname, "/onboarding")) {
    return "authentification";
  }

  if (
    base === "contact" ||
    base === "conditions-generales-utilisation" ||
    base === "conditions-utilisation" ||
    base === "mentions-legales" ||
    base === "politique-confidentialite" ||
    base === "politique-cookies" ||
    base === "en"
  ) {
    return "juridique";
  }

  if (
    base === "form-comparison" ||
    base === "declaration-simple" ||
    base === "reglages" ||
    isRoute(pathname, "/preview/actions/new")
  ) {
    return "systeme";
  }

  if (isRoute(pathname, "/error/429")) {
    return "systeme";
  }

  if (base === "admin" || isRoute(pathname, ADMIN_ROUTE)) {
    return "administration";
  }

  if (base === "prints" || isRoute(pathname, "/prints/report")) {
    return "impression";
  }

  if (
    base === "community" ||
    base === "messagerie" ||
    base === "open-data" ||
    isAnyRoute(pathname, [
      "/sections/community",
      "/sections/feedback",
      "/sections/messagerie",
      "/sections/open-data",
    ])
  ) {
    return "reseau-discussions";
  }

  if (
    base === "sandbox" ||
    base === "gamification" ||
    isAnyRoute(pathname, [
      "/actions/map",
      "/sections/sandbox",
      "/sections/gamification",
    ])
  ) {
    return "cartographie-impact";
  }

  if (
    base === "dashboard" ||
    base === "profil" ||
    base === "parcours" ||
    base === "pilotage" ||
    base === "sponsor-portal" ||
    base === "elus"
  ) {
    return "accueil-pilotage";
  }

  if (
    base === "actions" ||
    base === "declaration" ||
    base === "signalement" ||
    base === "missions"
  ) {
    return "agir";
  }

  if (base === "reports") {
    return "cartographie-impact";
  }

  if (base === "learn") {
    return "apprendre";
  }

  if (base === "partners") {
    return "reseau-discussions";
  }

  return "secours";
}

function resolveExceptionFamily(
  pathname: string,
  exceptionId: string,
): ResolvedPageFamily | null {
  if (exceptionId === "explorer-sommaire") {
    return { ...EXPLORER_SOMMAIRE_FAMILY, exceptionId };
  }
  if (exceptionId === "methodologie-impact") {
    return { ...METHODOLOGIE_FAMILY, exceptionId };
  }
  if (exceptionId === "reports-impact") {
    return { ...IMPACT_REPORTS_FAMILY, exceptionId };
  }
  const rule = PAGE_FAMILY_ROUTE_EXCEPTIONS.find((e) => e.id === exceptionId);
  if (!rule) {
    return null;
  }
  const family = PAGE_FAMILIES[rule.familyId];
  return { ...family, exceptionId };
}

/**
 * Source de vérité : pathname → famille visuelle (fond + tokens hero).
 */
function applyImplicitRouteOverrides(
  pathname: string,
  family: ResolvedPageFamily,
): ResolvedPageFamily {
  if (isRoute(pathname, "/error/429")) {
    return { ...STATE_429_FAMILY, exceptionId: "error-429" };
  }
  if (pathname === "/partners" || pathname.startsWith("/partners/")) {
    return { ...PARTNERS_NETWORK_FAMILY, exceptionId: "partners-indigo" };
  }
  if (
    isRoute(pathname, "/reports") ||
    isRoute(pathname, "/gamification") ||
    isRoute(pathname, "/sections/gamification")
  ) {
    return { ...IMPACT_REPORTS_FAMILY, exceptionId: "reports-impact" };
  }
  return family;
}

export function resolvePageFamily(pathname: string | null | undefined): ResolvedPageFamily {
  const path = pathname ?? "/";
  const exception = PAGE_FAMILY_ROUTE_EXCEPTIONS.find((rule) => rule.match(path));
  if (exception) {
    const resolved = resolveExceptionFamily(path, exception.id);
    if (resolved) {
      return applyImplicitRouteOverrides(path, resolved);
    }
  }

  const familyId = resolveBasePageFamilyId(path);
  return applyImplicitRouteOverrides(path, PAGE_FAMILIES[familyId]);
}

export function getPageFamilyById(familyId: PageFamilyId): ResolvedPageFamily {
  return PAGE_FAMILIES[familyId];
}
