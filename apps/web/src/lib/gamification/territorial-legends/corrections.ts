import type { SupabaseClient } from "@supabase/supabase-js";
import type { TerritorialLegendHistoryInvalidationResult } from "./types";

function requireCivilDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Date civile invalide: ${value}`);
  return value;
}

function nonNegativeInteger(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * Invalidates source-backed territorial history without deleting its audit
 * trail. The database function also cascades a period correction to its award
 * proofs and is the only supported mutation path for historical correction.
 */
export async function invalidateTerritorialLegendHistory(
  supabase: SupabaseClient,
  params: {
    holdPeriodIds?: readonly number[];
    proofIds?: readonly string[];
    invalidatedOn: string;
  },
): Promise<TerritorialLegendHistoryInvalidationResult> {
  const invalidatedOn = requireCivilDate(params.invalidatedOn);
  const holdPeriodIds = (params.holdPeriodIds ?? []).filter(
    (value): value is number => Number.isSafeInteger(value) && value > 0,
  );
  const proofIds = (params.proofIds ?? []).filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  if (holdPeriodIds.length === 0 && proofIds.length === 0) {
    return { invalidatedOn, invalidatedHoldPeriods: 0, invalidatedAwardProofs: 0, affectedUserIds: [] };
  }

  const result = await supabase.rpc("invalidate_territorial_legend_history", {
    p_hold_period_ids: holdPeriodIds,
    p_proof_ids: proofIds,
    p_invalidated_on: invalidatedOn,
  });
  if (result.error) throw new Error(result.error.message);
  const payload = result.data as {
    status?: unknown;
    invalidatedHoldPeriods?: unknown;
    invalidatedAwardProofs?: unknown;
    affectedUserIds?: unknown;
  } | null;
  if (payload?.status !== "applied") throw new Error("La correction historique territoriale a renvoyé une réponse invalide.");
  return {
    invalidatedOn,
    invalidatedHoldPeriods: nonNegativeInteger(payload.invalidatedHoldPeriods),
    invalidatedAwardProofs: nonNegativeInteger(payload.invalidatedAwardProofs),
    affectedUserIds: Array.isArray(payload.affectedUserIds)
      ? payload.affectedUserIds.filter((value): value is string => typeof value === "string" && value.length > 0)
      : [],
  };
}
