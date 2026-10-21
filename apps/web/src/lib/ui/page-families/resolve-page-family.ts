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

const ACCUEIL_PILOTAGE_SECTION_ROUTES = [
  "/sections/elus",
] as const;

const AGIR_SECTION_ROUTES = [
  "/sections/route",
  "/sections/weather",
  "/sections/rejoindre-une-action",
  "/sections/rejoindre-un-formulaire",
] as const;

const CARTOGRAPHIE_IMPACT_SECTION_ROUTES = [
  "/sections/gamification",
  "/sections/leaderboard",
] as const;

const RESEAU_DISCUSSIONS_SECTION_ROUTES = [
  "/sections/community",
  "/sections/feedback",
  "/sections/actors",
  "/sections/annuaire",
  "/sections/messagerie",
  "/sections/open-data",
  "/sections/funding",
  "/sections/trash-spotter",
] as const;

/**
 * Famille par défaut déduite du pathname.
 *
 * Les exceptions visuelles nommées restent appliquées ensuite par
 * PAGE_FAMILY_ROUTE_EXCEPTIONS et applyImplicitRouteOverrides.
 *
 * Les sections recycling, compost et climate ne sont volontairement pas
 * classées ici tant que leur famille produit canonique n'est pas arbitrée.
 */
export function resolveBasePageFamilyId(pathname: string): PageFamilyId {
  if (!pathname || pathname === "/") return "homepage";
  if (isRoute(pathname, "/spogomi")) return "agir";
  const base = pathname.split("/")[1] ?? "";
  return resolveBaseEarlyFamily(pathname, base)
    ?? resolveBaseSectionFamily(pathname, base)
    ?? resolveBaseFallbackFamily(base);
}

function resolveBaseEarlyFamily(pathname: string, base: string): PageFamilyId | null {
  if (base === "sign-in" || base === "sign-up" || isRoute(pathname, "/onboarding")) return "authentification";
  if (["contact", "conditions-generales-utilisation", "conditions-utilisation", "mentions-legales", "politique-confidentialite", "politique-cookies", "en"].includes(base)) return "juridique";
  if (base === "reglages" || isRoute(pathname, "/preview/actions/new") || isRoute(pathname, "/error/429")) return "systeme";
  if (base === "admin" || isRoute(pathname, ADMIN_ROUTE)) return "administration";
  if (base === "prints" || isRoute(pathname, "/prints/report")) return "impression";
  return null;
}

function resolveBaseSectionFamily(pathname: string, base: string): PageFamilyId | null {
  if (isAnyRoute(pathname, ACCUEIL_PILOTAGE_SECTION_ROUTES)) return "accueil-pilotage";
  if (isAnyRoute(pathname, AGIR_SECTION_ROUTES)) return "agir";
  if (isAnyRoute(pathname, CARTOGRAPHIE_IMPACT_SECTION_ROUTES)) return "cartographie-impact";
  if (isAnyRoute(pathname, RESEAU_DISCUSSIONS_SECTION_ROUTES)) return "reseau-discussions";
  if (["community", "messagerie", "open-data"].includes(base)) return "reseau-discussions";
  if (base === "gamification" || isRoute(pathname, "/actions/map")) return "cartographie-impact";
  return null;
}

function resolveBaseFallbackFamily(base: string): PageFamilyId {
  if (["dashboard", "compte", "profil", "parcours", "pilotage", "sponsor-portal", "elus"].includes(base)) return "accueil-pilotage";
  if (["actions", "declaration", "signalement", "missions"].includes(base)) return "agir";
  if (base === "reports") return "cartographie-impact";
  if (base === "learn") return "apprendre";
  if (base === "partners") return "reseau-discussions";
  return "secours";
}

function resolveExceptionFamily(
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

  const rule = PAGE_FAMILY_ROUTE_EXCEPTIONS.find(
    (entry) => entry.id === exceptionId,
  );

  if (!rule) {
    return null;
  }

  const family = PAGE_FAMILIES[rule.familyId];
  return { ...family, exceptionId };
}

/**
 * Source de vérité : pathname → famille visuelle.
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
    isRoute(pathname, "/sections/gamification") ||
    isRoute(pathname, "/sections/leaderboard")
  ) {
    return { ...IMPACT_REPORTS_FAMILY, exceptionId: "reports-impact" };
  }

  return family;
}

export function resolvePageFamily(
  pathname: string | null | undefined,
): ResolvedPageFamily {
  const path = pathname ?? "/";
  const exception = PAGE_FAMILY_ROUTE_EXCEPTIONS.find((rule) =>
    rule.match(path),
  );

  if (exception) {
    const resolved = resolveExceptionFamily(exception.id);
    if (resolved) {
      return applyImplicitRouteOverrides(path, resolved);
    }
  }

  const familyId = resolveBasePageFamilyId(path);
  return applyImplicitRouteOverrides(path, PAGE_FAMILIES[familyId]);
}

export function getPageFamilyById(
  familyId: PageFamilyId,
): ResolvedPageFamily {
  return PAGE_FAMILIES[familyId];
}
