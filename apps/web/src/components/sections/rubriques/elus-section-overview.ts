import useSWR from "swr";
import { swrRecentViewOptions } from "@/lib/swr-config";
import type { PilotageOverview } from "@/lib/pilotage/overview.types";
import type { ElusSectionTab } from "./elus-section-navigation";

export type PilotageOverviewResponse = {
  status: "ok";
} & PilotageOverview;

export type OverviewFetchError = Error & { status?: number };

export type ElusOverviewIdentity = {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  userId: string | null | undefined;
};

type PilotageOverviewKey = readonly ["/api/pilotage/overview", string];

export const fetchPilotageOverview = async (
  url: string,
): Promise<PilotageOverviewResponse> => {
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  if (!response.ok) {
    const body = await response.text();
    const error = new Error(body || "overview_unavailable") as OverviewFetchError;
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as PilotageOverviewResponse;
};

export function useElusOverview(
  activeTab: ElusSectionTab = "overview",
  identity: ElusOverviewIdentity = {
    isLoaded: false,
    isSignedIn: false,
    userId: null,
  },
) {
  const identityKey =
    identity.isLoaded && identity.isSignedIn === true && identity.userId
      ? identity.userId
      : null;
  const key: PilotageOverviewKey | null = identityKey
    ? ["/api/pilotage/overview", identityKey]
    : null;
  const swrResult = useSWR<PilotageOverviewResponse, OverviewFetchError>(
    key,
    ([url]) => fetchPilotageOverview(url),
    {
      ...swrRecentViewOptions,
      keepPreviousData: false,
      refreshInterval: activeTab === "methods" ? 0 : 1_800_000,
    },
  );

  return {
    ...swrResult,
    data: identityKey ? swrResult.data : undefined,
    error: identityKey ? swrResult.error : undefined,
    identityKey,
    isLoading:
      !identity.isLoaded || Boolean(identityKey && swrResult.isLoading),
  };
}
