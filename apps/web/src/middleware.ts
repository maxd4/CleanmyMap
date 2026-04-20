import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Plan de travail : Prompt 1.1 — MIDDLEWARE CLERK + RATE LIMITING
 * 1. Protection des routes API (sauf health et map)
 * 2. Protection des routes applicatives /(app)/*
 * 3. Rate limiting basique en mémoire pour les POST /api/*
 * 4. Préservation de l'accès public pour la landing, l'observatoire et l'auth
 */

// Définition des matchers
const isPublicRoute = createRouteMatcher([
  "/",                          // Landing page
  "/sign-in(.*)",               // Auth Clerk
  "/sign-up(.*)",               // Auth Clerk
  "/observatoire(.*)",          // Page publique de données
  "/api/health",                // Healthcheck — utilisé par Vercel et monitoring
  "/api/uptime",                // Vérifié par UptimeRobot sans auth
  "/api/actions/map",           // Données publiques de la carte
  "/api/stripe/webhook",        // Webhook Stripe — auth par signature HMAC, pas Clerk
]);

const isProtectedRoute = createRouteMatcher([
  "/api/(.*)",
  "/(app)/(.*)",
]);

// Rate limiting basique en mémoire
// Note : Sur Vercel, ceci est instancié par "Edge Function instance".
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 30; // requêtes
const WINDOW = 60 * 1000; // 1 minute en ms

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // 1. Rate Limiting pour les routes API en POST uniquement
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
        // Fenêtre expirée, on réinitialise
        record.count = 1;
        record.resetAt = now + WINDOW;
      }
    } else {
      rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW });
    }
  }

  // 2. Protection des routes
  // Si ce n'est pas une route publique ET que c'est une route marquée comme protégée
  if (!isPublicRoute(req) && isProtectedRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // On ignore les fichiers statiques et les composants internes de Next.js
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Toujours exécuter pour l'API
    "/(api|trpc)(.*)",
  ],
};
