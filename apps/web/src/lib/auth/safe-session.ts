import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import {
  getDevAuthBypassUserId,
  isDevAuthBypassEnabled,
} from "./dev-auth";

export type SafeAuthSession = {
  userId: string | null;
  clerkReachable: boolean;
  state: "authenticated" | "anonymous" | "unavailable";
};

export async function getSafeAuthSession(): Promise<SafeAuthSession> {
  const host = await getRequestHost();
  if (isDevAuthBypassEnabled(host)) {
    return {
      userId: getDevAuthBypassUserId(),
      clerkReachable: true,
      state: "authenticated",
    };
  }

  try {
    const session = await auth();
    const userId = session.userId ?? null;
    return {
      userId,
      clerkReachable: true,
      state: userId ? "authenticated" : "anonymous",
    };
  } catch (error) {
    const isExpectedDynamicUsage =
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      (error as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE";

    // Next.js can throw this during static generation when auth() is not allowed.
    if (!isExpectedDynamicUsage) {
      console.error("Safe auth session fallback triggered", error);
    }

    return {
      userId: null,
      clerkReachable: false,
      state: "unavailable",
    };
  }
}

async function getRequestHost(): Promise<string | null> {
  try {
    const requestHeaders = await headers();
    return requestHeaders.get("host");
  } catch {
    return null;
  }
}
