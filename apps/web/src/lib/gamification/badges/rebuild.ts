import type { SupabaseClient } from "@supabase/supabase-js";
import { reconcileUserGamification } from "../gamification-reconciliation";

/**
 * Compatibility entry point for mutation flows that historically requested a
 * badge rebuild. The implementation is now the single CURRENT reconstruction
 * engine; it never touches LEGACY events or business facts.
 */
export async function rebuildUserGamificationBadges(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ inserted: number; updated: number; removed: number }> {
  const result = await reconcileUserGamification(supabase, userId);
  return {
    inserted: result.inserted,
    updated: result.updated,
    removed: result.removed,
  };
}
