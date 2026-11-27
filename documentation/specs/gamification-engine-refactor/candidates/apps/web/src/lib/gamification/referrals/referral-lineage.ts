import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import { buildReferralLineageView, type ReferralLineageView, type ReferralLineageProfileRow } from "./referral-lineage-model";
export { buildReferralLineageView, buildReferralLineageLeaderboard, formatReferralLevel } from "./referral-lineage-model";
export type { ReferralLineageProfileRow, ReferralLineageNode, ReferralLineageView, ReferralLineageLeaderboardEntry } from "./referral-lineage-model";

export async function loadReferralLineageView(
  supabase: SupabaseClient,
  focusProfileId: string,
): Promise<ReferralLineageView | null> {
  const rpcResult = await supabase.rpc("load_referral_lineage_profiles", {
    focus_profile_id: focusProfileId,
  });

  if (rpcResult.error) {
    throw new Error(rpcResult.error.message);
  }

  if (!Array.isArray(rpcResult.data) || rpcResult.data.length === 0) {
    return null;
  }

  return buildReferralLineageView(
    focusProfileId,
    rpcResult.data as ReferralLineageProfileRow[],
  );
}

export async function loadCachedReferralLineageView(
  focusProfileId: string,
): Promise<ReferralLineageView | null> {
  const supabase = getSupabaseServerClient(true);
  return loadReferralLineageView(supabase, focusProfileId);
}
