import type { SupabaseClient } from "@supabase/supabase-js";

// Conversion rate: 1 XP = 1 point (configurable here)
export const XP_TO_POINTS_RATIO = 1;

// Point thresholds for rewards
export const POINTS_MILESTONES = {
  FIRST_CLEANUP: 10,
  SPOT_VALIDATION: 20,
  ACTION_APPROVAL: 15,
  COLLECTIVE_EVENT: 25,
  QUIZ_COMPLETED: 5,
  PLACE_DISCOVERED: 3,
};

export interface PointsTransaction {
  userId: string;
  amount: number;
  reason: string;
  sourceEvent: string;
  sourceId: string;
}

/**
 * Award points to a user based on an XP-earning event
 */
export async function awardPoints(
  supabase: SupabaseClient,
  params: {
    userId: string;
    xpEarned: number;
    sourceEvent: string;
    sourceId: string;
    reason?: string;
  }
): Promise<boolean> {
  const pointsAmount = Math.round(params.xpEarned * XP_TO_POINTS_RATIO);

  if (pointsAmount <= 0) {
    return false;
  }

  const { error } = await supabase.from("points_ledger").insert({
    user_id: params.userId,
    transaction_type: "earned",
    amount: pointsAmount,
    source_event: params.sourceEvent,
    source_id: params.sourceId,
    reason: params.reason ?? null,
  });

  if (error) {
    console.error("[PointsSystem] Failed to award points:", error);
    return false;
  }

  return true;
}

/**
 * Award points once for a stable source key.
 * If an identical source_event/source_id already exists in the ledger, skip the insert.
 */
export async function awardPointsOnce(
  supabase: SupabaseClient,
  params: {
    userId: string;
    xpEarned: number;
    sourceEvent: string;
    sourceId: string;
    reason?: string;
  },
): Promise<boolean> {
  const existing = await supabase
    .from("points_ledger")
    .select("id")
    .eq("user_id", params.userId)
    .eq("source_event", params.sourceEvent)
    .eq("source_id", params.sourceId)
    .maybeSingle();

  if (existing.error) {
    console.error("[PointsSystem] Failed to check existing points:", existing.error);
    return false;
  }
  if (existing.data) {
    return false;
  }

  return awardPoints(supabase, params);
}

/**
 * Spend/deduct points from a user
 */
export async function spendPoints(
  supabase: SupabaseClient,
  params: {
    userId: string;
    amount: number;
    reason: string;
  }
): Promise<boolean> {
  const { data: userData } = await supabase
    .from("user_points")
    .select("total_points")
    .eq("user_id", params.userId)
    .maybeSingle();

  const currentPoints = userData?.total_points ?? 0;

  if (currentPoints < params.amount) {
    console.warn(
      `[PointsSystem] Insufficient points for user ${params.userId}. Have: ${currentPoints}, Need: ${params.amount}`
    );
    return false;
  }

  const { error } = await supabase.from("points_ledger").insert({
    user_id: params.userId,
    transaction_type: "spent",
    amount: params.amount,
    reason: params.reason,
    source_event: null,
    source_id: null,
  });

  if (error) {
    console.error("[PointsSystem] Failed to spend points:", error);
    return false;
  }

  return true;
}

/**
 * Get user's current points balance
 */
export async function getUserPoints(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  totalPoints: number;
  earnedPoints: number;
  spentPoints: number;
}> {
  const { data, error } = await supabase
    .from("user_points")
    .select("total_points, earned_points, spent_points")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[PointsSystem] Failed to fetch user points:", error);
    return {
      totalPoints: 0,
      earnedPoints: 0,
      spentPoints: 0,
    };
  }

  return {
    totalPoints: data?.total_points ?? 0,
    earnedPoints: data?.earned_points ?? 0,
    spentPoints: data?.spent_points ?? 0,
  };
}

/**
 * Get points ledger history for a user
 */
export async function getPointsHistory(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<
  Array<{
    id: string;
    transactionType: string;
    amount: number;
    reason: string | null;
    sourceEvent: string | null;
    createdAt: string;
  }>
> {
  const { data, error } = await supabase
    .from("points_ledger")
    .select("id, transaction_type, amount, reason, source_event, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[PointsSystem] Failed to fetch points history:", error);
    return [];
  }

  return (data ?? []).map((row: {
    id: string;
    transaction_type: string;
    amount: number;
    reason: string | null;
    source_event: string | null;
    created_at: string;
  }) => ({
    id: row.id,
    transactionType: row.transaction_type,
    amount: row.amount,
    reason: row.reason,
    sourceEvent: row.source_event,
    createdAt: row.created_at,
  }));
}
