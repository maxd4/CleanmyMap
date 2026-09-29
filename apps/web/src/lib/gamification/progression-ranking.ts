import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeDisplayNameMode } from "@/lib/profiles";
import { buildContributorRecognitionIndex } from "./contributor-recognition";
import { loadGamificationCatalog } from "./gamification-catalog-loader";
import { countCurrentLeaderboardBadges } from "./leaderboard-badges";
import { getYearToDateStartDate } from "./annual-reset";
import {
  actionQualityScoreFromRow,
  loadApprovedActionRows,
  parseAssociationNameFromActionNotes,
} from "./progression-data";
import type {
  ActionRow,
  CollectiveLeaderboardItem,
  ContributorRecognitionSummary,
  IndividualLeaderboardItem,
  LeaderboardCollectiveItemDto,
  LeaderboardMetric,
  LeaderboardResponseDto,
} from "./progression-types";
import { toFloat, toInt } from "./progression-utils";

type LeaderboardPeriod = "lifetime" | "yearToDate";

type CollectiveGroup = {
  qualitySum: number;
  validatedActions: number;
  wasteKg: number;
  wasteKnownActions: number;
  members: Set<string>;
};

type IndividualProfileRow = {
  user_id: string;
  display_name: string | null;
  display_name_mode: string | null;
  handle: string | null;
  leaderboard_public_opt_in: boolean | null;
  xp_validated: number | null;
  current_level: number | null;
};

type InternalIndividualLeaderboardItem = IndividualLeaderboardItem & {
  userId: string;
};

function addCollectiveRow(grouped: Map<string, CollectiveGroup>, row: ActionRow): void {
  const associationName = parseAssociationNameFromActionNotes(row.notes);
  const quality = actionQualityScoreFromRow(row);
  const current = grouped.get(associationName) ?? {
    qualitySum: 0,
    validatedActions: 0,
    wasteKg: 0,
    wasteKnownActions: 0,
    members: new Set<string>(),
  };

  current.qualitySum += quality;
  current.validatedActions += 1;
  if (row.waste_kg !== null && Number.isFinite(Number(row.waste_kg)) && Number(row.waste_kg) >= 0) {
    current.wasteKg += toFloat(row.waste_kg, 0);
    current.wasteKnownActions += 1;
  }
  current.members.add(row.created_by_clerk_id);
  grouped.set(associationName, current);
}

/** COMPATIBILITY: legacy collective recognition is outside the CURRENT user metrics. */
function toCollectiveLeaderboardItem(
  entry: [string, CollectiveGroup],
): CollectiveLeaderboardItem {
  const [associationName, value] = entry;
  const qualityAverage =
    value.validatedActions > 0
      ? Math.round((value.qualitySum / value.validatedActions) * 10) / 10
      : 0;
  const score =
    qualityAverage * 0.6 +
    (value.wasteKnownActions === value.validatedActions
      ? Math.min(500, value.wasteKg) * 0.25
      : 0) +
    value.validatedActions * 0.15;
  const structureLevel = Math.max(1, Math.trunc(score));

  return {
    rank: 0,
    associationName,
    // COMPATIBILITY: retained only for the legacy collective response.
    score: Math.round(score * 10) / 10,
    currentLevel: structureLevel,
    potentialLevel: structureLevel,
    members: value.members.size,
    qualityAverage,
    validatedActions: value.validatedActions,
    wasteKg: Math.round(value.wasteKg * 10) / 10,
    wasteCoverageRate:
      value.validatedActions > 0
        ? (value.wasteKnownActions / value.validatedActions) * 100
        : 0,
  };
}

function buildCollectiveLeaderboardItems(approvedActionRows: ActionRow[]): CollectiveLeaderboardItem[] {
  const grouped = new Map<string, CollectiveGroup>();
  approvedActionRows.forEach((row) => addCollectiveRow(grouped, row));

  return [...grouped.entries()]
    .map(toCollectiveLeaderboardItem)
    .sort(
      (a, b) =>
        b.currentLevel - a.currentLevel ||
        b.score - a.score ||
        b.validatedActions - a.validatedActions,
    )
    .slice(0, 60)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function buildPublicLeaderboardLabel(row: Pick<IndividualProfileRow, "display_name" | "display_name_mode" | "handle">): string | null {
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

export function compareLeaderboardItems(
  a: IndividualLeaderboardItem,
  b: IndividualLeaderboardItem,
  metric: LeaderboardMetric,
): number {
  if (metric === "xp") {
    return (
      b.xpValidated - a.xpValidated ||
      b.level - a.level ||
      b.badgeTotal - a.badgeTotal ||
      comparePublicLabels(a.publicLabel, b.publicLabel)
    );
  }

  if (metric === "badges") {
    return (
      b.badgeTotal - a.badgeTotal ||
      b.gradeCount - a.gradeCount ||
      b.oneShotCount - a.oneShotCount ||
      b.xpValidated - a.xpValidated ||
      b.level - a.level ||
      comparePublicLabels(a.publicLabel, b.publicLabel)
    );
  }

  return (
    b.level - a.level ||
    b.xpValidated - a.xpValidated ||
    b.badgeTotal - a.badgeTotal ||
    comparePublicLabels(a.publicLabel, b.publicLabel)
  );
}

export function compareIndividualLeaderboardItems(
  a: IndividualLeaderboardItem,
  b: IndividualLeaderboardItem,
  metric: LeaderboardMetric,
): number {
  return compareLeaderboardItems(a, b, metric);
}

export function rankIndividualLeaderboardItems(
  items: readonly InternalIndividualLeaderboardItem[],
  metric: LeaderboardMetric,
): InternalIndividualLeaderboardItem[] {
  return [...items]
    .sort((a, b) => compareIndividualLeaderboardItems(a, b, metric))
    .slice(0, 60)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

async function loadOptedInProfiles(
  supabase: SupabaseClient,
): Promise<IndividualProfileRow[]> {
  const result = await supabase
    .from("profiles")
    .select("id, display_name, display_name_mode, handle, leaderboard_public_opt_in, xp_validated, current_level")
    .eq("leaderboard_public_opt_in", true)
    .limit(1000);
  if (result.error) throw new Error(result.error.message);

  return ((result.data ?? []) as Array<IndividualProfileRow & { id?: string }>).flatMap((row) => {
    const userId = row.user_id || row.id;
    const profile = { ...row, user_id: userId ?? "" };
    return userId && isPublicLeaderboardProfile(profile) ? [profile] : [];
  });
}

export async function buildIndividualLeaderboardCandidates(
  supabase: SupabaseClient,
  metric: LeaderboardMetric,
): Promise<InternalIndividualLeaderboardItem[]> {
  const profiles = await loadOptedInProfiles(supabase);
  const candidates = await Promise.all(
    profiles.map(async (profile) => {
      const catalog = await loadGamificationCatalog(supabase, profile.user_id);
      const badgeCounts = countCurrentLeaderboardBadges(catalog);
    const publicLabel = buildPublicLeaderboardLabel(profile);
      if (!publicLabel) return null;

      return {
        rank: 0,
        userId: profile.user_id,
        publicLabel,
        level: Math.max(1, toInt(profile.current_level, 1)),
        xpValidated: Math.max(0, toFloat(profile.xp_validated, 0)),
        ...badgeCounts,
      } satisfies InternalIndividualLeaderboardItem;
    }),
  );

  return rankIndividualLeaderboardItems(
    candidates.filter((item): item is InternalIndividualLeaderboardItem => Boolean(item)),
    metric,
  );
}

async function buildIndividualLeaderboard(
  supabase: SupabaseClient,
  period: LeaderboardPeriod = "lifetime",
  metric: LeaderboardMetric = "level",
): Promise<IndividualLeaderboardItem[]> {
  void period;
  return (await buildIndividualLeaderboardCandidates(supabase, metric)).map((item) => {
    const { userId, ...publicItem } = item;
    void userId;
    return publicItem;
  });
}

export async function buildIndividualLeaderboardForUser(
  supabase: SupabaseClient,
  userId: string,
  metric: LeaderboardMetric = "level",
): Promise<{ item: InternalIndividualLeaderboardItem | null; total: number }> {
  const candidates = await buildIndividualLeaderboardCandidates(supabase, metric);
  return {
    item: candidates.find((candidate) => candidate.userId === userId) ?? null,
    total: candidates.length,
  };
}

export async function buildPublicUserLeaderboard(
  supabase: SupabaseClient,
  metric: LeaderboardMetric,
): Promise<IndividualLeaderboardItem[]> {
  return (await buildIndividualLeaderboardCandidates(supabase, metric)).map((candidate) => {
    const { userId, ...item } = candidate;
    void userId;
    return item;
  });
}

export async function getGamificationLeaderboard(
  supabase: SupabaseClient,
  scope: "individual" | "collective",
  period: LeaderboardPeriod = "lifetime",
  metric: LeaderboardMetric = "level",
): Promise<{
  scope: "individual" | "collective";
  generatedAt: string;
  items: IndividualLeaderboardItem[] | CollectiveLeaderboardItem[];
  recognition: ContributorRecognitionSummary;
}> {
  if (scope === "individual") {
    return {
      scope,
      generatedAt: new Date().toISOString(),
      items: await buildIndividualLeaderboard(supabase, period, metric),
      recognition: {
        // The CURRENT user projection never exposes impact, recognition or IDs.
        topContributors: [],
        currentContributor: null,
      },
    };
  }

  const yearToDateStartDate = getYearToDateStartDate();
  const approvedActionRows = await loadApprovedActionRows(supabase);
  const yearToDateApprovedActionRows = await loadApprovedActionRows(
    supabase,
    10000,
    yearToDateStartDate,
  );
  const recognitionRows = period === "yearToDate" ? yearToDateApprovedActionRows : approvedActionRows;
  const recognitionIndex = buildContributorRecognitionIndex(recognitionRows);

  return {
    scope,
    generatedAt: new Date().toISOString(),
    items: buildCollectiveLeaderboardItems(approvedActionRows),
    recognition: {
      topContributors: recognitionIndex.topContributors,
      currentContributor: null,
    },
  };
}

function projectIndividualLeaderboardItem(
  item: IndividualLeaderboardItem,
): IndividualLeaderboardItem | null {
  const publicLabel = typeof item.publicLabel === "string" ? item.publicLabel.trim() : "";
  if (!publicLabel) return null;

  return {
    rank: item.rank,
    publicLabel,
    level: item.level,
    xpValidated: item.xpValidated,
    badgeTotal: item.badgeTotal,
    gradeCount: item.gradeCount,
    oneShotCount: item.oneShotCount,
  };
}

function projectCollectiveLeaderboardItem(
  item: CollectiveLeaderboardItem,
): LeaderboardCollectiveItemDto {
  return {
    rank: item.rank,
    associationName: item.associationName,
    currentLevel: item.currentLevel,
    members: item.members,
    qualityAverage: item.qualityAverage,
    validatedActions: item.validatedActions,
  };
}

type GamificationLeaderboardResult = Awaited<ReturnType<typeof getGamificationLeaderboard>>;

/**
 * Project the internal ranking result at the server boundary.
 * This is the confidentiality boundary; the browser must not sanitize IDs.
 */
export function projectGamificationLeaderboardResponse(
  response: GamificationLeaderboardResult,
): LeaderboardResponseDto {
  if (response.scope === "individual") {
    const individualItems = response.items as IndividualLeaderboardItem[];
    return {
      scope: response.scope,
      generatedAt: response.generatedAt,
      items: individualItems.flatMap((item) => {
        if (!("publicLabel" in item)) return [];
        const projected = projectIndividualLeaderboardItem(item);
        return projected ? [projected] : [];
      }),
      recognition: {
        topContributors: [],
        currentContributor: null,
      },
    };
  }

  const collectiveItems = response.items as CollectiveLeaderboardItem[];

  return {
    scope: response.scope,
    generatedAt: response.generatedAt,
    items: collectiveItems.map(projectCollectiveLeaderboardItem),
    recognition: {
      topContributors: [],
      currentContributor: null,
    },
  };
}
