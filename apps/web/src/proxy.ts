import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { getClerkRuntimeConfig } from "@/lib/clerk-session-config";
import { isDevAuthBypassEnabled } from "@/lib/auth/dev-auth";
import { PROTECTED_ROUTE_PATTERNS } from "@/lib/auth/protected-routes";
import {
  getPrivateSectionRoutes,
  isPrivateAppPath,
  ROBOTS_NOINDEX_VALUE,
} from "@/lib/seo/indexability";
import { createPublicRateLimitResponse } from "@/lib/security/validation";
import { getTrustedClientIp } from "@/lib/rate-limit/utils";
import { resolveBackdropToneKey } from "@/lib/ui/backdrop-tone";

const isProtectedRoute = createRouteMatcher([...PROTECTED_ROUTE_PATTERNS]);
const PUBLIC_ROUTE_EXCEPTIONS = ["/actions/map", "/api/actions/map"] as const;
const PRIVATE_SECTION_ROUTES = getPrivateSectionRoutes();

type PostRateLimitRule = {
  prefix: string;
  limit: number;
  window: number;
  label: string;
};

const POST_RATE_LIMIT_RULES: PostRateLimitRule[] = [
  { prefix: "/api/newsletter/subscribe", limit: 5, window: 60, label: "newsletter" },
  { prefix: "/api/actions/simple", limit: 4, window: 300, label: "actions-simple" },
  { prefix: "/api/analytics/funnel", limit: 20, window: 60, label: "analytics-funnel" },
  { prefix: "/api/community/bug-reports", limit: 6, window: 60, label: "community-bug-reports" },
  { prefix: "/api/community/events", limit: 8, window: 60, label: "community-events" },
  { prefix: "/api/community/promotion-requests", limit: 3, window: 300, label: "promotion-requests" },
  { prefix: "/api/partners/onboarding-requests", limit: 3, window: 300, label: "partner-onboarding" },
  { prefix: "/api/chat", limit: 20, window: 60, label: "chat" },
];

function isPublicException(pathname: string): boolean {
  return PUBLIC_ROUTE_EXCEPTIONS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function shouldNoIndex(pathname: string): boolean {
  if (isPrivateAppPath(pathname)) {
    return true;
  }

  return PRIVATE_SECTION_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function getPostRateLimitRule(pathname: string): PostRateLimitRule | null {
  return (
    POST_RATE_LIMIT_RULES.find(
      (rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`),
    ) ?? null
  );
}

function nextWithAppHeaders(req: NextRequest): NextResponse {
  const pathname = req.nextUrl.pathname;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-cleanmymap-app-shell", isAppShellRoute(pathname) ? "1" : "0");
  requestHeaders.set(
    "x-cleanmymap-hide-global-header",
    pathname === "/" ? "1" : "0",
  );
  const backdropToneKey = resolveBackdropToneKey(pathname);
  if (backdropToneKey) {
    requestHeaders.set("x-cleanmymap-backdrop-tone", backdropToneKey);
  } else {
    requestHeaders.delete("x-cleanmymap-backdrop-tone");
  }
  if (shouldNoIndex(pathname)) {
    requestHeaders.set("x-cleanmymap-noindex", "1");
  }
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  if (shouldNoIndex(pathname)) {
    response.headers.set("X-Robots-Tag", ROBOTS_NOINDEX_VALUE);
  }
  return response;
}

// Rate limiting basique en mémoire
// Note : Sur Vercel, ceci est instancié par "Edge Function instance".
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 30; // requêtes
const WINDOW = 60 * 1000; // 1 minute en ms
export const APP_SHELL_ROUTE_PREFIXES = [
  "/actions",
  "/admin",
  "/dashboard",
  "/explorer",
  "/learn",
  "/methodologie",
  "/observatoire",
  "/parcours",
  "/partners",
  "/prints",
  "/profil",
  "/reports",
  "/sections",
  "/signalement",
  "/sponsor-portal",
] as const;

export function isAppShellRoute(pathname: string): boolean {
  return APP_SHELL_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const clerkRuntime = getClerkRuntimeConfig();

const clerkProxy = clerkMiddleware(
  async (auth, req) => {
    const { pathname } = req.nextUrl;
    const bypassClerk = isDevAuthBypassEnabled(req.headers.get("host"));

    // Rate Limiting pour les routes API en POST uniquement
    if (req.method === "POST" && pathname.startsWith("/api/")) {
      const ip = getTrustedClientIp(req);
      const now = Date.now();
      const rule = getPostRateLimitRule(pathname);
      const rateLimitKey = `${ip}:${rule?.label ?? "generic"}`;
      const limit = rule?.limit ?? LIMIT;
      const windowMs = (rule?.window ?? WINDOW / 1000) * 1000;
      const record = rateLimitMap.get(rateLimitKey);

      if (record) {
        if (now < record.resetAt) {
          if (record.count >= limit) {
            console.warn(
              `[RateLimit] IP ${ip} blocked on ${pathname}${rule ? ` (${rule.label})` : ""}`,
            );
            return createPublicRateLimitResponse("Too many requests. Please try again later.", {
              code: "proxy_rate_limited",
            });
          }
          record.count++;
        } else {
          // Reset window
          record.count = 1;
          record.resetAt = now + windowMs;
        }
      } else {
        // First request
        rateLimitMap.set(rateLimitKey, { count: 1, resetAt: now + windowMs });
      }
    }

    if (!bypassClerk && isProtectedRoute(req) && !isPublicException(pathname)) {
      await auth.protect();
    }

    return nextWithAppHeaders(req);
  },
  {
    domain: clerkRuntime.domain,
    isSatellite: clerkRuntime.isSatellite,
    satelliteAutoSync: clerkRuntime.satelliteAutoSync,
    authorizedParties: clerkRuntime.authorizedParties,
  },
);

export default async function proxy(req: NextRequest, evt: NextFetchEvent) {
  try {
    const response = await clerkProxy(req, evt);
    const clerkReason = response?.headers.get("x-clerk-auth-reason");
    const isDevBrowserMissing = clerkReason?.includes("dev-browser-missing") ?? false;

    if (isDevBrowserMissing) {
      if (
        !isDevAuthBypassEnabled(req.headers.get("host")) &&
        isProtectedRoute(req) &&
        !isPublicException(req.nextUrl.pathname)
      ) {
        const signInUrl = new URL("/sign-in", req.url);
        signInUrl.searchParams.set("redirect_url", req.url);
        return NextResponse.redirect(signInUrl);
      }
      return response;
    }
    return response;
  } catch (error) {
    console.error("Proxy fallback: Clerk middleware failure", error);
    if (
      !isDevAuthBypassEnabled(req.headers.get("host")) &&
      isProtectedRoute(req) &&
      !isPublicException(req.nextUrl.pathname)
    ) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }
    return nextWithAppHeaders(req);
  }
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
