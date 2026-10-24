import { computeMonthlyRegularitySummary } from "@/lib/gamification/monthly-regularity";
import { createFallbackSensitiveZoneApaisementSummary } from "@/lib/gamification/sensitive-zone-badge";
import { fetchCachedReferralSummary } from "@/lib/gamification/referrals/referrals-cache";
import { loadCachedReferralLineageView } from "@/lib/gamification/referrals/referral-lineage";
import {
  createFallbackActionBalanceSummary,
  getInfiniteBadgeTotals,
} from "@/lib/gamification/infinite-badges-server";
import { buildCurrentMilestones } from "@/lib/gamification/milestones";
import { buildTerrainProgressions } from "@/lib/gamification/terrain-progressions";
import { getUserProgression } from "@/lib/gamification/progression";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiCollectionForUser } from "@/lib/spogomi/recognition-service";
import { loadSpogomiVolunteerSummaryForUser } from "@/lib/spogomi/volunteer";

export type ProfilePageData = {
  gamification: Awaited<ReturnType<typeof getUserProgression>> | null;
  infiniteTotals: Awaited<ReturnType<typeof getInfiniteBadgeTotals>>;
  referralSummary: Awaited<ReturnType<typeof fetchCachedReferralSummary>>;
  referralLineageView: Awaited<ReturnType<typeof loadCachedReferralLineageView>> | null;
  referralLineageError: string | null;
  spogomiCollection: Awaited<ReturnType<typeof loadSpogomiCollectionForUser>> | null;
  spogomiVolunteerSummary: Awaited<ReturnType<typeof loadSpogomiVolunteerSummaryForUser>> | null;
};

export async function loadProfilePageData(userId: string): Promise<ProfilePageData> {
  const gamification = await getUserProgression(
    getSupabaseServerClient(true),
    userId,
  ).catch(() => null);
  const spogomiCollection = await loadSpogomiCollectionForUser(
    getSupabaseServerClient(true),
    userId,
  ).catch(() => null);
  const spogomiVolunteerSummary = await loadSpogomiVolunteerSummaryForUser(
    getSupabaseServerClient(true),
    userId,
  ).catch(() => null);
  const infiniteTotals = await getInfiniteBadgeTotals(userId).catch(() => buildProfileTotalsFallback());
  const referralSummary = await fetchCachedReferralSummary(userId).catch(() => ({
    referralCode: null,
    inviteUrl: null,
    invitedUsersCount: 0,
    invitedBy: null,
    badgeUnlocked: false,
    referralAwardedXp: 0,
  }));

  let referralLineageView = null;
  let referralLineageError: string | null = null;
  try {
    referralLineageView = await loadCachedReferralLineageView(userId);
  } catch (error) {
    referralLineageError = error instanceof Error
      ? error.message
      : "Impossible de charger l'arborescence de parrainage.";
  }

  return {
    gamification,
    infiniteTotals,
    referralSummary,
    referralLineageView,
    referralLineageError,
    spogomiCollection,
    spogomiVolunteerSummary,
  };
}

function buildProfileTotalsFallback(): Awaited<ReturnType<typeof getInfiniteBadgeTotals>> {
  return {
    wasteKg: 0,
    butts: 0,
    newPlaces: 0,
    wasteRawKg: 0,
    wasteEquivalentSecKg: 0,
    wasteUnknownConditionCount: 0,
    participationCount: 0,
    organisationCount: 0,
    cleanZonesCount: 0,
    terrainProgressions: buildTerrainProgressions({
      participationCount: 0,
      organisationCount: 0,
      explorationCount: 0,
      cleanZonesCount: 0,
      events: [],
    }),
    actionBalance: createFallbackActionBalanceSummary(),
    monthlyRegularity: computeMonthlyRegularitySummary([]),
    sensitiveZoneApaisement: createFallbackSensitiveZoneApaisementSummary(),
    milestones: buildCurrentMilestones({ completeActionsCount: 0, events: [] }),
    moderationProgression: null,
  };
}
