import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { getClerkRuntimeConfig } from "@/lib/clerk-session-config";
import { isDevAuthBypassEnabled } from "@/lib/auth/dev-auth";
import {
  getPrivateSectionRoutes,
  isPrivateAppPath,
  ROBOTS_NOINDEX_VALUE,
} from "@/lib/seo/indexability";
import {
  ADMIN_ROUTE,
  DASHBOARD_ROUTE,
  EXPLORER_ROUTE,
  PARCOURS_ROUTE,
  PROFIL_ROUTE,
  SPONSOR_PORTAL_ROUTE,
} from "@/lib/accueil-pilotage-routes";

export const PROTECTED_APP_PAGE_ROUTE_PREFIXES = [
  ADMIN_ROUTE,
  DASHBOARD_ROUTE,
  "/actions/history",
  "/actions/new",
  "/declaration",
  "/form-comparison",
  "/onboarding",
  "/partners/dashboard",
  "/partners/network",
  "/partners/onboarding",
  PARCOURS_ROUTE,
  "/prints/report",
  PROFIL_ROUTE,
  "/reglages",
  "/signalement",
  SPONSOR_PORTAL_ROUTE,
] as const;

export const CLERK_CONTEXT_ROUTE_PREFIXES = ["/pilotage", "/reports"] as const;

// These API families need Clerk request context for auth() or centralized
// authz helpers. Their handlers keep the authentication/authorization decision
// and therefore remain outside auth.protect() in this proxy.
export const CLERK_CONTEXT_API_ROUTE_PREFIXES = [
  "/api/account",
  "/api/actions",
  "/api/admin",
  "/api/analytics",
  "/api/chat",
  "/api/community",
  "/api/contact",
  "/api/email",
  "/api/environmental-impact",
  "/api/gamification",
  "/api/partners",
  "/api/pilotage",
  "/api/recycling",
  "/api/reports",
  "/api/route",
  "/api/sandbox",
  "/api/send",
  "/api/services",
  "/api/spots",
  "/api/users",
] as const;

const toMatcherPatterns = (prefixes: readonly string[]) =>
  prefixes.map((prefix) => `${prefix}(.*)`);

export const PROXY_MATCHER_PATTERNS = [
  ...toMatcherPatterns(PROTECTED_APP_PAGE_ROUTE_PREFIXES),
  ...toMatcherPatterns(CLERK_CONTEXT_ROUTE_PREFIXES),
  ...toMatcherPatterns(CLERK_CONTEXT_API_ROUTE_PREFIXES),
] as const;

const PRIVATE_SECTION_ROUTES = getPrivateSectionRoutes();

function shouldNoIndex(pathname: string): boolean {
  if (isPrivateAppPath(pathname)) {
    return true;
  }

  return PRIVATE_SECTION_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function nextWithSeoHeaders(req: NextRequest): NextResponse {
  const pathname = req.nextUrl.pathname;
  const response = NextResponse.next();
  if (shouldNoIndex(pathname)) {
    response.headers.set("X-Robots-Tag", ROBOTS_NOINDEX_VALUE);
  }
  return response;
}

function isProtectedAppPage(pathname: string): boolean {
  return PROTECTED_APP_PAGE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isClerkContextOnlyRoute(pathname: string): boolean {
  return CLERK_CONTEXT_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function clerkUnavailableResponse(req: NextRequest): NextResponse {
  if (isClerkContextOnlyRoute(req.nextUrl.pathname)) {
    return nextWithSeoHeaders(req);
  }

  if (isApiRoute(req.nextUrl.pathname)) {
    return NextResponse.json(
      {
        error: "Clerk authentication indisponible temporairement.",
        kind: "permission",
      },
      { status: 401 },
    );
  }

  const signInUrl = new URL("/sign-in", req.url);
  signInUrl.searchParams.set("redirect_url", req.url);
  return NextResponse.redirect(signInUrl);
}

export const APP_SHELL_ROUTE_PREFIXES = [
  "/actions",
  ADMIN_ROUTE,
  DASHBOARD_ROUTE,
  EXPLORER_ROUTE,
  "/learn",
  "/methodologie",
  PARCOURS_ROUTE,
  "/partners",
  "/prints",
  PROFIL_ROUTE,
  "/reports",
  "/sections",
  "/signalement",
  SPONSOR_PORTAL_ROUTE,
] as const;

export function isAppShellRoute(pathname: string): boolean {
  return APP_SHELL_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const clerkRuntime = getClerkRuntimeConfig();

const clerkProxy = clerkMiddleware(
  async (auth, req) => {
    const bypassClerk = isDevAuthBypassEnabled(req.headers.get("host"));
    if (!bypassClerk && isProtectedAppPage(req.nextUrl.pathname)) {
      await auth.protect();
    }

    return nextWithSeoHeaders(req);
  },
  {
    domain: clerkRuntime.proxyUrl ? undefined : clerkRuntime.domain,
    proxyUrl: clerkRuntime.proxyUrl,
    isSatellite: clerkRuntime.proxyUrl ? undefined : clerkRuntime.isSatellite,
    satelliteAutoSync: clerkRuntime.proxyUrl ? undefined : clerkRuntime.satelliteAutoSync,
    authorizedParties: clerkRuntime.authorizedParties,
  },
);

export async function proxy(req: NextRequest, evt: NextFetchEvent) {
  try {
    const response = await clerkProxy(req, evt);
    const clerkReason = response?.headers.get("x-clerk-auth-reason");
    const isDevBrowserMissing = clerkReason?.includes("dev-browser-missing") ?? false;

    if (isDevBrowserMissing) {
      if (!isDevAuthBypassEnabled(req.headers.get("host"))) {
        return clerkUnavailableResponse(req);
      }
      return response;
    }
    return response;
  } catch (error) {
    console.error("Proxy fallback: Clerk middleware failure", error);
    if (!isDevAuthBypassEnabled(req.headers.get("host"))) {
      return clerkUnavailableResponse(req);
    }
    return nextWithSeoHeaders(req);
  }
}

export const config = {
  matcher: [...PROXY_MATCHER_PATTERNS],
};
