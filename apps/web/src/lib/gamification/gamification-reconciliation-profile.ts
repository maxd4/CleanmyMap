import type { SupabaseClient } from "@supabase/supabase-js";
import type { GamificationReconciliationProfile } from "./gamification-reconciliation-plan";

export async function loadReconciliationProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<GamificationReconciliationProfile | null> {
  const result = await supabase
    .from("progression_profiles")
    .select("current_level, current_applied_rules_revision, last_acknowledged_rules_revision, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data as GamificationReconciliationProfile | null;
}
