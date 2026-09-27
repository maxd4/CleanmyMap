import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadReferralSummary, type ReferralSummary } from "./referrals";

export async function fetchCachedReferralSummary(
  userId: string,
): Promise<ReferralSummary> {
  const supabase = getSupabaseServerClient(false);
  return loadReferralSummary(supabase, userId);
}
