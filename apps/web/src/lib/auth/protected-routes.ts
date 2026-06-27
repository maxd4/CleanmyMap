import {
  ADMIN_ROUTE,
  DASHBOARD_ROUTE,
  SPONSOR_PORTAL_ROUTE,
} from "@/lib/accueil-pilotage-routes";

export const PROTECTED_ROUTE_PATTERNS = [
  `${ADMIN_ROUTE}(.*)`,
  `${DASHBOARD_ROUTE}(.*)`,
  "/actions(.*)",
  "/form-comparison(.*)",
  "/sections(.*)",
  "/api/admin(.*)",
  "/api/actions(.*)",
  "/api/account(.*)",
  "/api/community(.*)",
  "/api/chat(.*)",
  "/api/analytics(.*)",
  "/api/pilotage(.*)",
  "/api/partners(.*)",
  "/api/recycling(.*)",
  "/api/reports(.*)",
  "/api/route(.*)",
  "/api/send(.*)",
  "/api/services(.*)",
  "/api/spots(.*)",
  "/api/users(.*)",
  "/api/email/test(.*)",
  "/prints(.*)",
  `${SPONSOR_PORTAL_ROUTE}(.*)`,
] as const;

function normalizeProtectedRoutePattern(pattern: string): string {
  return pattern.replace(/\(\.\*\)$/, "");
}

export function isProtectedRoutePath(pathname: string): boolean {
  const normalizedPathname = pathname.split("?")[0]?.split("#")[0] ?? pathname;

  return PROTECTED_ROUTE_PATTERNS.some((pattern) => {
    const basePath = normalizeProtectedRoutePattern(pattern);
    return (
      normalizedPathname === basePath ||
      normalizedPathname.startsWith(`${basePath}/`)
    );
  });
}
