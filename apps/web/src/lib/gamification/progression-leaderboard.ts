import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assessLevelRequirements,
  computePotentialLevel,
  deriveBadges,
  xpRequired,
} from "./progression-formulas";
import { backfillAllProgression, backfillUserProgression } from "./progression-backfill";
import { buildContributorRecognitionIndex } from "./contributor-recognition";
import {
  buildPersonalImpactMethodology,
  computePersonalImpactMetrics,
} from "./progression-impact";
import {
  getCurrentMonthlyMilestone,
  getUserAnnualImpact,
  getYearToDateStartDate,
  loadUserAnnualImpactStats,
} from "./annual-reset";
import {
  actionQualityScoreFromRow,
  fetchActionById,
  loadApprovedActionRows,
  loadActionRowsForUser,
  loadUserImpactStats,
  loadUserLabelSummary,
  loadUserProgressionStats,
  parseAssociationNameFromActionNotes,
} from "./progression-data";
import type {
  ActionRow,
  CollectiveLeaderboardItem,
  IndividualLeaderboardItem,
  LevelRequirementAssessment,
  PersonalDynamicRanking,
  PersonalImpactMethodology,
  PersonalImpactMetrics,
  PersonalTimelineItem,
  PostActionRetentionLoop,
  MonthlyMilestone,
  ContributorRecognitionSummary,
  ContributorRecognitionSnapshot,
} from "./progression-types";
import { toFloat, toInt } from "./progression-utils";

type UserProgressionResponse = {
  userId: string;
  xpTotal: number;
  xpValidated: number;
  xpPending: number;
  currentLevel: number;
  potentialLevel: number;
  nextLevel: {
    level: number;
    xpRequired: number;
    xpRemaining: number;
    frozen: boolean;
    requirements: LevelRequirementAssessment;
  };
  badges: string[];
  impact: PersonalImpactMetrics;
  impactMethodology: PersonalImpactMethodology;
  dynamicRanking: PersonalDynamicRanking;
  history: {
    timeline: PersonalTimelineItem[];
    mapPoints: PersonalTimelineItem[];
  };
  monthlyMilestone: MonthlyMilestone;
  recognition: ContributorRecognitionSnapshot;
  annualRecognition: ContributorRecognitionSnapshot;
  yearToDateImpact: {
    wasteKg: number;
    validatedActions: number;
  };
};

type LeaderboardPeriod = "lifetime" | "yearToDate";

function buildTimelineItems(rows: ActionRow[]): PersonalTimelineItem[] {
  return rows.map((row) => {
    const quality = actionQualityScoreFromRow(row);
    return {
      id: row.id,
      actionDate: row.action_date || row.created_at.slice(0, 10),
      locationLabel: row.location_label,
      status: row.status,
      wasteKg: Math.round(toFloat(row.waste_kg, 0) * 10) / 10,
      cigaretteButts: toInt(row.cigarette_butts, 0),
      volunteersCount: toInt(row.volunteers_count, 1),
      durationMinutes: toInt(row.duration_minutes, 0),
      qualityScore: quality,
      qualityGrade:
        quality >= 80 ? "A" : quality >= 60 ? "B" : "C",
      latitude: row.latitude,
      longitude: row.longitude,
      manualDrawing: row.manual_drawing ?? null,
    };
  });
}

async function buildIndividualLeaderboard(
  supabase: SupabaseClient,
  period: LeaderboardPeriod = "lifetime",
): Promise<IndividualLeaderboardItem[]> {
  const [profilesResult, labelsByUser, impactByUser] = await Promise.all([
    supabase
      .from("progression_profiles")
      .select(
        "user_id, xp_total, xp_validated, xp_pending, current_level, potential_level",
      )
      .limit(1000),
    loadUserLabelSummary(supabase),
    period === "yearToDate"
      ? loadUserAnnualImpactStats(supabase)
      : loadUserImpactStats(supabase),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  const rows =
    (profilesResult.data as Array<{
      user_id: string;
      xp_total: number;
      xp_validated: number;
      xp_pending: number;
      current_level: number;
      potential_level: number;
    }>) ?? [];

  return rows
    .map((row) => {
      const labels = labelsByUser.get(row.user_id) ?? {
        actorName: row.user_id,
        associationName: "Sans association",
      };
      const impact = impactByUser.get(row.user_id) ?? {
        qualityAverage: 0,
        validatedActions: 0,
        wasteKg: 0,
        totalButts: 0,
      };

      const score =
        impact.qualityAverage * 3 +
        Math.min(300, impact.wasteKg) * 0.2 +
        impact.validatedActions * 0.5;

      return {
        rank: 0,
        userId: row.user_id,
        actorName: labels.actorName,
        associationName: labels.associationName,
        score: Math.round(score * 10) / 10,
        xpValidated: toFloat(row.xp_validated, 0),
        xpTotal: toFloat(row.xp_total, 0),
        currentLevel: toInt(row.current_level, 1),
        potentialLevel: toInt(row.potential_level, 1),
        qualityAverage: impact.qualityAverage,
        validatedActions: impact.validatedActions,
        wasteKg: impact.wasteKg,
        badges: deriveBadges({
          currentLevel: toInt(row.current_level, 1),
          qualityAverage: impact.qualityAverage,
          validationRatio:
            impact.validatedActions > 0
              ? Math.min(
                  1,
                  toFloat(row.xp_validated, 0) / Math.max(1, toFloat(row.xp_total, 0)),
                )
              : 0,
          collectiveEvents: 0,
          totalKg: impact.wasteKg,
          totalButts: impact.totalButts,
        }),
      } as IndividualLeaderboardItem;
    })
    .sort((a, b) => {
      if (period === "yearToDate") {
        return (
          b.score - a.score ||
          b.validatedActions - a.validatedActions ||
          b.qualityAverage - a.qualityAverage ||
          b.currentLevel - a.currentLevel
        );
      }

      return (
        b.currentLevel - a.currentLevel ||
        b.xpValidated - a.xpValidated ||
        b.score - a.score
      );
    })
    .slice(0, 60)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
}

export async function getUserProgression(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProgressionResponse> {
  await backfillUserProgression(supabase, userId);

  const yearToDateStartDate = getYearToDateStartDate();
  const [profileResult, stats, rows, annualRows, individualItems, annualImpact] = await Promise.all([
    supabase
      .from("progression_profiles")
      .select(
        "user_id, xp_total, xp_validated, xp_pending, current_level, potential_level",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    loadUserProgressionStats(supabase, userId),
    loadActionRowsForUser(supabase, userId),
    loadApprovedActionRows(supabase, 10000, yearToDateStartDate),
    buildIndividualLeaderboard(supabase),
    getUserAnnualImpact(supabase, userId),
  ]);

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  const profile =
    (profileResult.data as {
      user_id: string;
      xp_total: number;
      xp_validated: number;
      xp_pending: number;
      current_level: number;
      potential_level: number;
    } | null) ?? {
      user_id: userId,
      xp_total: 0,
      xp_validated: 0,
      xp_pending: 0,
      current_level: 1,
      potential_level: 1,
    };

  const nextLevel = profile.current_level + 1;
  const nextRequiredXp = xpRequired(nextLevel);
  const requirement = assessLevelRequirements(nextLevel, stats);
  const timeline = buildTimelineItems(rows).slice(0, 30);
  const rankItem = individualItems.find((item) => item.userId === userId) ?? null;
  const recognitionIndex = buildContributorRecognitionIndex(rows, userId);
  const annualRecognitionIndex = buildContributorRecognitionIndex(annualRows, userId);

  return {
    userId: profile.user_id,
    xpTotal: toFloat(profile.xp_total, 0),
    xpValidated: toFloat(profile.xp_validated, 0),
    xpPending: toFloat(profile.xp_pending, 0),
    currentLevel: toInt(profile.current_level, 1),
    potentialLevel: toInt(profile.potential_level, 1),
    nextLevel: {
      level: nextLevel,
      xpRequired: nextRequiredXp,
      xpRemaining: Math.max(0, nextRequiredXp - toFloat(profile.xp_validated, 0)),
      frozen: toInt(profile.potential_level, 1) > toInt(profile.current_level, 1),
      requirements: requirement,
    },
    badges: deriveBadges({
      currentLevel: toInt(profile.current_level, 1),
      qualityAverage: stats.qualityAverage,
      validationRatio: stats.validationRatio,
      collectiveEvents: stats.collectiveEvents,
      totalKg: stats.totalKg,
      totalButts: stats.totalButts,
    }),
    impact: computePersonalImpactMetrics(rows),
    impactMethodology: buildPersonalImpactMethodology(stats.qualityAverage),
    dynamicRanking: {
      rank: rankItem?.rank ?? null,
      total: individualItems.length,
      percentile:
        rankItem && individualItems.length > 0
          ? Math.round((1 - (rankItem.rank - 1) / individualItems.length) * 100)
          : null,
      score: rankItem?.score ?? null,
    },
    history: {
      timeline,
      mapPoints: timeline.filter(
        (item) =>
          (item.latitude !== null && item.longitude !== null) ||
          item.manualDrawing !== null,
      ),
    },
    monthlyMilestone: getCurrentMonthlyMilestone(annualImpact.wasteKg),
    recognition: {
      currentContributor: recognitionIndex.currentContributor,
    },
    annualRecognition: {
      currentContributor: annualRecognitionIndex.currentContributor,
    },
    yearToDateImpact: annualImpact,
  };
}

export async function buildPostActionRetentionLoop(
  supabase: SupabaseClient,
  params: { userId: string; actionId: string },
): Promise<PostActionRetentionLoop | null> {
  const action = await fetchActionById(supabase, params.actionId);
  if (!action) {
    return null;
  }

  const progression = await getUserProgression(supabase, params.userId);
  const qualityScore = actionQualityScoreFromRow(action);
  const qualityLabel = qualityScore >= 80 ? "A" : qualityScore >= 60 ? "B" : "C";
  const latestBadge = progression.badges[0] ?? "Contributeur actif";
  const associationName = parseAssociationNameFromActionNotes(action.notes);
  const thanksMessage =
    associationName !== "Sans association"
      ? `${associationName} remercie ${action.actor_name?.trim() || "Contributeur"} pour cette contribution vérifiée à ${action.location_label}.`
      : `${action.actor_name?.trim() || "Contributeur"} renforce l'action locale à ${action.location_label}.`;

  const summary = [
    `${Math.round(toFloat(action.waste_kg, 0) * 10) / 10} kg collectes`,
    `${toInt(action.cigarette_butts, 0)} megots retires`,
    `qualite ${qualityLabel} (${qualityScore}/100)`,
  ].join(" - ");

  const shareText =
    `J'ai contribue a une action locale avec CleanMyMap: ${summary}.` +
    ` Mon niveau actuel est ${progression.currentLevel}.`;

  const nextActionSuggestion =
    progression.nextLevel.requirements.current.collectiveEvents <
    progression.nextLevel.requirements.thresholds.minCollectiveEvents
      ? "Participe a une action collective cette semaine pour renforcer ton impact local."
      : qualityScore < 80
        ? "Ajoute geolocalisation precise et details terrain a la prochaine action pour augmenter la qualite."
        : "Utilise l'itineraire IA pour planifier une intervention sur une zone sous-couverte.";

  return {
    summary,
    badge: latestBadge,
    thanksMessage,
    share: {
      text: shareText,
      url: "/sections/gamification",
    },
    nextActionSuggestion,
  };
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
  await backfillAllProgression(supabase);
  const yearToDateStartDate = getYearToDateStartDate();
  const approvedActionRows = await loadApprovedActionRows(supabase);
  const yearToDateApprovedActionRows = await loadApprovedActionRows(
    supabase,
    10000,
    yearToDateStartDate,
  );
  const recognitionRows =
    period === "yearToDate" ? yearToDateApprovedActionRows : approvedActionRows;
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

  const actionsResult = {
    data: approvedActionRows,
    error: null,
  };

  const grouped = new Map<
    string,
    {
      qualitySum: number;
      validatedActions: number;
      wasteKg: number;
      members: Set<string>;
    }
  >();

  for (const row of (actionsResult.data ?? []) as ActionRow[]) {
    const associationName = parseAssociationNameFromActionNotes(row.notes);
    const quality = actionQualityScoreFromRow(row);
    const current = grouped.get(associationName) ?? {
      qualitySum: 0,
      validatedActions: 0,
      wasteKg: 0,
      members: new Set<string>(),
    };

    current.qualitySum += quality;
    current.validatedActions += 1;
    current.wasteKg += toFloat(row.waste_kg, 0);
    current.members.add(row.created_by_clerk_id);
    grouped.set(associationName, current);
  }

  const items = [...grouped.entries()]
    .map(([associationName, value]) => {
      const qualityAverage =
        value.validatedActions > 0
          ? Math.round((value.qualitySum / value.validatedActions) * 10) / 10
          : 0;
      const score =
        qualityAverage * 0.6 +
        Math.min(500, value.wasteKg) * 0.25 +
        value.validatedActions * 0.15;
      const structureXp = Math.round(score * 10);
      const structureLevel = computePotentialLevel(structureXp);

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
      } as CollectiveLeaderboardItem;
    })
    .sort(
      (a, b) =>
        b.currentLevel - a.currentLevel ||
        b.score - a.score ||
        b.validatedActions - a.validatedActions,
    )
    .slice(0, 60)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  return {
    scope,
    generatedAt: new Date().toISOString(),
    items,
    recognition: {
      topContributors: recognitionIndex.topContributors,
      currentContributor: null,
    },
  };
}
