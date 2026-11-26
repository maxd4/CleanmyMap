import { fetchCachedReferralSummary } from "@/lib/gamification/referrals/referrals-cache";
import { loadCachedReferralLineageView } from "@/lib/gamification/referrals/referral-lineage";
import { getInfiniteBadgeTotals } from "@/lib/gamification/progression/infinite-badges-server";
import { getUserProgression } from "@/lib/gamification/progression";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiCollectionForUser } from "@/lib/spogomi/recognition-service";
import { loadSpogomiVolunteerSummaryForUser } from "@/lib/spogomi/volunteer";

export async function loadProfileProgression(userId: string) {
  return Promise.resolve().then(() => getUserProgression(getSupabaseServerClient(true), userId)).catch(() => null);
}

export async function loadProfileBadges(userId: string) {
  const [infiniteTotals, spogomiCollection, spogomiVolunteerSummary] = await Promise.all([
    getInfiniteBadgeTotals(userId).catch(() => null),
    Promise.resolve().then(() => loadSpogomiCollectionForUser(getSupabaseServerClient(true), userId)).catch(() => null),
    Promise.resolve().then(() => loadSpogomiVolunteerSummaryForUser(getSupabaseServerClient(true), userId)).catch(() => null),
  ]);
  return { infiniteTotals, spogomiCollection, spogomiVolunteerSummary };
}

export async function loadProfileReferrals(userId: string) {
  const [referralSummary, lineage] = await Promise.all([
    fetchCachedReferralSummary(userId).catch(() => null),
    loadCachedReferralLineageView(userId).then(view => ({ view, error: null })).catch(() => ({ view: null, error: "Impossible de charger l'arborescence de parrainage." })),
  ]);
  return { referralSummary, referralLineageView: lineage.view, referralLineageError: lineage.error };
}
