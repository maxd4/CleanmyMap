"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildClerkSupabaseAccessTokenProvider } from "@/lib/clerk-supabase-token";
import { loadGamificationUserCounters } from "@/lib/gamification/counters";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type GamificationCountersClientResponse = {
  status?: "ok";
  counters?: {
    totalPoints?: number;
    approvedActionsCount?: number;
    completeActionsCount?: number;
    visitedPlacesCount?: number;
    eligibleFormsCount?: number;
    participationCount?: number;
  };
};

type AccessTokenProvider = () => Promise<string | null>;
type FetchError = Error & {
  status?: number;
};

const inFlightRequests = new Map<string, Promise<GamificationCountersClientResponse>>();

function createFetchError(status: number): FetchError {
  const error = new Error("Failed to load gamification counters");
  (error as FetchError).status = status;
  return error as FetchError;
}

function createSupabaseClient(
  getToken: AccessTokenProvider,
): SupabaseClient {
  return getSupabaseBrowserClient(buildClerkSupabaseAccessTokenProvider(getToken));
}

function toResponse(counters: Awaited<ReturnType<typeof loadGamificationUserCounters>>): GamificationCountersClientResponse {
  return {
    status: "ok",
    counters: {
      totalPoints: counters.totalPoints,
      approvedActionsCount: counters.approvedActionsCount,
      completeActionsCount: counters.completeActionsCount,
      visitedPlacesCount: counters.visitedPlacesCount,
      eligibleFormsCount: counters.eligibleFormsCount,
      participationCount: counters.participationCount,
    },
  };
}

export function resetGamificationCountersRequestCache() {
  inFlightRequests.clear();
}

export async function loadGamificationCountersClient(
  userId: string | null,
  getToken: AccessTokenProvider,
): Promise<GamificationCountersClientResponse> {
  if (!userId) {
    throw createFetchError(401);
  }

  const cacheKey = userId;
  const cachedRequest = inFlightRequests.get(cacheKey);
  if (cachedRequest) {
    return cachedRequest;
  }

  const request = (async () => {
    try {
      const supabase = createSupabaseClient(getToken);
      const counters = await loadGamificationUserCounters(supabase, userId);
      return toResponse(counters);
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("unauthorized")) {
        throw createFetchError(401);
      }
      throw error;
    }
  })().finally(() => {
    inFlightRequests.delete(cacheKey);
  });

  inFlightRequests.set(cacheKey, request);
  return request;
}
