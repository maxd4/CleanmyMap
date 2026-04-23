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
    console.error("Safe auth session fallback triggered", error);
    return {
      userId: null,
      clerkReachable: false,
    };
  }
}
