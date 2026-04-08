import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { getClerkRuntimeConfig } from "@/lib/clerk-session-config";

const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/dashboard(.*)",
  "/actions(.*)",
  "/reports(.*)",
  "/sections(.*)",
  "/api/admin(.*)",
  "/api/actions(.*)",
  "/api/reports(.*)",
  "/api/email/test(.*)",
]);

const clerkRuntime = getClerkRuntimeConfig();

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
}, {
  domain: clerkRuntime.domain,
  isSatellite: clerkRuntime.isSatellite,
  satelliteAutoSync: clerkRuntime.satelliteAutoSync,
  authorizedParties: clerkRuntime.authorizedParties,
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
