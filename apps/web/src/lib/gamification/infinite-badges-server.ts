import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadActionBalanceSummary } from "./action-balance";
import { computeMonthlyRegularitySummary } from "./monthly-regularity";
import {
  loadActionRowsForUser,
  loadValidatedActionIdsForUser,
} from "./progression-data";
import {
  createFallbackSensitiveZoneApaisementSummary,
  loadSensitiveZoneApaisementSummary,
} from "./sensitive-zone-badge";
import { loadGamificationUserCounters } from "./counters";
import { loadCleanZoneSourcesForUser } from "./badges/listing";
import {
  buildTerrainProgressions,
  type TerrainProgressionEvent,
} from "./terrain-progressions";
import { buildCurrentMilestones, type MilestoneEvent } from "./milestones";
import { loadPersonalMohsImpactTotals } from "./mohs-impact-reconciliation";

function createFallbackActionBalanceSummary(): Awaited<ReturnType<typeof loadActionBalanceSummary>> {
  return {
    spontaneous: 0,
    association: 0,
    enterprise: 0,
    totalValidated: 0,
    balancedCycles: 0,
    totalXpAwarded: 0,
    currentCycleTarget: 1,
    currentCycleProgress: 0,
    currentCycleXpReward: 1,
    missingCounts: {
      spontaneous: 1,
      association: 1,
      enterprise: 1,
    },
    currentGrade: {
      id: "balance-observateur",
      label: "Observateur",
      threshold: 0,
      iconVariant: "sliders-horizontal",
      visualVariant: "stone",
      tooltip: "Aucun cycle équilibré encore",
      xp: 0,
    },
    nextGrade: null,
    progressPercent: 0,
    currentLabel: "Observateur",
    nextLabel: null,
    awards: [],
  };
}

export async function getInfiniteBadgeTotals(userId: string): Promise<{
  wasteKg: number;
  butts: number;
  wasteRawKg: number;
  wasteEquivalentSecKg: number;
  wasteUnknownConditionCount: number;
  newPlaces: number;
  participationCount: number;
  organisationCount: number;
  cleanZonesCount: number;
  terrainProgressions: ReturnType<typeof buildTerrainProgressions>;
  milestones: ReturnType<typeof buildCurrentMilestones>;
  actionBalance: Awaited<ReturnType<typeof loadActionBalanceSummary>>;
  monthlyRegularity: Awaited<ReturnType<typeof computeMonthlyRegularitySummary>>;
  sensitiveZoneApaisement: Awaited<
    ReturnType<typeof loadSensitiveZoneApaisementSummary>
  >;
}> {
  const supabase = getSupabaseServerClient(true);

  const actionRows = await loadActionRowsForUser(supabase, userId).catch(() => []);
  const validatedActionIds = await loadValidatedActionIdsForUser(supabase, userId, {
    actionRows,
  }).catch(() => new Set<string>());
  const actionBalance = await loadActionBalanceSummary(supabase, userId, {
    actionRows,
    validatedActionIds,
  }).catch(() => createFallbackActionBalanceSummary());
  const monthlyRegularity = computeMonthlyRegularitySummary(actionRows);
  const sensitiveZoneApaisement = await loadSensitiveZoneApaisementSummary(
    supabase,
    userId,
  ).catch(() => createFallbackSensitiveZoneApaisementSummary());
  const [counters, cleanZoneSources, eventsResult] = await Promise.all([
    loadGamificationUserCounters(supabase, userId),
    loadCleanZoneSourcesForUser(supabase, userId),
    supabase
      .from("progression_events")
      .select("event_type, status_phase, source_table, source_id, xp_awarded")
      .eq("user_id", userId)
      .limit(12000),
  ]);

  if (eventsResult.error) {
    throw new Error(eventsResult.error.message);
  }

  const organisationCount = validatedActionIds.size;
  const cleanZonesCount = cleanZoneSources.length;
  const terrainProgressions = buildTerrainProgressions({
    participationCount: counters.participationCount,
    organisationCount,
    explorationCount: counters.visitedPlacesCount,
    cleanZonesCount,
    events: (eventsResult.data ?? []) as TerrainProgressionEvent[],
  });
  const milestones = buildCurrentMilestones({
    completeActionsCount: counters.completeActionsCount,
    events: (eventsResult.data ?? []) as MilestoneEvent[],
  });

  const personalMohs = await loadPersonalMohsImpactTotals(supabase, userId);

  return {
    wasteKg: personalMohs.wasteMohsKg,
    butts: personalMohs.butts,
    wasteRawKg: personalMohs.wasteRawKg,
    wasteEquivalentSecKg: personalMohs.wasteEquivalentSecKg,
    wasteUnknownConditionCount: personalMohs.wasteUnknownConditionCount,
    newPlaces: counters.visitedPlacesCount,
    participationCount: counters.participationCount,
    organisationCount,
    cleanZonesCount,
    terrainProgressions,
    milestones,
    actionBalance,
    monthlyRegularity,
    sensitiveZoneApaisement,
  };
}
