import { requireAuthenticatedAccess } from "@/lib/authz";
import { requireMobileAuthenticatedAccess } from "@/lib/auth/mobile-bearer";

/** Shared Clerk boundary for web cookie and bounded native bearer requests. */
export async function requireActionRequestAccess(request: Request) {
  try {
    const webAccess = await requireAuthenticatedAccess();
    if (webAccess.ok) return webAccess;
  } catch {
    // A native bearer request may not have the web middleware context needed
    // by auth(). The bounded Clerk request verifier below is authoritative for
    // that transport and must still run.
  }
  return requireMobileAuthenticatedAccess(request);
}
