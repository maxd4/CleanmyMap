import useSWR from "swr";
import type { PilotageOverview } from "@/lib/pilotage/overview.types";

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

export function useElusOverview() {
  return useSWR<PilotageOverviewResponse, OverviewFetchError>(
    "/api/pilotage/overview",
    fetchPilotageOverview,
    {
      refreshInterval: 1_800_000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
}
