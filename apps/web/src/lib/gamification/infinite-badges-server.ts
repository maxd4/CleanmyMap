import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadActionBalanceSummary } from "./action-balance";
import { computeMonthlyRegularitySummary } from "./monthly-regularity";
import {
  loadActionRowsForUser,
  loadValidatedActionIdsForUser,
} from "./progression-data";
import { refreshProgressionProfile, syncUserActionProgression } from "./progression-tracking";
import {
  createFallbackSensitiveZoneApaisementSummary,
  loadSensitiveZoneApaisementSummary,
} from "./sensitive-zone-badge";

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
  newPlaces: number;
  actionsCreated: number;
  actionBalance: Awaited<ReturnType<typeof loadActionBalanceSummary>>;
  monthlyRegularity: Awaited<ReturnType<typeof computeMonthlyRegularitySummary>>;
  sensitiveZoneApaisement: Awaited<
    ReturnType<typeof loadSensitiveZoneApaisementSummary>
  >;
}> {
  const supabase = getSupabaseServerClient(true);

  const actionsCreated = await syncUserActionProgression(supabase, userId).catch(() => 0);
  await refreshProgressionProfile(supabase, userId).catch(() => undefined);
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
    {
      userRows: actionRows,
      validatedActionIds,
    },
  ).catch(() => createFallbackSensitiveZoneApaisementSummary());

  const row = await supabase
    .from("user_badge_totals")
    .select("waste_kg, butts, places_count")
    .eq("user_id", userId)
    .maybeSingle();

  if (row.error) throw row.error;
  if (!row.data) {
    return {
      wasteKg: 0,
      butts: 0,
      newPlaces: 0,
      actionsCreated,
      actionBalance,
      monthlyRegularity,
      sensitiveZoneApaisement,
    };
  }

  return {
    wasteKg: Number(row.data.waste_kg ?? 0),
    butts: Number(row.data.butts ?? 0),
    newPlaces: Number(row.data.places_count ?? 0),
    actionsCreated,
    actionBalance,
    monthlyRegularity,
    sensitiveZoneApaisement,
  };
}
