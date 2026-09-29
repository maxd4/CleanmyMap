import type {
  CollectiveLeaderboardItem,
  ContributorRecognitionCard,
  ContributorRecognitionSummary,
  IndividualLeaderboardItem,
} from "@/lib/gamification/progression-types";

export type LeaderboardScope = "individual" | "collective";
export type LeaderboardPeriod = "lifetime" | "yearToDate";
export type PublicIndividualLeaderboardItem = Omit<IndividualLeaderboardItem, "userId">;
export type PublicLeaderboardItem = PublicIndividualLeaderboardItem | CollectiveLeaderboardItem;
type PublicRecognitionCard = Omit<ContributorRecognitionCard, "userId">;
type PublicRecognitionSummary = Omit<ContributorRecognitionSummary, "topContributors" | "currentContributor"> & {
  topContributors: PublicRecognitionCard[];
  currentContributor: PublicRecognitionCard | null;
};

export type GamificationLeaderboardResponse = {
  status: "ok";
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
  generatedAt: string;
  items: PublicLeaderboardItem[];
  recognition: PublicRecognitionSummary;
};

type RawGamificationLeaderboardResponse = Omit<GamificationLeaderboardResponse, "items" | "recognition"> & {
  items: (IndividualLeaderboardItem | CollectiveLeaderboardItem)[];
  recognition: ContributorRecognitionSummary;
};

export function buildLeaderboardUrl(
  scope: LeaderboardScope,
  period: LeaderboardPeriod,
): string {
  const params = new URLSearchParams({ scope, period });
  return `/api/gamification/leaderboard?${params.toString()}`;
}

export function buildLeaderboardKey(
  enabled: boolean,
  scope: LeaderboardScope,
  period: LeaderboardPeriod,
): string | null {
  return enabled ? buildLeaderboardUrl(scope, period) : null;
}

function withoutUserId<T extends { userId: string }>(item: T): Omit<T, "userId"> {
  return Object.fromEntries(
    Object.entries(item).filter(([key]) => key !== "userId"),
  ) as Omit<T, "userId">;
}

export function sanitizeLeaderboardResponse(
  response: RawGamificationLeaderboardResponse,
): GamificationLeaderboardResponse {
  return {
    ...response,
    items: response.items.map((item) =>
      "userId" in item ? withoutUserId(item) : item,
    ),
    recognition: {
      ...response.recognition,
      topContributors: response.recognition.topContributors.map(withoutUserId),
      currentContributor: response.recognition.currentContributor
        ? withoutUserId(response.recognition.currentContributor)
        : null,
    },
  };
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
  return sanitizeLeaderboardResponse(body as RawGamificationLeaderboardResponse);
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
      ? `${(item as PublicIndividualLeaderboardItem).actorName} ${(item as PublicIndividualLeaderboardItem).associationName}`
      : (item as CollectiveLeaderboardItem).associationName;
    return searchable.toLocaleLowerCase("fr-FR").includes(normalizedQuery);
  });
}
