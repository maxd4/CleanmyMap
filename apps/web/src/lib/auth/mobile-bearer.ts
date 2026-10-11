import { clerkClient } from "@clerk/nextjs/server";

export type MobileAuthenticatedAccess =
  | { ok: true; userId: string }
  | { ok: false; status: 401; error: string };

/**
 * Authenticates a native mobile request without relying on the browser cookie
 * context used by auth(). Only a Clerk session JWT in Authorization is valid.
 */
export async function requireMobileAuthenticatedAccess(
  request: Request,
): Promise<MobileAuthenticatedAccess> {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  try {
    const state = await (await clerkClient()).authenticateRequest(request, {
      acceptsToken: "session_token",
    });
    if (!state.isAuthenticated) {
      return { ok: false, status: 401, error: "Unauthorized" };
    }

    const authObject = state.toAuth();
    return authObject.userId
      ? { ok: true, userId: authObject.userId }
      : { ok: false, status: 401, error: "Unauthorized" };
  } catch (error) {
    console.warn("Mobile Clerk bearer authentication failed", {
      error: error instanceof Error ? error.message : "unknown error",
    });
    return { ok: false, status: 401, error: "Unauthorized" };
  }
}
