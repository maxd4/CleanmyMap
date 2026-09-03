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
  "/missions",
  "/actions/history",
  "/declaration",
  "/form-comparison",
  "/onboarding",
  "/partners/dashboard",
  "/partners/onboarding",
  PARCOURS_ROUTE,
  "/prints/report",
  PROFIL_ROUTE,
  "/reglages",
  SPONSOR_PORTAL_ROUTE,
] as const;

export const CLERK_CONTEXT_ROUTE_PREFIXES = [
  "/pilotage",
  "/reports",
  "/actions/new",
  "/signalement",
  "/partners/network",
  "/sections/annuaire",
  "/sections/rejoindre-un-formulaire",
  "/sections/community",
] as const;

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
  "/api/legal-content-reports",
  "/api/partners",
  "/api/pilotage",
  "/api/recycling",
  "/api/reports",
  "/api/route",
  "/api/sandbox",
  "/api/send",
  "/api/services",
  "/api/signalements",
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

function isAnonymousSafeApiRequest(req: NextRequest): boolean {
  if (req.method !== "GET") {
    return false;
  }

  return [
    "/api/actions/map",
    "/api/actions/map/initial-nearest",
    "/api/actions/group-join",
    "/api/partners/published-directory",
  ].some((pathname) => req.nextUrl.pathname === pathname);
}

function hasClerkSessionSignal(req: NextRequest): boolean {
  if (req.headers.has("authorization")) {
    return true;
  }

  const cookie = req.headers.get("cookie") ?? "";
  return /(?:^|;\s*)(?:__session|__client|__clerk_db_jwt(?:_[^=;]+)?|__clerk_handshake)=/.test(
    cookie,
  );
}

function shouldSkipClerkForAnonymousPublicRequest(req: NextRequest): boolean {
  if (req.method === "GET" && [
    "/api/actions/map",
    "/api/actions/map/initial-nearest",
    "/api/partners/published-directory",
  ].includes(req.nextUrl.pathname)) {
    return true;
  }

  if (hasClerkSessionSignal(req)) {
    return false;
  }

  return isClerkContextOnlyRoute(req.nextUrl.pathname) || isAnonymousSafeApiRequest(req);
}

function clerkUnavailableResponse(req: NextRequest): NextResponse {
  if (isClerkContextOnlyRoute(req.nextUrl.pathname)) {
    return nextWithSeoHeaders(req);
  }

  if (isApiRoute(req.nextUrl.pathname)) {
    if (isAnonymousSafeApiRequest(req)) {
      return nextWithSeoHeaders(req);
    }

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
  "/missions",
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
  if (shouldSkipClerkForAnonymousPublicRequest(req)) {
    return nextWithSeoHeaders(req);
  }

  try {
    const response = await clerkProxy(req, evt);
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
  // Keep this literal: Next statically analyzes proxy matcher exports at build time.
  matcher: [
    "/admin(.*)",
    "/dashboard(.*)",
    "/missions(.*)",
    "/actions/history(.*)",
    "/declaration(.*)",
    "/form-comparison(.*)",
    "/onboarding(.*)",
    "/partners/dashboard(.*)",
    "/partners/onboarding(.*)",
    "/parcours(.*)",
    "/prints/report(.*)",
    "/profil(.*)",
    "/reglages(.*)",
    "/sponsor-portal(.*)",
    "/pilotage(.*)",
    "/reports(.*)",
    "/actions/new(.*)",
    "/signalement(.*)",
    "/partners/network(.*)",
    "/sections/annuaire(.*)",
    "/sections/rejoindre-un-formulaire(.*)",
    "/sections/community(.*)",
    "/api/account(.*)",
    "/api/actions(.*)",
    "/api/admin(.*)",
    "/api/analytics(.*)",
    "/api/chat(.*)",
    "/api/community(.*)",
    "/api/contact(.*)",
    "/api/email(.*)",
    "/api/environmental-impact(.*)",
    "/api/gamification(.*)",
    "/api/legal-content-reports(.*)",
    "/api/partners(.*)",
    "/api/pilotage(.*)",
    "/api/recycling(.*)",
    "/api/reports(.*)",
    "/api/route(.*)",
    "/api/sandbox(.*)",
    "/api/send(.*)",
    "/api/services(.*)",
    "/api/signalements(.*)",
    "/api/spots(.*)",
    "/api/users(.*)",
  ],
};
