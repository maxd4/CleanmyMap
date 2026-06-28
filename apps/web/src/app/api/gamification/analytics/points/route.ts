import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import {
  getTimeScopeFloorDate,
  getTimeScopeLabel,
  resolveTimeScopeFromRequest,
  type TimeScope,
} from "@/lib/time-scopes";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadGamificationPointsAnalytics } from "@/lib/gamification/points/analytics";

export const runtime = "nodejs";
const GAMIFICATION_POINTS_ANALYTICS_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
};
const GAMIFICATION_POINTS_ANALYTICS_CACHE_REVALIDATE_SECONDS = 120;

function buildGamificationPointsAnalyticsCacheKey(
  userId: string,
  scope: TimeScope,
  dateFloor: string | null,
  days: number | null,
): string {
  return [`user:${userId}`, `scope:${scope}`, `dateFloor:${dateFloor ?? "none"}`, `days:${days}`].join("|");
}

async function loadCachedGamificationPointsAnalytics(
  userId: string,
  scope: TimeScope,
  dateFloor: string | null,
  days: number | null,
) {
  const cached = unstable_cache(
    async () => {
      const supabase = getSupabaseServerClient();
      return loadGamificationPointsAnalytics(supabase, userId, dateFloor);
    },
      [
        "gamification-points-analytics",
      buildGamificationPointsAnalyticsCacheKey(userId, scope, dateFloor, days),
      ],
    {
      revalidate: GAMIFICATION_POINTS_ANALYTICS_CACHE_REVALIDATE_SECONDS,
      tags: [`gamification-points-analytics:${userId}`],
    },
  );

  return cached();
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get("days");

  try {
    const scopeQuery = resolveTimeScopeFromRequest({
      scope: searchParams.get("scope"),
      days: daysParam,
      fallback: "rolling30d",
    });
    const scope: TimeScope = scopeQuery.scope;
    const dateFloor = getTimeScopeFloorDate(scope);
    const analytics = await loadCachedGamificationPointsAnalytics(
      userId,
      scope,
      dateFloor,
      scopeQuery.days,
    );

    return NextResponse.json({
      status: "ok",
      scope,
      scopeLabel: getTimeScopeLabel(scope),
      days: scopeQuery.days,
      ...analytics,
    }, {
      headers: GAMIFICATION_POINTS_ANALYTICS_CACHE_HEADERS,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/gamification/analytics/points");
  }
}
