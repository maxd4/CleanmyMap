import type {
  LeaderboardMetric,
  PublicLeaderboardItem,
  PublicLeaderboardResponseDto,
  PublicStructureLeaderboardItem,
} from "@/lib/gamification/progression-types";
import { fetchJson } from "@/lib/http/fetch-json";

export type PublicLeaderboardScope = "user" | "structure";

export const PUBLIC_LEADERBOARD_METRICS = ["level", "xp", "badges"] as const satisfies ReadonlyArray<LeaderboardMetric>;

export function buildPublicLeaderboardUrl(
  scope: PublicLeaderboardScope,
  metric: LeaderboardMetric,
): string {
  return `/api/gamification/leaderboard/public?scope=${scope}&metric=${metric}`;
}

export function isPublicStructureItem(
  item: PublicLeaderboardItem,
): item is PublicStructureLeaderboardItem {
  return "structureType" in item;
}

export function formatBadgeBreakdown(item: PublicLeaderboardItem): string {
  return `(${item.gradeCount} grades + ${item.oneShotCount} one-shot)`;
}

export async function fetchPublicLeaderboard(
  url: string,
): Promise<PublicLeaderboardResponseDto> {
  return fetchJson<PublicLeaderboardResponseDto>(url, {
    method: "GET",
    cache: "no-store",
  });
}
