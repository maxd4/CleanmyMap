const PROFILE_ROUTE_PREFIXES = ["/profil", "/parcours"] as const;

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
