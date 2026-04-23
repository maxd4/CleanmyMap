import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { getClerkRuntimeConfig } from "@/lib/clerk-session-config";
import { PROTECTED_ROUTE_PATTERNS } from "@/lib/auth/protected-routes";

const isProtectedRoute = createRouteMatcher([...PROTECTED_ROUTE_PATTERNS]);

// Rate limiting basique en mémoire
// Note : Sur Vercel, ceci est instancié par "Edge Function instance".
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 30; // requêtes
const WINDOW = 60 * 1000; // 1 minute en ms

const clerkRuntime = getClerkRuntimeConfig();

const clerkProxy = clerkMiddleware(
  async (auth, req) => {
    const { pathname } = req.nextUrl;

    // Rate Limiting pour les routes API en POST uniquement
    if (req.method === "POST" && pathname.startsWith("/api/")) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "127.0.0.1";
      const now = Date.now();
      const record = rateLimitMap.get(ip);

      if (record) {
        if (now < record.resetAt) {
          if (record.count >= LIMIT) {
            console.warn(`[RateLimit] IP ${ip} blocked on ${pathname}`);
            return new NextResponse(
              JSON.stringify({ error: "Too many requests. Please try again later." }),
              { status: 429, headers: { "Content-Type": "application/json" } }
            );
          }
          record.count++;
        } else {
          // Reset window
          record.count = 1;
          record.resetAt = now + WINDOW;
        }
      } else {
        // First request
        rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW });
      }
    }

    if (isProtectedRoute(req)) {
      await auth.protect();
    }
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
    if (response?.status === 500 && clerkReason === "dev-browser-missing") {
      if (isProtectedRoute(req)) {
        const signInUrl = new URL("/sign-in", req.url);
        signInUrl.searchParams.set("redirect_url", req.url);
        return NextResponse.redirect(signInUrl);
      }
      return NextResponse.next();
    }
    return response;
  } catch (error) {
    console.error("Proxy fallback: Clerk middleware failure", error);
    if (isProtectedRoute(req)) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
