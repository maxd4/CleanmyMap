import type { SupabaseClient } from "@supabase/supabase-js";
import { computePotentialLevel, deriveBadges } from "./progression-formulas";
import { buildContributorRecognitionIndex } from "./contributor-recognition";
import { getYearToDateStartDate, loadUserAnnualImpactStats } from "./annual-reset";
import {
  actionQualityScoreFromRow,
  loadApprovedActionRows,
  parseAssociationNameFromActionNotes,
} from "./progression-data";
import { loadUserImpactStats, loadUserLabelSummary } from "./progression-ranking-data";
import type {
  ActionRow,
  CollectiveLeaderboardItem,
  ContributorRecognitionSummary,
  IndividualLeaderboardItem,
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

type LeaderboardLabel = {
  actorName: string;
  associationName: string;
};

type LeaderboardImpact = {
  qualityAverage: number;
  validatedActions: number;
  wasteKg: number;
  wasteCoverageRate: number;
  totalButts: number;
};

type IndividualProfileRow = {
  user_id: string;
  xp_total: number;
  xp_validated: number;
  xp_pending: number;
  current_level: number;
  potential_level: number;
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
  const structureLevel = computePotentialLevel(Math.round(score * 10));

  return {
    rank: 0,
    associationName,
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

function buildIndividualLeaderboardItem(
  row: IndividualProfileRow,
  labelsByUser: Map<string, LeaderboardLabel>,
  impactByUser: Map<string, LeaderboardImpact>,
): IndividualLeaderboardItem {
  const labels = labelsByUser.get(row.user_id) ?? {
    actorName: row.user_id,
    associationName: "Sans association",
  };
  const impact = impactByUser.get(row.user_id) ?? {
    qualityAverage: 0,
    validatedActions: 0,
    wasteKg: 0,
    wasteCoverageRate: 0,
    totalButts: 0,
  };
  const currentLevel = toInt(row.current_level, 1);
  const xpValidated = toFloat(row.xp_validated, 0);
  const xpTotal = toFloat(row.xp_total, 0);
  const score =
    impact.qualityAverage * 3 +
    (impact.wasteCoverageRate === 100 ? Math.min(300, impact.wasteKg) * 0.2 : 0) +
    impact.validatedActions * 0.5;

  return {
    rank: 0,
    userId: row.user_id,
    actorName: labels.actorName,
    associationName: labels.associationName,
    score: Math.round(score * 10) / 10,
    xpValidated,
    xpTotal,
    currentLevel,
    potentialLevel: toInt(row.potential_level, 1),
    qualityAverage: impact.qualityAverage,
    validatedActions: impact.validatedActions,
    wasteKg: impact.wasteKg,
    wasteCoverageRate: impact.wasteCoverageRate,
    badges: deriveBadges({
      currentLevel,
      qualityAverage: impact.qualityAverage,
      validationRatio:
        impact.validatedActions > 0
          ? Math.min(1, xpValidated / Math.max(1, xpTotal))
          : 0,
      collectiveEvents: 0,
      totalKg: impact.wasteKg,
      totalButts: impact.totalButts,
      wasteCoverageRate: impact.wasteCoverageRate,
    }),
  } as IndividualLeaderboardItem;
}

function compareIndividualLeaderboardItems(
  a: IndividualLeaderboardItem,
  b: IndividualLeaderboardItem,
  period: LeaderboardPeriod,
): number {
  if (period === "yearToDate") {
    return (
      b.score - a.score ||
      b.validatedActions - a.validatedActions ||
      b.qualityAverage - a.qualityAverage ||
      b.currentLevel - a.currentLevel
    );
  }

  return b.currentLevel - a.currentLevel || b.xpValidated - a.xpValidated || b.score - a.score;
}

function rankIndividualLeaderboardItems(
  items: IndividualLeaderboardItem[],
  period: LeaderboardPeriod,
): IndividualLeaderboardItem[] {
  return items
    .sort((a, b) => compareIndividualLeaderboardItems(a, b, period))
    .slice(0, 60)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export async function buildIndividualLeaderboard(
  supabase: SupabaseClient,
  period: LeaderboardPeriod = "lifetime",
): Promise<IndividualLeaderboardItem[]> {
  const [profilesResult, labelsByUser, impactByUser] = await Promise.all([
    supabase
      .from("progression_profiles")
      .select("user_id, xp_total, xp_validated, xp_pending, current_level, potential_level")
      .limit(1000),
    loadUserLabelSummary(supabase),
    period === "yearToDate" ? loadUserAnnualImpactStats(supabase) : loadUserImpactStats(supabase),
  ]);
  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  const rows = (profilesResult.data as IndividualProfileRow[] | null) ?? [];
  const items = rows.map((row) =>
    buildIndividualLeaderboardItem(
      row,
      labelsByUser as Map<string, LeaderboardLabel>,
      impactByUser as Map<string, LeaderboardImpact>,
    ),
  );
  return rankIndividualLeaderboardItems(items, period);
}

export async function getGamificationLeaderboard(
  supabase: SupabaseClient,
  scope: "individual" | "collective",
  period: LeaderboardPeriod = "lifetime",
): Promise<{
  scope: "individual" | "collective";
  generatedAt: string;
  items: IndividualLeaderboardItem[] | CollectiveLeaderboardItem[];
  recognition: ContributorRecognitionSummary;
}> {
  const yearToDateStartDate = getYearToDateStartDate();
  const approvedActionRows = await loadApprovedActionRows(supabase);
  const yearToDateApprovedActionRows = await loadApprovedActionRows(
    supabase,
    10000,
    yearToDateStartDate,
  );
  const recognitionRows = period === "yearToDate" ? yearToDateApprovedActionRows : approvedActionRows;
  const recognitionIndex = buildContributorRecognitionIndex(recognitionRows);

  if (scope === "individual") {
    return {
      scope,
      generatedAt: new Date().toISOString(),
      items: await buildIndividualLeaderboard(supabase, period),
      recognition: {
        topContributors: recognitionIndex.topContributors,
        currentContributor: null,
      },
    };
  }

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
