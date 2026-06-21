import type { SupabaseClient } from "@supabase/supabase-js";

export type GamificationFunnelCounts = {
  totalUsers: number;
  usersWithPoints: number;
  usersWithBadges: number;
  usersHighActivity: number;
};

export type GamificationUserCounters = {
  totalPoints: number;
  approvedActionsCount: number;
  completeActionsCount: number;
  visitedPlacesCount: number;
  eligibleFormsCount: number;
  participationCount: number;
};

type GamificationFunnelCountsRow = {
  total_users: number | null;
  users_with_points: number | null;
  users_with_badges: number | null;
  users_high_activity: number | null;
};

type GamificationUserCountersRow = {
  total_points: number | null;
  approved_actions_count: number | null;
  complete_actions_count: number | null;
  visited_places_count: number | null;
  eligible_forms_count: number | null;
  participation_count: number | null;
};

function toSingleRow<T>(data: T[] | T | null | undefined): T | null {
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }
  return data ?? null;
}

function toNonNegativeInteger(value: number | null | undefined): number {
  const next = Number(value ?? 0);
  return Number.isFinite(next) && next >= 0 ? Math.floor(next) : 0;
}

function toNonNegativeNumber(value: number | null | undefined): number {
  const next = Number(value ?? 0);
  return Number.isFinite(next) && next >= 0 ? next : 0;
}

export async function loadGamificationFunnelCounts(
  supabase: SupabaseClient,
): Promise<GamificationFunnelCounts> {
  const result = await supabase.rpc("load_gamification_funnel_counts");
  if (result.error) {
    throw new Error(result.error.message);
  }

  const row = toSingleRow(result.data as GamificationFunnelCountsRow[] | GamificationFunnelCountsRow | null);

  return {
    totalUsers: toNonNegativeInteger(row?.total_users),
    usersWithPoints: toNonNegativeInteger(row?.users_with_points),
    usersWithBadges: toNonNegativeInteger(row?.users_with_badges),
    usersHighActivity: toNonNegativeInteger(row?.users_high_activity),
  };
}

export async function loadGamificationUserCounters(
  supabase: SupabaseClient,
  userId: string,
): Promise<GamificationUserCounters> {
  const result = await supabase.rpc("load_gamification_user_counters", {
    p_user_id: userId,
  });
  if (result.error) {
    throw new Error(result.error.message);
  }

  const row = toSingleRow(result.data as GamificationUserCountersRow[] | GamificationUserCountersRow | null);

  return {
    totalPoints: toNonNegativeNumber(row?.total_points),
    approvedActionsCount: toNonNegativeInteger(row?.approved_actions_count),
    completeActionsCount: toNonNegativeInteger(row?.complete_actions_count),
    visitedPlacesCount: toNonNegativeInteger(row?.visited_places_count),
    eligibleFormsCount: toNonNegativeInteger(row?.eligible_forms_count),
    participationCount: toNonNegativeInteger(row?.participation_count),
  };
}
