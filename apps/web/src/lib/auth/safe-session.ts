import { auth } from "@clerk/nextjs/server";

export type SafeAuthSession = {
  userId: string | null;
  clerkReachable: boolean;
};

export async function getSafeAuthSession(): Promise<SafeAuthSession> {
  try {
    const session = await auth();
    return {
      userId: session.userId ?? null,
      clerkReachable: true,
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
    };
  }
}
