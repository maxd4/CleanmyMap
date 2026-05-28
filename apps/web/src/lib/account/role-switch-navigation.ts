import {
  PARCOURS_ROUTE_PREFIX,
  PROFILE_ROUTE_PREFIX,
} from "@/lib/accueil-pilotage-routes";

const PROFILE_ROUTE_PREFIXES = [PROFILE_ROUTE_PREFIX, PARCOURS_ROUTE_PREFIX] as const;

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
