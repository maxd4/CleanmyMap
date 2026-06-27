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

export const PROXY_MATCHER_PATTERNS = [
  "/admin(.*)",
  "/dashboard(.*)",
  "/sponsor-portal(.*)",
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
    if (!bypassClerk) {
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

export default async function proxy(req: NextRequest, evt: NextFetchEvent) {
  try {
    const response = await clerkProxy(req, evt);
    const clerkReason = response?.headers.get("x-clerk-auth-reason");
    const isDevBrowserMissing = clerkReason?.includes("dev-browser-missing") ?? false;

    if (isDevBrowserMissing) {
      if (!isDevAuthBypassEnabled(req.headers.get("host"))) {
        const signInUrl = new URL("/sign-in", req.url);
        signInUrl.searchParams.set("redirect_url", req.url);
        return NextResponse.redirect(signInUrl);
      }
      return response;
    }
    return response;
  } catch (error) {
    console.error("Proxy fallback: Clerk middleware failure", error);
    if (!isDevAuthBypassEnabled(req.headers.get("host"))) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }
    return nextWithSeoHeaders(req);
  }
}

export const config = {
  matcher: [
    "/admin(.*)",
    "/dashboard(.*)",
    "/sponsor-portal(.*)",
  ],
};
