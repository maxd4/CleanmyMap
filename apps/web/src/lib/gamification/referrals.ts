import { randomUUID } from "crypto";
import { revalidateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { broadcastGamificationAnnouncement } from "@/lib/gamification/announcements";
import { auditXpAttribution } from "./notifications";
import { insertProgressionEvent } from "./progression-data";

export type ReferralSummary = {
  referralCode: string | null;
  inviteUrl: string | null;
  invitedUsersCount: number;
  invitedBy: {
    userId: string;
    displayName: string;
  } | null;
  badgeUnlocked: boolean;
  referralAwardedXp: number;
};

export type ReferralClaimResult = {
  claimed: boolean;
  inviterUserId: string | null;
  inviterDisplayName: string | null;
};

const REFERRAL_BADGE_EVENT_TYPE = "community_referral_invite";
const REFERRAL_CONTRIBUTION_SOURCE_TABLE = "referral_contributions";
const REFERRAL_CONTRIBUTION_SOURCE_ID_PREFIX = "referral-contribution:";
const REFERRAL_XP = 2;
const REFERRAL_PATH = "/sign-up";
const REFERRAL_EXPORT_CACHE_TAG = "admin-referral-lineage-export";

function normalizeReferralCode(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}

function buildAppOrigin(): string {
  return env.NEXT_PUBLIC_APP_URL || "https://cleanmymap.fr";
}

export function buildReferralInviteUrl(code: string): string {
  const normalizedCode = normalizeReferralCode(code);
  const url = new URL(REFERRAL_PATH, buildAppOrigin());
  url.searchParams.set("ref", normalizedCode);
  return url.toString();
}

function createReferralCode(): string {
  return randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
}

function invalidateReferralCaches(): void {
  revalidateTag(REFERRAL_EXPORT_CACHE_TAG, "max");
}

export async function awardReferralForUsefulContribution(
  supabase: SupabaseClient,
  params: {
    inviteeUserId: string;
    contributionSourceTable: string;
    contributionSourceId: string;
    occurredOn?: string;
  },
): Promise<{
  awarded: boolean;
  inviterUserId: string | null;
  inviteeUserId: string;
}> {
  const invitee = await loadReferralProfile(supabase, params.inviteeUserId);
  const inviterUserId = invitee?.referred_by_profile_id?.trim() || null;

  if (!inviterUserId || inviterUserId === params.inviteeUserId) {
    return {
      awarded: false,
      inviterUserId,
      inviteeUserId: params.inviteeUserId,
    };
  }

  // The source is the referral lineage, not the triggering contribution:
  // later validated contributions by the same invitee must not award again.
  const sourceId = `${REFERRAL_CONTRIBUTION_SOURCE_ID_PREFIX}${params.inviteeUserId}`;
  const inserted = await insertProgressionEvent(supabase, {
    userId: inviterUserId,
    eventType: REFERRAL_BADGE_EVENT_TYPE,
    sourceTable: REFERRAL_CONTRIBUTION_SOURCE_TABLE,
    sourceId,
    statusPhase: "validated",
    weight: 1,
    xpBase: REFERRAL_XP,
    xpAwarded: REFERRAL_XP,
    occurredOn: (params.occurredOn ?? new Date().toISOString()).slice(0, 10),
    metadata: {
      inviteeUserId: params.inviteeUserId,
      contributionSourceTable: params.contributionSourceTable,
      contributionSourceId: params.contributionSourceId,
      referralAwardedXp: REFERRAL_XP,
    },
  });

  if (inserted) {
    invalidateReferralCaches();

    await auditXpAttribution(
      supabase,
      inviterUserId,
      null,
      "Parrainage utile : première contribution confirmée de l'invité",
      REFERRAL_XP,
      REFERRAL_CONTRIBUTION_SOURCE_TABLE,
      sourceId,
      {
        inviteeUserId: params.inviteeUserId,
        contributionSourceTable: params.contributionSourceTable,
        contributionSourceId: params.contributionSourceId,
      },
    );

    await broadcastGamificationAnnouncement(supabase, {
      type: "referral_invite_awarded",
      userId: inviterUserId,
      badgeId: REFERRAL_BADGE_EVENT_TYPE,
      xp: REFERRAL_XP,
      title: "Parrainage utile",
      message: "+2 XP : votre invité a réalisé sa première contribution utile confirmée.",
      icon: "share-2",
      source: "referrals",
      dedupeKey: `referral_invite_awarded:${inviterUserId}:${params.inviteeUserId}`,
    });
  }

  return {
    awarded: inserted,
    inviterUserId,
    inviteeUserId: params.inviteeUserId,
  };
}

export async function removeReferralAwardForRejectedContribution(
  supabase: SupabaseClient,
  inviteeUserId: string,
): Promise<string | null> {
  const invitee = await loadReferralProfile(supabase, inviteeUserId);
  const inviterUserId = invitee?.referred_by_profile_id?.trim() || null;

  if (!inviterUserId || inviterUserId === inviteeUserId) {
    return null;
  }

  const sourceId = `${REFERRAL_CONTRIBUTION_SOURCE_ID_PREFIX}${inviteeUserId}`;
  const { error } = await supabase
    .from("progression_events")
    .delete()
    .eq("user_id", inviterUserId)
    .eq("event_type", REFERRAL_BADGE_EVENT_TYPE)
    .eq("source_table", REFERRAL_CONTRIBUTION_SOURCE_TABLE)
    .eq("source_id", sourceId)
    .eq("status_phase", "validated");

  if (error) {
    throw error;
  }

  invalidateReferralCaches();
  return inviterUserId;
}

async function loadReferralProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  id: string;
  display_name: string;
  referral_code: string | null;
  referred_by_profile_id: string | null;
  referred_at: string | null;
} | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, referral_code, referred_by_profile_id, referred_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as typeof data) ?? null;
}

export async function loadReferralSummary(
  supabase: SupabaseClient,
  userId: string,
): Promise<ReferralSummary> {
  const profile = await loadReferralProfile(supabase, userId);

  const invitedUsersPromise = supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("referred_by_profile_id", userId);

  const inviterPromise = profile?.referred_by_profile_id
    ? supabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", profile.referred_by_profile_id)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const referralAwardsPromise = supabase
    .from("progression_events")
    .select("xp_awarded")
    .eq("user_id", userId)
    .eq("event_type", REFERRAL_BADGE_EVENT_TYPE)
    .eq("source_table", REFERRAL_CONTRIBUTION_SOURCE_TABLE)
    .eq("status_phase", "validated")
    .limit(10000);

  const [invitedUsersResult, inviterResult, referralAwardsResult] = await Promise.all([
    invitedUsersPromise,
    inviterPromise,
    referralAwardsPromise,
  ]);

  if (invitedUsersResult.error) {
    throw invitedUsersResult.error;
  }
  if (inviterResult.error) {
    throw inviterResult.error;
  }
  if (referralAwardsResult.error) {
    throw referralAwardsResult.error;
  }

  const referralCode = normalizeReferralCode(profile?.referral_code);
  const awardedXp = ((referralAwardsResult.data ?? []) as Array<{ xp_awarded: number | null }>).reduce(
    (total, row) => total + Math.max(0, Number(row.xp_awarded) || 0),
    0,
  );

  return {
    referralCode: referralCode || null,
    inviteUrl: referralCode ? buildReferralInviteUrl(referralCode) : null,
    invitedUsersCount: invitedUsersResult.count ?? 0,
    invitedBy: inviterResult.data
      ? {
          userId: inviterResult.data.id,
          displayName: inviterResult.data.display_name || inviterResult.data.id,
        }
      : null,
    badgeUnlocked: awardedXp > 0,
    referralAwardedXp: awardedXp,
  };
}

export async function ensureReferralInviteForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  summary: ReferralSummary;
  created: boolean;
}> {
  const profile = await loadReferralProfile(supabase, userId);
  if (!profile) {
    throw new Error("Profil introuvable pour créer un lien d'invitation.");
  }

  if (normalizeReferralCode(profile.referral_code)) {
    return {
      summary: await loadReferralSummary(supabase, userId),
      created: false,
    };
  }

  let referralCode = "";
  let updated = false;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    referralCode = createReferralCode();

    const { data: updatedProfile, error } = await supabase
      .from("profiles")
      .update({
        referral_code: referralCode,
      })
      .eq("id", userId)
      .is("referral_code", null)
      .select("id, referral_code")
      .maybeSingle();

    if (!error) {
      if (!updatedProfile?.referral_code) {
        return {
          summary: await loadReferralSummary(supabase, userId),
          created: false,
        };
      }
      updated = true;
      break;
    }

    if ((error.code ?? "") !== "23505") {
      lastError = error;
      break;
    }
  }

  if (!updated) {
    const currentSummary = await loadReferralSummary(supabase, userId);
    if (currentSummary.referralCode) {
      return {
        summary: currentSummary,
        created: false,
      };
    }

    throw lastError ?? new Error("Impossible de créer le lien d'invitation.");
  }

  invalidateReferralCaches();

  return {
    summary: await loadReferralSummary(supabase, userId),
    created: true,
  };
}

export async function claimReferralInviteForUser(
  supabase: SupabaseClient,
  params: {
    userId: string;
    code: string;
  },
): Promise<ReferralClaimResult> {
  const referralCode = normalizeReferralCode(params.code);
  if (!referralCode) {
    return {
      claimed: false,
      inviterUserId: null,
      inviterDisplayName: null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, referred_by_profile_id")
    .eq("id", params.userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const { data: inviter, error: inviterError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("referral_code", referralCode)
    .maybeSingle();

  if (inviterError) {
    throw inviterError;
  }
  if (!inviter || inviter.id === params.userId) {
    return {
      claimed: false,
      inviterUserId: null,
      inviterDisplayName: null,
    };
  }

  if ((profile as { referred_by_profile_id?: string | null } | null)?.referred_by_profile_id) {
    return {
      claimed: false,
      inviterUserId: inviter.id,
      inviterDisplayName: inviter.display_name || inviter.id,
    };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      referred_by_profile_id: inviter.id,
      referred_at: new Date().toISOString(),
    })
    .eq("id", params.userId)
    .is("referred_by_profile_id", null);

  if (updateError) {
    throw updateError;
  }

  invalidateReferralCaches();

  return {
    claimed: true,
    inviterUserId: inviter.id,
    inviterDisplayName: inviter.display_name || inviter.id,
  };
}
