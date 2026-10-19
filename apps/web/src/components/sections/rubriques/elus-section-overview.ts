import useSWR from "swr";
import { swrRecentViewOptions } from "@/lib/swr-config";
import type { PilotageOverview } from "@/lib/pilotage/overview.types";
import type { ElusSectionTab } from "./elus-section-navigation";

export type PilotageOverviewResponse = {
  status: "ok";
} & PilotageOverview;

export type OverviewFetchError = Error & { status?: number };

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

export function useElusOverview(activeTab: ElusSectionTab = "overview") {
  return useSWR<PilotageOverviewResponse, OverviewFetchError>(
    "/api/pilotage/overview",
    fetchPilotageOverview,
    {
      ...swrRecentViewOptions,
      refreshInterval: activeTab === "methods" ? 0 : 1_800_000,
    },
  );
}
