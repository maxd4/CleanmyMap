import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { runActionQuery } from "@/lib/actions/query";
import {
  evaluateActionQualityScore,
  toFloat,
  toInt,
} from "./progression-utils";
import {
  ACTION_APPROVED_COLUMNS,
  isSpontaneousActionNotes,
} from "./progression-data";
import type { ActionRow, UserLabelSummary } from "./progression-types";

const ACTION_LABEL_COLUMNS = "created_by_clerk_id, actor_name, notes, action_date";
const USER_LABEL_SUMMARY_CACHE_REVALIDATE_SECONDS = 120;
const USER_LABEL_SUMMARY_CACHE_TAG = "gamification-user-label-summary";
const USER_LABEL_SUMMARY_LIMIT = 10000;
const USER_LEVEL_RANKING_CACHE_REVALIDATE_SECONDS = 120;
const USER_LEVEL_RANKING_CACHE_TAG = "gamification-user-level-ranking";

type UserLabelSummaryCacheEntry = [string, UserLabelSummary];

type UserLevelRankingItem = {
  rank: number;
  userId: string;
  actorName: string;
  currentLevel: number;
  xpValidated: number;
};

export type UserLevelRankingSummary = {
  topRows: UserLevelRankingItem[];
  currentUserRow: UserLevelRankingItem | null;
};

export async function loadUserLabelSummary(
  supabase: SupabaseClient,
): Promise<Map<string, UserLabelSummary>> {
  const cached = unstable_cache(
    async (): Promise<UserLabelSummaryCacheEntry[]> => {
      const rows = await runActionQuery<{
        created_by_clerk_id: string;
        actor_name: string | null;
        notes: string | null;
        action_date: string;
      }>(supabase, (query) =>
        query
          .select(ACTION_LABEL_COLUMNS)
          .order("action_date", { ascending: false })
          .limit(USER_LABEL_SUMMARY_LIMIT),
      );

      const entries: UserLabelSummaryCacheEntry[] = [];
      const seenUserIds = new Set<string>();

      for (const row of rows) {
        if (!isSpontaneousActionNotes(row.notes) || seenUserIds.has(row.created_by_clerk_id)) {
          continue;
        }
        seenUserIds.add(row.created_by_clerk_id);
        const metadata = extractActionMetadataFromNotes(row.notes);
        entries.push([
          row.created_by_clerk_id,
          {
            actorName:
              (row.actor_name ?? "").trim() || row.created_by_clerk_id || "Contributeur",
            associationName: metadata.associationName?.trim() || "Sans association",
          },
        ]);
      }

      return entries;
    },
    ["gamification-user-label-summary", `limit:${USER_LABEL_SUMMARY_LIMIT}`],
    {
      revalidate: USER_LABEL_SUMMARY_CACHE_REVALIDATE_SECONDS,
      tags: [USER_LABEL_SUMMARY_CACHE_TAG],
    },
  );

  return new Map(await cached());
}

export async function loadUserLevelRankingSummary(
  userId: string,
): Promise<UserLevelRankingSummary> {
  const cached = unstable_cache(
    async () => {
      const supabase = getSupabaseServerClient(true);
      const [profilesResult, labelsByUser] = await Promise.all([
        supabase
          .from("progression_profiles")
          .select("user_id, current_level, xp_validated")
          .order("current_level", { ascending: false })
          .order("xp_validated", { ascending: false })
          .limit(120),
        loadUserLabelSummary(supabase).catch(
          () => new Map<string, { actorName: string }>(),
        ),
      ]);

      if (profilesResult.error) return [];

      const rows =
        (profilesResult.data as Array<{
          user_id: string;
          current_level: number | null;
          xp_validated: number | null;
        }> | null) ?? [];

      return rows.map((row, index): UserLevelRankingItem => ({
        rank: index + 1,
        userId: row.user_id,
        actorName:
          labelsByUser.get(row.user_id)?.actorName?.trim() ||
          `Utilisateur ${index + 1}`,
        currentLevel: Math.max(1, Number(row.current_level ?? 1)),
        xpValidated: Math.max(0, Number(row.xp_validated ?? 0)),
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

export async function loadUserImpactStats(
  supabase: SupabaseClient,
): Promise<
  Map<
    string,
    {
      qualityAverage: number;
      validatedActions: number;
      wasteKg: number;
      wasteCoverageRate: number;
      totalButts: number;
    }
  >
> {
  const rows = await runActionQuery<ActionRow>(supabase, (query) =>
    query.select(ACTION_APPROVED_COLUMNS).eq("status", "approved").limit(10000),
  );
  const grouped = new Map<string, {
    qualitySum: number;
    validatedActions: number;
    wasteKg: number;
    wasteKnownActions: number;
    totalButts: number;
  }>();

  for (const row of rows) {
    if (!isSpontaneousActionNotes(row.notes)) continue;
    const quality = evaluateActionQualityScore(row).score;
    const previous = grouped.get(row.created_by_clerk_id) ?? {
      qualitySum: 0,
      validatedActions: 0,
      wasteKg: 0,
      wasteKnownActions: 0,
      totalButts: 0,
    };
    previous.qualitySum += quality;
    previous.validatedActions += 1;
    if (row.waste_kg !== null && Number.isFinite(Number(row.waste_kg)) && Number(row.waste_kg) >= 0) {
      previous.wasteKg += toFloat(row.waste_kg, 0);
      previous.wasteKnownActions += 1;
    }
    previous.totalButts += toInt(row.cigarette_butts, 0);
    grouped.set(row.created_by_clerk_id, previous);
  }

  const output = new Map<string, {
    qualityAverage: number;
    validatedActions: number;
    wasteKg: number;
    wasteCoverageRate: number;
    totalButts: number;
  }>();
  for (const [userId, value] of grouped.entries()) {
    output.set(userId, {
      qualityAverage:
        value.validatedActions > 0
          ? Math.round((value.qualitySum / value.validatedActions) * 10) / 10
          : 0,
      validatedActions: value.validatedActions,
      wasteKg: Math.round(value.wasteKg * 10) / 10,
      wasteCoverageRate:
        value.validatedActions > 0
          ? (value.wasteKnownActions / value.validatedActions) * 100
          : 0,
      totalButts: value.totalButts,
    });
  }
  return output;
}
