import type {
  LeaderboardCollectiveItemDto,
  LeaderboardResponseDto,
  IndividualLeaderboardItem,
  LeaderboardMetric,
} from "@/lib/gamification/progression-types";

export type { LeaderboardMetric } from "@/lib/gamification/progression-types";

export type LeaderboardScope = "individual" | "collective";
export type LeaderboardPeriod = "lifetime" | "yearToDate";
export type PublicIndividualLeaderboardItem = IndividualLeaderboardItem;
type PublicCollectiveLeaderboardItem = LeaderboardCollectiveItemDto;
export type PublicLeaderboardItem = PublicIndividualLeaderboardItem | PublicCollectiveLeaderboardItem;

export type GamificationLeaderboardResponse = LeaderboardResponseDto & {
  status: "ok";
  period: LeaderboardPeriod;
};

export function buildLeaderboardUrl(
  scope: LeaderboardScope,
  period: LeaderboardPeriod,
  metric: LeaderboardMetric = "level",
): string {
  const params = new URLSearchParams({ scope, period, metric });
  return `/api/gamification/leaderboard?${params.toString()}`;
}

export function buildLeaderboardKey(
  enabled: boolean,
  scope: LeaderboardScope,
  period: LeaderboardPeriod,
  metric: LeaderboardMetric = "level",
): string | null {
  return enabled ? buildLeaderboardUrl(scope, period, metric) : null;
}

export async function fetchGamificationLeaderboard(
  url: string,
): Promise<GamificationLeaderboardResponse> {
  const response = await fetch(url);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : "Classement indisponible.";
    throw new Error(message);
  }
  return body as GamificationLeaderboardResponse;
}

export function filterLeaderboardItems(
  items: PublicLeaderboardItem[],
  scope: LeaderboardScope,
  query: string,
): PublicLeaderboardItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("fr-FR");
  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => {
    const searchable =
      scope === "individual"
      ? (item as PublicIndividualLeaderboardItem).publicLabel
      : (item as PublicCollectiveLeaderboardItem).associationName;
    return searchable.toLocaleLowerCase("fr-FR").includes(normalizedQuery);
  });
}
