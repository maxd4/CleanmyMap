export const DASHBOARD_ROUTE = "/dashboard";
export const EXPLORER_ROUTE = "/explorer";
export const PARCOURS_ROUTE = "/parcours";
export const PILOTAGE_ROUTE = "/pilotage";
export const PROFIL_ROUTE = "/profil";
export const ADMIN_ROUTE = "/admin";
export const ADMIN_GODMODE_ROUTE = "/admin/godmode";
export const SPONSOR_PORTAL_ROUTE = "/sponsor-portal";
export const REPORTS_ROUTE = "/reports";
export const SIGN_IN_ROUTE = "/sign-in";
export const ONBOARDING_LOCALISATION_ROUTE = "/onboarding/localisation";

export const PROFILE_ROUTE_PREFIX = PROFIL_ROUTE;
export const PARCOURS_ROUTE_PREFIX = PARCOURS_ROUTE;

export function buildProfileRoute(profile: string): string {
  return `${PROFIL_ROUTE}/${profile}`;
}

export function buildParcoursRoute(profile: string): string {
  return `${PARCOURS_ROUTE}/${profile}`;
}

export function buildPilotageSignInHref(): string {
  return `${SIGN_IN_ROUTE}?redirect_url=${encodeURIComponent(PILOTAGE_ROUTE)}`;
}

export function buildOnboardingLocalisationHref(nextPath: string = PROFIL_ROUTE): string {
  return `${ONBOARDING_LOCALISATION_ROUTE}?next=${encodeURIComponent(nextPath)}`;
}
