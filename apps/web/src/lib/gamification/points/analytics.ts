import type { SupabaseClient } from "@supabase/supabase-js";

export type GamificationPointsAnalytics = {
  totalPoints: number;
  transactionCount: number;
  eventBreakdown: Record<string, { count: number; points: number }>;
  timeline: Array<{ date: string; points: number }>;
};

type GamificationPointsAnalyticsRow = {
  total_points: number | null;
  transaction_count: number | null;
  event_breakdown: Record<string, { count?: number; points?: number }> | null;
  timeline: Array<{ date?: string; points?: number }> | null;
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

export async function loadGamificationPointsAnalytics(
  supabase: SupabaseClient,
  userId: string,
  floorDate: string | null,
): Promise<GamificationPointsAnalytics> {
  const result = await supabase.rpc("load_gamification_points_analytics", {
    p_user_id: userId,
    p_floor_date: floorDate,
  });
  if (result.error) {
    throw new Error(result.error.message);
  }

  const row = toSingleRow(
    result.data as GamificationPointsAnalyticsRow[] | GamificationPointsAnalyticsRow | null,
  );

  const eventBreakdown = Object.fromEntries(
    Object.entries(row?.event_breakdown ?? {}).map(([event, value]) => [
      event,
      {
        count: toNonNegativeInteger(value.count),
        points: toNonNegativeNumber(value.points),
      },
    ]),
  );

  const timeline = (row?.timeline ?? [])
    .map((item) => ({
      date: typeof item.date === "string" ? item.date : "",
      points: toNonNegativeNumber(item.points),
    }))
    .filter((item) => item.date.length > 0);

  return {
    totalPoints: toNonNegativeNumber(row?.total_points),
    transactionCount: toNonNegativeInteger(row?.transaction_count),
    eventBreakdown,
    timeline,
  };
}
