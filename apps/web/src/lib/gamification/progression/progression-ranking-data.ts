import { unstable_cache } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildIndividualLeaderboardCandidates } from "./progression-ranking";

const USER_LEVEL_RANKING_CACHE_REVALIDATE_SECONDS = 120;
const USER_LEVEL_RANKING_CACHE_TAG = "gamification-user-level-ranking";

type UserLevelRankingItem = {
  rank: number;
  userId: string;
  actorName: string;
  currentLevel: number;
  xpValidated: number;
  badgeTotal: number;
};

export type UserLevelRankingSummary = {
  topRows: UserLevelRankingItem[];
  currentUserRow: UserLevelRankingItem | null;
};

export async function loadUserLevelRankingSummary(
  userId: string,
): Promise<UserLevelRankingSummary> {
  const cached = unstable_cache(
    async () => {
      const supabase = getSupabaseServerClient(true);
      const rows = await buildIndividualLeaderboardCandidates(supabase, "level");

      return rows.map((row): UserLevelRankingItem => ({
        rank: row.rank,
        userId: row.userId,
        actorName: row.publicLabel,
        currentLevel: row.level,
        xpValidated: row.xpValidated,
        badgeTotal: row.badgeTotal,
      }));
    },
    ["gamification-user-level-ranking"],
    {
      revalidate: USER_LEVEL_RANKING_CACHE_REVALIDATE_SECONDS,
      tags: [USER_LEVEL_RANKING_CACHE_TAG],
    },
  );

  const rankedRows = await cached();
  return {
    topRows: rankedRows.slice(0, 8),
    currentUserRow: rankedRows.find((row) => row.userId === userId) ?? null,
  };
}
