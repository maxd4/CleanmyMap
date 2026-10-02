import {
  PARCOURS_ROUTE,
  PROFIL_ROUTE,
} from "@/lib/accueil-pilotage-routes";

const PROFILE_ROUTE_PREFIXES = [PROFIL_ROUTE, PARCOURS_ROUTE] as const;

export function getRoleSwitchTargetPath(
  currentPathname: string,
  profilePath: string,
): string | null {
  const normalizedPath = currentPathname.trim();
  const shouldRedirectToProfile = PROFILE_ROUTE_PREFIXES.some(
    (prefix) =>
      normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`),
  );

  return shouldRedirectToProfile ? profilePath : null;
}
