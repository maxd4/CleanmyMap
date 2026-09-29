import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assessLevelRequirements,
  computeCurrentLevel,
  computePotentialLevel,
  deriveBadges,
  xpRequired,
} from "./progression-formulas";
import { buildContributorRecognitionIndex } from "./contributor-recognition";
import {
  getCurrentMonthlyMilestone,
  getUserAnnualImpact,
  getYearToDateStartDate,
} from "./annual-reset";
import {
  actionQualityScoreFromRow,
  loadApprovedActionRows,
  loadActionRowsForUser,
  loadUserProgressionStats,
} from "./progression-data";
import {
  buildPersonalImpactMethodology,
  computePersonalImpactMetrics,
} from "./progression-impact";
import type {
  ActionRow,
  PersonalTimelineItem,
  UserProgressionResponse,
} from "./progression-types";
import { BADGE_DEFINITIONS } from "./badge-catalog";
import { actionRowToDrawing, toInt, toNullableFloat } from "./progression-utils";
import { resolveEngagementStatus } from "./engagement-status";
import {
  loadGamificationCatalog,
  loadGamificationRulesMigrationState,
} from "./gamification-catalog-loader";
import { loadGamificationLedgerEvents } from "./gamification-summary-loader";
import { buildGamificationSummary } from "./gamification-summary";
import { CURRENT_GAMIFICATION_RULES_REVISION } from "./progression-types";
import { buildIndividualLeaderboard } from "./progression-ranking";

type ProgressionEvents = Awaited<ReturnType<typeof loadGamificationLedgerEvents>>;
type ProgressionStats = Awaited<ReturnType<typeof loadUserProgressionStats>>;
type ProgressionCatalog = Awaited<ReturnType<typeof loadGamificationCatalog>>;
type RulesMigrationState = Awaited<ReturnType<typeof loadGamificationRulesMigrationState>>;

type UserProgressionInputs = {
  stats: ProgressionStats;
  rows: ActionRow[];
  annualRows: ActionRow[];
  individualItems: Awaited<ReturnType<typeof buildIndividualLeaderboard>>;
  annualImpact: Awaited<ReturnType<typeof getUserAnnualImpact>>;
  catalog: ProgressionCatalog;
  progressionEvents: ProgressionEvents;
  rulesMigrationState: RulesMigrationState;
};

type LevelState = {
  xpTotal: number;
  xpValidated: number;
  xpPending: number;
  currentLevel: number;
  potentialLevel: number;
  nextLevel: UserProgressionResponse["nextLevel"];
  badges: UserProgressionResponse["badges"];
};

function buildTimelineItems(rows: ActionRow[]): PersonalTimelineItem[] {
  return rows.map((row) => {
    const quality = actionQualityScoreFromRow(row);
    return {
      id: row.id,
      actionDate: row.action_date || row.created_at.slice(0, 10),
      locationLabel: row.location_label,
      status: row.status,
      wasteKg:
        toNullableFloat(row.waste_kg) === null
          ? null
          : Math.round(toNullableFloat(row.waste_kg)! * 10) / 10,
      cigaretteButts: toInt(row.cigarette_butts, 0),
      volunteersCount: toInt(row.volunteers_count, 1),
      durationMinutes: toInt(row.duration_minutes, 0),
      qualityScore: quality,
      qualityGrade: quality >= 80 ? "A" : quality >= 60 ? "B" : "C",
      latitude: row.latitude,
      longitude: row.longitude,
      manualDrawing: actionRowToDrawing(row),
    };
  });
}

async function loadUserProgressionInputs(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProgressionInputs> {
  const yearToDateStartDate = getYearToDateStartDate();
  const progressionEventsPromise = loadGamificationLedgerEvents(supabase, userId);
  const rulesMigrationStatePromise = loadGamificationRulesMigrationState(supabase, userId);
  const [stats, rows, annualRows, individualItems, annualImpact, catalog, progressionEvents, rulesMigrationState] = await Promise.all([
    loadUserProgressionStats(supabase, userId, { events: progressionEventsPromise }),
    loadActionRowsForUser(supabase, userId),
    loadApprovedActionRows(supabase, 10000, yearToDateStartDate),
    buildIndividualLeaderboard(supabase),
    getUserAnnualImpact(supabase, userId),
    loadGamificationCatalog(supabase, userId, {
      progressionEvents: progressionEventsPromise,
      rulesMigrationState: rulesMigrationStatePromise,
    }),
    progressionEventsPromise,
    rulesMigrationStatePromise,
  ]);

  return {
    stats,
    rows,
    annualRows,
    individualItems,
    annualImpact,
    catalog,
    progressionEvents,
    rulesMigrationState,
  };
}

function buildLevelState(events: ProgressionEvents, stats: ProgressionStats): LevelState {
  const xpTotal = events.reduce((total, event) => total + event.xp_awarded, 0);
  const xpValidated = events
    .filter((event) => event.status_phase === "validated")
    .reduce((total, event) => total + event.xp_awarded, 0);
  const xpPending = events
    .filter((event) => event.status_phase === "pending")
    .reduce((total, event) => total + event.xp_awarded, 0);
  const currentLevel = computeCurrentLevel(xpValidated, stats);
  const potentialLevel = computePotentialLevel(xpValidated);
  const level = currentLevel + 1;
  const required = xpRequired(level);
  const requirements = assessLevelRequirements(level, stats, xpValidated);

  return {
    xpTotal,
    xpValidated,
    xpPending,
    currentLevel,
    potentialLevel,
    nextLevel: {
      level,
      xpRequired: required,
      xpRemaining: Math.max(0, required - xpValidated),
      frozen: potentialLevel > currentLevel,
      requirements,
    },
    badges: deriveBadges({
      currentLevel,
      qualityAverage: stats.qualityAverage,
      validationRatio: stats.validationRatio,
      collectiveEvents: stats.collectiveEvents,
      totalKg: stats.totalKg,
      totalButts: stats.totalButts,
      wasteCoverageRate: stats.wasteCoverageRate,
    }),
  };
}

function buildProgressionSummary(
  inputs: UserProgressionInputs,
  level: LevelState,
): UserProgressionResponse["summary"] {
  return buildGamificationSummary({
    catalog: inputs.catalog,
    events: inputs.progressionEvents,
    currentLevel: level.currentLevel,
    potentialLevel: level.potentialLevel,
    nextLevel: level.nextLevel,
    rulesMigration: {
      currentAppliedRulesRevision:
        inputs.rulesMigrationState.currentAppliedRulesRevision ?? CURRENT_GAMIFICATION_RULES_REVISION,
      lastAcknowledgedRulesRevision: inputs.rulesMigrationState.lastAcknowledgedRulesRevision ?? 0,
    },
  });
}

function buildDynamicRanking(
  items: UserProgressionInputs["individualItems"],
  userId: string,
): UserProgressionResponse["dynamicRanking"] {
  const rankItem = items.find((item) => item.userId === userId) ?? null;
  return {
    rank: rankItem?.rank ?? null,
    total: items.length,
    percentile:
      rankItem && items.length > 0
        ? Math.round((1 - (rankItem.rank - 1) / items.length) * 100)
        : null,
    score: rankItem?.score ?? null,
  };
}

function buildHistory(rows: ActionRow[]): UserProgressionResponse["history"] {
  const timeline = buildTimelineItems(rows).slice(0, 30);
  return {
    timeline,
    mapPoints: timeline.filter(
      (item) =>
        (item.latitude !== null && item.longitude !== null) || item.manualDrawing !== null,
    ),
  };
}

function buildRecognition(
  rows: ActionRow[],
  annualRows: ActionRow[],
  userId: string,
): Pick<UserProgressionResponse, "recognition" | "annualRecognition"> {
  return {
    recognition: {
      currentContributor: buildContributorRecognitionIndex(rows, userId).currentContributor,
    },
    annualRecognition: {
      currentContributor: buildContributorRecognitionIndex(annualRows, userId).currentContributor,
    },
  };
}

function buildUserProgressionResponse(
  userId: string,
  inputs: UserProgressionInputs,
): UserProgressionResponse {
  const level = buildLevelState(inputs.progressionEvents, inputs.stats);
  const recognition = buildRecognition(inputs.rows, inputs.annualRows, userId);
  return {
    userId,
    ...level,
    badgeCatalog: BADGE_DEFINITIONS,
    summary: buildProgressionSummary(inputs, level),
    engagementStatus: resolveEngagementStatus(level.currentLevel),
    impact: computePersonalImpactMetrics(inputs.rows),
    impactMethodology: buildPersonalImpactMethodology(inputs.stats.qualityAverage),
    dynamicRanking: buildDynamicRanking(inputs.individualItems, userId),
    history: buildHistory(inputs.rows),
    monthlyMilestone: getCurrentMonthlyMilestone(
      inputs.annualImpact.wasteKg,
      inputs.annualImpact.wasteCoverageRate,
    ),
    ...recognition,
    yearToDateImpact: inputs.annualImpact,
  };
}

export async function getUserProgression(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProgressionResponse> {
  const inputs = await loadUserProgressionInputs(supabase, userId);
  return buildUserProgressionResponse(userId, inputs);
}
