import {
  buildVerifiedContributionSummary,
  type VerifiedContributionEvent,
} from "./progression-contributions";
import type { GamificationUserCounters } from "./counters";
import type { ActionRow, UserProgressionStats } from "./progression-types";
import { eventFamilyMap, evaluateActionQualityScore, toFloat, toInt } from "./progression-utils";

type ProgressionStatsEvent = Pick<
  VerifiedContributionEvent,
  "event_type" | "status_phase" | "source_table" | "source_id" | "xp_awarded"
>;

type ActionMetrics = Pick<
  UserProgressionStats,
  "approvedActions" | "validatedActions" | "qualityAverage" | "totalKg" |
    "wasteKnownActions" | "wasteCoverageRate" | "totalButts"
>;

function projectActionMetrics(
  rows: readonly ActionRow[],
  validatedActionIds: ReadonlySet<string>,
): ActionMetrics {
  let approvedActions = 0;
  let validatedActions = 0;
  let qualitySum = 0;
  let totalKg = 0;
  let wasteKnownActions = 0;
  let totalButts = 0;

  for (const row of rows) {
    if (row.status === "approved") approvedActions += 1;
    if (row.status !== "approved" || !validatedActionIds.has(row.id)) continue;
    validatedActions += 1;
    qualitySum += evaluateActionQualityScore(row).score;
    if (row.waste_kg !== null && Number.isFinite(Number(row.waste_kg)) && Number(row.waste_kg) >= 0) {
      totalKg += toFloat(row.waste_kg, 0);
      wasteKnownActions += 1;
    }
    totalButts += toInt(row.cigarette_butts, 0);
  }

  return {
    approvedActions,
    validatedActions,
    qualityAverage: validatedActions > 0 ? Math.round((qualitySum / validatedActions) * 10) / 10 : 0,
    totalKg,
    wasteKnownActions,
    wasteCoverageRate: validatedActions > 0 ? (wasteKnownActions / validatedActions) * 100 : 0,
    totalButts,
  };
}

function projectEventMetrics(
  events: readonly ProgressionStatsEvent[],
  verifiedFamilies: readonly string[],
  participationCount: number,
): { diversityTypes: number; collectiveEvents: number } {
  const diversitySet = new Set<string>(verifiedFamilies);
  let collectiveEvents = participationCount;
  const families = eventFamilyMap();

  for (const event of events) {
    if (toFloat(event.xp_awarded, 0) > 0) {
      const family = families[event.event_type];
      if (family) diversitySet.add(family);
    }
    if (event.event_type === "collective_attendance_confirmed" && event.status_phase === "validated") {
      collectiveEvents += 1;
    }
  }

  return { diversityTypes: diversitySet.size, collectiveEvents };
}

export function projectUserProgressionStats(params: {
  actionRows: readonly ActionRow[];
  events: readonly ProgressionStatsEvent[];
  counters: GamificationUserCounters;
  validatedActionIds: ReadonlySet<string>;
  confirmedParticipantActionIds: ReadonlySet<string>;
}): UserProgressionStats {
  const verifiedContributionSummary = buildVerifiedContributionSummary({
    validatedOrganizationActionIds: params.validatedActionIds,
    confirmedParticipantActionIds: params.confirmedParticipantActionIds,
    events: params.events,
  });
  const actionMetrics = projectActionMetrics(params.actionRows, params.validatedActionIds);
  const eventMetrics = projectEventMetrics(
    params.events,
    verifiedContributionSummary.families,
    params.counters.participationCount,
  );

  return {
    totalActions: params.actionRows.length,
    ...actionMetrics,
    verifiedContributions: verifiedContributionSummary.count,
    verifiedContributionFamilies: verifiedContributionSummary.families,
    validationRatio: params.actionRows.length > 0
      ? actionMetrics.validatedActions / params.actionRows.length
      : 0,
    ...eventMetrics,
  };
}
