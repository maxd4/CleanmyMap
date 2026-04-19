import type { SupabaseClient } from "@supabase/supabase-js";

export type DiscussionChannel = "discussion_event" | "bug_report";

type ReserveSlotRow = {
  allowed: boolean;
  reason: "ok" | "cooldown" | "daily_limit" | string;
  retry_after_seconds: number | null;
  messages_today: number;
  remaining_today: number;
};

export type DiscussionRateLimitResult = {
  allowed: boolean;
  reason: "ok" | "cooldown" | "daily_limit" | "unknown";
  retryAfterSeconds: number | null;
  messagesToday: number;
  remainingToday: number;
};

export async function reserveDiscussionMessageSlot(
  supabase: SupabaseClient,
  params: {
    userId: string;
    channel: DiscussionChannel;
  },
): Promise<DiscussionRateLimitResult> {
  const result = await supabase.rpc("reserve_community_message_slot", {
    p_user_id: params.userId,
    p_channel: params.channel,
  });

  if (result.error) {
    throw new Error(`Failed to reserve discussion message slot: ${result.error.message}`);
  }

  const raw = Array.isArray(result.data) ? result.data[0] : result.data;
  const row = (raw ?? null) as ReserveSlotRow | null;

  if (!row || typeof row.allowed !== "boolean") {
    return {
      allowed: false,
      reason: "unknown",
      retryAfterSeconds: null,
      messagesToday: 0,
      remainingToday: 0,
    };
  }

  const reason =
    row.reason === "ok" || row.reason === "cooldown" || row.reason === "daily_limit"
      ? row.reason
      : "unknown";

  return {
    allowed: row.allowed,
    reason,
    retryAfterSeconds:
      typeof row.retry_after_seconds === "number" ? row.retry_after_seconds : null,
    messagesToday: Number.isFinite(row.messages_today) ? row.messages_today : 0,
    remainingToday: Number.isFinite(row.remaining_today) ? row.remaining_today : 0,
  };
}

export function toDiscussionRateLimitErrorPayload(
  quota: DiscussionRateLimitResult,
): { error: string; code: "cooldown" | "daily_limit" | "rate_limited"; retryAfterSeconds?: number } {
  if (quota.reason === "cooldown") {
    return {
      error: "Tu as deja publie un message recemment. Reessaie dans quelques secondes.",
      code: "cooldown",
      retryAfterSeconds: quota.retryAfterSeconds ?? 30,
    };
  }

  if (quota.reason === "daily_limit") {
    return {
      error: "Quota quotidien atteint (10 messages par jour). Reviens demain.",
      code: "daily_limit",
    };
  }

  return {
    error: "Publication temporairement limitee.",
    code: "rate_limited",
  };
}
