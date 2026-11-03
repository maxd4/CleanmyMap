import type { SupabaseClient } from "@supabase/supabase-js";
import { toNonNegativeInteger, toSingleRow } from "./normalizers";

export type GamificationFunnelCounts = {
  totalUsers: number;
  usersWithXp: number;
  usersWithBadges: number;
  usersHighActivity: number;
};

export type GamificationUserCounters = {
  approvedActionsCount: number;
  completeActionsCount: number;
  visitedPlacesCount: number;
  eligibleFormsCount: number;
  participationCount: number;
};

type GamificationFunnelCountsRow = {
  total_users: number | null;
  users_with_xp: number | null;
  users_with_badges: number | null;
  users_high_activity: number | null;
};

type GamificationUserCountersRow = {
  approved_actions_count: number | null;
  complete_actions_count: number | null;
  visited_places_count: number | null;
  eligible_forms_count: number | null;
  participation_count: number | null;
};

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
    usersWithXp: toNonNegativeInteger(row?.users_with_xp),
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
    approvedActionsCount: toNonNegativeInteger(row?.approved_actions_count),
    completeActionsCount: toNonNegativeInteger(row?.complete_actions_count),
    visitedPlacesCount: toNonNegativeInteger(row?.visited_places_count),
    eligibleFormsCount: toNonNegativeInteger(row?.eligible_forms_count),
    participationCount: toNonNegativeInteger(row?.participation_count),
  };
}
