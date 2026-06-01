import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadActionBalanceSummary } from "./action-balance";
import { refreshProgressionProfile, syncUserActionProgression } from "./progression-tracking";

function createFallbackActionBalanceSummary(): Awaited<ReturnType<typeof loadActionBalanceSummary>> {
  return {
    spontaneous: 0,
    association: 0,
    enterprise: 0,
    totalValidated: 0,
    balancedCycles: 0,
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
  };
}

export async function getInfiniteBadgeTotals(userId: string): Promise<{
  wasteKg: number;
  butts: number;
  newPlaces: number;
  actionsCreated: number;
  actionBalance: Awaited<ReturnType<typeof loadActionBalanceSummary>>;
}> {
  const supabase = getSupabaseServerClient(true);

  const actionsCreated = await syncUserActionProgression(supabase, userId).catch(() => 0);
  await refreshProgressionProfile(supabase, userId).catch(() => undefined);
  const actionBalance = await loadActionBalanceSummary(supabase, userId).catch(
    () => createFallbackActionBalanceSummary(),
  );

  const row = await supabase
    .from("user_badge_totals")
    .select("waste_kg, butts, places_count")
    .eq("user_id", userId)
    .maybeSingle();

  if (row.error) throw row.error;
  if (!row.data) {
    return { wasteKg: 0, butts: 0, newPlaces: 0, actionsCreated, actionBalance };
  }

  return {
    wasteKg: Number(row.data.waste_kg ?? 0),
    butts: Number(row.data.butts ?? 0),
    newPlaces: Number(row.data.places_count ?? 0),
    actionsCreated,
    actionBalance,
  };
}
