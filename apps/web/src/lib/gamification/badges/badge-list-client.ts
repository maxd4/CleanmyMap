"use client";

export type GamificationBadgeListItem = {
  id?: string;
  name?: string;
  progress?: {
    current?: number;
    target?: number;
  };
  icon?: string;
  visualVariant?: string;
  tooltip?: string;
};

export type GamificationBadgeListResponse = {
  status?: "ok";
  summary?: {
    currentPlaces?: number;
  };
  badges?: GamificationBadgeListItem[];
  quizProgressions?: Array<{
    id?: string;
    name?: string;
    status?: "active";
    tiers?: Array<{
      id?: string;
      label?: string;
      description?: string;
      icon?: string;
    }>;
  }>;
};

type FetchError = Error & {
  status?: number;
};

let inFlightRequest: Promise<GamificationBadgeListResponse> | null = null;

function createFetchError(status: number): FetchError {
  const error = new Error("Failed to load gamification badges");
  (error as FetchError).status = status;
  return error as FetchError;
}

export function resetGamificationBadgesListRequestCache() {
  inFlightRequest = null;
}

export async function loadGamificationBadgesListClient(): Promise<GamificationBadgeListResponse> {
  if (!inFlightRequest) {
    inFlightRequest = (async () => {
      const response = await fetch("/api/gamification/badges/list", {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw createFetchError(response.status);
      }

      return (await response.json()) as GamificationBadgeListResponse;
    })().finally(() => {
      inFlightRequest = null;
    });
  }

  return inFlightRequest;
}
