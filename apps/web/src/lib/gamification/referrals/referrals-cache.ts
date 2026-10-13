import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadReferralSummary, type ReferralSummary } from "./referrals";

export async function fetchCachedReferralSummary(
  userId: string,
): Promise<ReferralSummary> {
  // Referral fields are private; this helper is called only by authenticated
  // server routes/pages after Clerk authorization.
  const supabase = getSupabaseServerClient(true);
  return loadReferralSummary(supabase, userId);
}
