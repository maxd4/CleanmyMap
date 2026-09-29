import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeDisplayNameMode } from "@/lib/profiles";
import { buildPublicStructureLeaderboard } from "./progression-structure-ranking";
import { loadLeaderboardBatchData } from "./progression-ranking-batch";
import type {
  IndividualLeaderboardItem,
  LeaderboardMetric,
  LeaderboardResponseDto,
  PublicStructureLeaderboardItem,
} from "./progression-types";
import { toFloat, toInt } from "./progression-utils";

type IndividualProfileRow = {
  user_id: string;
  display_name: string | null;
  display_name_mode: string | null;
  handle: string | null;
  leaderboard_public_opt_in: boolean | null;
};

export type InternalIndividualLeaderboardItem = IndividualLeaderboardItem & { userId: string };

export function buildPublicLeaderboardLabel(
  row: Pick<IndividualProfileRow, "display_name" | "display_name_mode" | "handle">,
): string | null {
  const mode = normalizeDisplayNameMode(row.display_name_mode);
  const label = mode === "pseudo" ? row.handle : row.display_name;
  const normalized = label?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function isPublicLeaderboardProfile(
  row: Pick<IndividualProfileRow, "display_name" | "display_name_mode" | "handle" | "leaderboard_public_opt_in">,
): boolean {
  return row.leaderboard_public_opt_in === true && Boolean(buildPublicLeaderboardLabel(row));
}

function comparePublicLabels(left: string, right: string): number {
  return left.localeCompare(right, "fr-FR", { sensitivity: "base" }) || left.localeCompare(right);
}

export function compareLeaderboardItems(a: IndividualLeaderboardItem, b: IndividualLeaderboardItem, metric: LeaderboardMetric): number {
  if (metric === "xp") {
    return b.xpValidated - a.xpValidated || b.level - a.level || b.badgeTotal - a.badgeTotal || comparePublicLabels(a.publicLabel, b.publicLabel);
  }
  if (metric === "badges") {
    return b.badgeTotal - a.badgeTotal || b.gradeCount - a.gradeCount || b.oneShotCount - a.oneShotCount || b.xpValidated - a.xpValidated || b.level - a.level || comparePublicLabels(a.publicLabel, b.publicLabel);
  }
  return b.level - a.level || b.xpValidated - a.xpValidated || b.badgeTotal - a.badgeTotal || comparePublicLabels(a.publicLabel, b.publicLabel);
}

export function compareIndividualLeaderboardItems(a: IndividualLeaderboardItem, b: IndividualLeaderboardItem, metric: LeaderboardMetric): number {
  return compareLeaderboardItems(a, b, metric);
}

export function rankIndividualLeaderboardItems(items: readonly InternalIndividualLeaderboardItem[], metric: LeaderboardMetric): InternalIndividualLeaderboardItem[] {
  return [...items].sort((a, b) => compareIndividualLeaderboardItems(a, b, metric)).slice(0, 60).map((item, index) => ({ ...item, rank: index + 1 }));
}

export async function buildIndividualLeaderboardCandidates(supabase: SupabaseClient, metric: LeaderboardMetric): Promise<InternalIndividualLeaderboardItem[]> {
  const batch = await loadLeaderboardBatchData(supabase);
  const candidates = batch.profiles.flatMap((profile) => {
    if (!isPublicLeaderboardProfile(profile)) return [];
    const publicLabel = buildPublicLeaderboardLabel(profile);
    if (!publicLabel) return [];
    const progression = batch.progressions.get(profile.user_id);
    return [{
      rank: 0,
      userId: profile.user_id,
      publicLabel,
      level: Math.max(1, toInt(progression?.current_level, 1)),
      xpValidated: Math.max(0, toFloat(progression?.xp_validated, 0)),
      ...(batch.badgeCounts.get(profile.user_id) ?? { badgeTotal: 0, gradeCount: 0, oneShotCount: 0 }),
    } satisfies InternalIndividualLeaderboardItem];
  });
  return rankIndividualLeaderboardItems(candidates, metric);
}

export async function buildIndividualLeaderboardForUser(supabase: SupabaseClient, userId: string, metric: LeaderboardMetric = "level") {
  const candidates = await buildIndividualLeaderboardCandidates(supabase, metric);
  return { item: candidates.find((candidate) => candidate.userId === userId) ?? null, total: candidates.length };
}

export async function buildPublicUserLeaderboard(supabase: SupabaseClient, metric: LeaderboardMetric): Promise<IndividualLeaderboardItem[]> {
  return (await buildIndividualLeaderboardCandidates(supabase, metric)).map((item) => {
    const { userId, ...publicItem } = item;
    void userId;
    return publicItem;
  });
}

type CurrentLeaderboardItems = IndividualLeaderboardItem[] | PublicStructureLeaderboardItem[];

export async function getGamificationLeaderboard(supabase: SupabaseClient, scope: "individual" | "collective", metric: LeaderboardMetric = "level") {
  const items: CurrentLeaderboardItems = scope === "individual"
    ? await buildPublicUserLeaderboard(supabase, metric)
    : await buildPublicStructureLeaderboard(supabase, metric);
  return {
    scope,
    generatedAt: new Date().toISOString(),
    items,
    recognition: { topContributors: [] as [], currentContributor: null },
  };
}

type GamificationLeaderboardResult = Awaited<ReturnType<typeof getGamificationLeaderboard>>;

export function projectGamificationLeaderboardResponse(response: GamificationLeaderboardResult): LeaderboardResponseDto {
  return {
    scope: response.scope,
    generatedAt: response.generatedAt,
    items: response.items.map((item) => {
      if (response.scope === "collective") {
        const structure = item as PublicStructureLeaderboardItem;
        return { rank: structure.rank, publicLabel: structure.publicLabel, structureType: structure.structureType, level: structure.level, xpValidated: structure.xpValidated, badgeTotal: structure.badgeTotal, gradeCount: structure.gradeCount, oneShotCount: structure.oneShotCount };
      }
      const individual = item as IndividualLeaderboardItem;
      return { rank: individual.rank, publicLabel: individual.publicLabel.trim(), level: individual.level, xpValidated: individual.xpValidated, badgeTotal: individual.badgeTotal, gradeCount: individual.gradeCount, oneShotCount: individual.oneShotCount };
    }),
    recognition: { topContributors: [], currentContributor: null },
  };
}
