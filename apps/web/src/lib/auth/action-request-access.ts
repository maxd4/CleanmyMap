import { requireAuthenticatedAccess } from "@/lib/authz";
import { requireMobileAuthenticatedAccess } from "@/lib/auth/mobile-bearer";

/** Shared Clerk boundary for web cookie and bounded native bearer requests. */
export async function requireActionRequestAccess(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const bearerRequest = /^bearer\b/i.test(authorization);
  let webAccess: Awaited<ReturnType<typeof requireAuthenticatedAccess>> | null = null;
  try {
    webAccess = await requireAuthenticatedAccess();
  } catch {
    // A native bearer request may not have a browser cookie context.
  }

  if (bearerRequest) {
    const bearerAccess = await requireMobileAuthenticatedAccess(request);
    if (!bearerAccess.ok) return bearerAccess;
    if (webAccess?.ok && webAccess.userId !== bearerAccess.userId) {
      return { ok: false as const, status: 401 as const, error: "Unauthorized" };
    }
    return bearerAccess;
  }

  return webAccess?.ok
    ? webAccess
    : { ok: false as const, status: 401 as const, error: "Unauthorized" };
}
