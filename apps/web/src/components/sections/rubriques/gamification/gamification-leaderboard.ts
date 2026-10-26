import type {
  LeaderboardResponseDto,
  IndividualLeaderboardItem,
  LeaderboardMetric,
  PublicStructureLeaderboardItem,
} from "@/lib/gamification/progression-types";
import { isOrganizerType } from "@/lib/actions/organizer-type";

export type { LeaderboardMetric } from "@/lib/gamification/progression-types";

export type LeaderboardScope = "individual" | "collective";
export type PublicIndividualLeaderboardItem = IndividualLeaderboardItem;
type PublicCollectiveLeaderboardItem = PublicStructureLeaderboardItem;
export type PublicLeaderboardItem = PublicIndividualLeaderboardItem | PublicCollectiveLeaderboardItem;

export type GamificationLeaderboardResponse = LeaderboardResponseDto & {
  status: "ok";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLeaderboardItem(value: unknown): value is PublicLeaderboardItem {
  if (!isRecord(value)
    || typeof value.rank !== "number"
    || typeof value.publicLabel !== "string"
    || typeof value.level !== "number"
    || typeof value.xpValidated !== "number"
    || typeof value.badgeTotal !== "number"
    || typeof value.gradeCount !== "number"
    || typeof value.oneShotCount !== "number") {
    return false;
  }
  return !Object.hasOwn(value, "structureType") || isOrganizerType(value.structureType);
}

function isGamificationLeaderboardResponse(value: unknown): value is GamificationLeaderboardResponse {
  return isRecord(value)
    && value.status === "ok"
    && (value.scope === "individual" || value.scope === "collective")
    && typeof value.generatedAt === "string"
    && Array.isArray(value.items)
    && value.items.every(isLeaderboardItem)
    && isRecord(value.recognition)
    && Array.isArray(value.recognition.topContributors)
    && value.recognition.topContributors.length === 0
    && value.recognition.currentContributor === null;
}

export function buildLeaderboardUrl(
  scope: LeaderboardScope,
  metric: LeaderboardMetric = "level",
): string {
  const params = new URLSearchParams({ scope, metric });
  return `/api/gamification/leaderboard?${params.toString()}`;
}

export function buildLeaderboardKey(
  enabled: boolean,
  scope: LeaderboardScope,
  metric: LeaderboardMetric = "level",
): string | null {
  return enabled ? buildLeaderboardUrl(scope, metric) : null;
}

export async function fetchGamificationLeaderboard(
  url: string,
): Promise<GamificationLeaderboardResponse> {
  const response = await fetch(url);
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String(isRecord(body) && typeof body.error === "string" ? body.error : "Classement indisponible.")
        : "Classement indisponible.";
    throw new Error(message);
  }
  if (!isGamificationLeaderboardResponse(body)) {
    throw new Error("Classement invalide.");
  }
  return body;
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
      : (item as PublicCollectiveLeaderboardItem).publicLabel;
    return searchable.toLocaleLowerCase("fr-FR").includes(normalizedQuery);
  });
}
