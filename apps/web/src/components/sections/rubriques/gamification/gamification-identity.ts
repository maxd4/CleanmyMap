"use client";

import { useAuth } from "@clerk/nextjs";
import { swrRecentViewOptions } from "@/lib/swr-config";

/**
 * Returns the authenticated Clerk userId only once Clerk is loaded and signed in.
 * Prevents anonymous SWR fetches when a private section is mounted behind a soft-gate.
 */
export function useGamificationPrivateIdentity(): string | null {
  const { isLoaded, isSignedIn, userId } = useAuth();
  return isLoaded && isSignedIn && userId ? userId : null;
}

export const swrPrivateGamificationOptions = {
  ...swrRecentViewOptions,
  keepPreviousData: false,
} as const;
