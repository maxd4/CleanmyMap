import { getSupabaseServerClient } from "@/lib/supabase/server";
import { reconcileUserGamification } from "../reconciliation/gamification-reconciliation";
import { reconcileTerritorialLegendSnapshot } from "./reconciliation";

function parisCivilDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export async function runTerritorialLegendDailyReconciliation(params: {
  now?: Date;
  supabase?: ReturnType<typeof getSupabaseServerClient>;
} = {}) {
  const now = params.now ?? new Date();
  const supabase = params.supabase ?? getSupabaseServerClient(true);
  const snapshot = await reconcileTerritorialLegendSnapshot(supabase, now);
  let projectedUsers = 0;
  for (const userId of snapshot.affectedUserIds) {
    await reconcileUserGamification(supabase, userId, {
      reasonCategory: "other",
      reconcileTerritorialLegends: false,
    });
    projectedUsers += 1;
  }
  return {
    effectiveOn: parisCivilDate(now),
    affectedUserIds: snapshot.affectedUserIds,
    projectedUsers,
    insertedProofs: snapshot.insertedProofs,
    extendedPeriods: snapshot.extendedPeriods,
    closedPeriods: snapshot.closedPeriods,
  };
}
