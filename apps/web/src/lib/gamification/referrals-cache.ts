import { unstable_cache } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadReferralSummary, type ReferralSummary } from "./referrals";

const REFERRAL_SUMMARY_CACHE_REVALIDATE_SECONDS = 120;

export function buildReferralSummaryCacheKey(userId: string): string {
  return `user:${userId}`;
}

export async function fetchCachedReferralSummary(
  userId: string,
): Promise<ReferralSummary> {
  const cached = unstable_cache(
    async () => {
      const supabase = getSupabaseServerClient(false);
      return loadReferralSummary(supabase, userId);
    },
    ["referral-summary", buildReferralSummaryCacheKey(userId)],
    {
      revalidate: REFERRAL_SUMMARY_CACHE_REVALIDATE_SECONDS,
      tags: [`referral-summary:${userId}`],
    },
  );

  return cached();
}
