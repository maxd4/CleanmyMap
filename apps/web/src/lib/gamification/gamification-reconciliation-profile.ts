import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildGamificationReconciliationReceipt,
  type GamificationReconciliationReasonCategory,
} from "./gamification-reconciliation-receipt";
import type { GamificationRulesV1 } from "./gamification-rules";
import {
  type GamificationReconciliationPlan,
  type GamificationReconciliationProfile,
} from "./gamification-reconciliation-plan";

export async function loadReconciliationProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<GamificationReconciliationProfile | null> {
  const result = await supabase
    .from("progression_profiles")
    .select("current_level, current_applied_rules_revision, last_acknowledged_rules_revision")
    .eq("user_id", userId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data as GamificationReconciliationProfile | null;
}

export function reconciliationIdForPlan(
  plan: GamificationReconciliationPlan,
  rules: GamificationRulesV1,
  reasonCategory: GamificationReconciliationReasonCategory | undefined,
): string {
  return buildGamificationReconciliationReceipt(plan, { reasonCategory, rules }).reconciliationId;
}

export async function resolveGamificationReceiptPlan(
  supabase: SupabaseClient,
  userId: string,
  plan: GamificationReconciliationPlan,
  profileBefore: GamificationReconciliationProfile | null,
  refreshProfile: boolean,
  reconciliationId: string,
): Promise<GamificationReconciliationPlan> {
  if (refreshProfile) {
    const { refreshProgressionProfile } = await import("./progression-tracking");
    await refreshProgressionProfile(supabase, userId, {
      reconcileLegacyImpact: false,
      reconciliationId,
    });
  }
  const profileAfter = refreshProfile
    ? await loadReconciliationProfile(supabase, userId)
    : profileBefore;
  return profileAfter && profileAfter.current_level !== plan.levelAfter
    ? { ...plan, levelAfter: profileAfter.current_level }
    : plan;
}
