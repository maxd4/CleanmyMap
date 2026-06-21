import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { broadcastGamificationAnnouncement } from "@/lib/gamification/announcements";
import { auditXpAttribution } from "./notifications";
import { insertProgressionEvent } from "./progression-data";
import { logWarning } from "@/lib/logging/failure-log";

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
const REFERRAL_BADGE_SOURCE_TABLE = "referral_invites";
const REFERRAL_BADGE_SOURCE_ID_PREFIX = "referral-invite:";
const REFERRAL_XP = 2;
const REFERRAL_PATH = "/sign-up";

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

async function ensureReferralInviteAward(
  supabase: SupabaseClient,
  params: {
    userId: string;
    referralCode: string;
  },
): Promise<boolean> {
  const sourceId = `${REFERRAL_BADGE_SOURCE_ID_PREFIX}${params.userId}`;
  const existing = await supabase
    .from("progression_events")
    .select("id")
    .eq("user_id", params.userId)
    .eq("source_table", REFERRAL_BADGE_SOURCE_TABLE)
    .eq("source_id", sourceId)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }
  if (existing.data) {
    return false;
  }

  const inviteUrl = buildReferralInviteUrl(params.referralCode);
  const inserted = await insertProgressionEvent(supabase, {
    userId: params.userId,
    eventType: REFERRAL_BADGE_EVENT_TYPE,
    sourceTable: REFERRAL_BADGE_SOURCE_TABLE,
    sourceId,
    statusPhase: "validated",
    weight: 1,
    xpBase: REFERRAL_XP,
    xpAwarded: REFERRAL_XP,
    occurredOn: new Date().toISOString().slice(0, 10),
    metadata: {
      referralCode: params.referralCode,
      inviteUrl,
      referralAwardedXp: REFERRAL_XP,
    },
  });

  if (inserted) {
    await auditXpAttribution(
      supabase,
      params.userId,
      null,
      "Badge one-shot: inviter un ami",
      REFERRAL_XP,
      REFERRAL_BADGE_SOURCE_TABLE,
      sourceId,
      {
        referralCode: params.referralCode,
        inviteUrl,
      },
    );

    await broadcastGamificationAnnouncement(supabase, {
      type: "referral_invite_awarded",
      userId: params.userId,
      badgeId: REFERRAL_BADGE_EVENT_TYPE,
      xp: REFERRAL_XP,
      referralCode: params.referralCode,
      inviteUrl,
      title: "Badge invité un ami",
      message: "+2 XP pour la première invitation générée.",
      icon: "share-2",
      source: "referrals",
      dedupeKey: `referral_invite_awarded:${params.referralCode}`,
    });
  }

  return inserted;
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

  const [invitedUsersResult, inviterResult] = await Promise.all([
    invitedUsersPromise,
    inviterPromise,
  ]);

  if (invitedUsersResult.error) {
    throw invitedUsersResult.error;
  }
  if (inviterResult.error) {
    throw inviterResult.error;
  }

  const referralCode = normalizeReferralCode(profile?.referral_code);
  const hasReferralBadge = Boolean(referralCode);
  const awardedXp = hasReferralBadge ? REFERRAL_XP : 0;

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
    badgeUnlocked: hasReferralBadge,
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
    const referralCode = normalizeReferralCode(profile.referral_code);
    await ensureReferralInviteAward(supabase, {
      userId,
      referralCode,
    }).catch((error) => {
      logWarning("Referrals", "Invite repair failed", {
        userId,
        reason: error instanceof Error ? error.message : String(error),
      });
    });

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
      await ensureReferralInviteAward(supabase, {
        userId,
        referralCode: currentSummary.referralCode,
      }).catch((error) => {
        logWarning("Referrals", "Invite award repair failed", {
          userId,
          reason: error instanceof Error ? error.message : String(error),
        });
      });
      return {
        summary: await loadReferralSummary(supabase, userId),
        created: false,
      };
    }

    throw lastError ?? new Error("Impossible de créer le lien d'invitation.");
  }

  await ensureReferralInviteAward(supabase, {
    userId,
    referralCode,
  });

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

  return {
    claimed: true,
    inviterUserId: inviter.id,
    inviterDisplayName: inviter.display_name || inviter.id,
  };
}
