import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadActionRowsForUser,
  loadValidatedActionIdsForUser,
} from "./progression-data";
import {
  computeActionBalanceSummary,
  type ActionBalanceRow,
  type ActionBalanceSummary,
} from "./action-balance-calculation";

export {
  computeActionBalanceSummary,
  getActionBalanceContext,
} from "./action-balance-calculation";
export type {
  ActionBalanceContext,
  ActionBalanceCycleAward,
  ActionBalanceRow,
  ActionBalanceSummary,
} from "./action-balance-calculation";
export { computeGemProgression } from "./gem-progression";

export const computeActionBalanceCounts = computeActionBalanceSummary;

export async function loadActionBalanceSummary(
  supabase: SupabaseClient,
  userId: string,
  options?: {
    actionRows?: ActionBalanceRow[];
    validatedActionIds?: Set<string>;
  },
): Promise<ActionBalanceSummary> {
  const [actionRows, validatedActionIds] = await Promise.all([
    options?.actionRows ?? loadActionRowsForUser(supabase, userId),
    options?.validatedActionIds ?? loadValidatedActionIdsForUser(supabase, userId),
  ]);

  return computeActionBalanceSummary(actionRows, validatedActionIds);
}
