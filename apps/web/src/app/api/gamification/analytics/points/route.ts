import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
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
// COMPATIBILITY/LEGACY: the CURRENT progression surface is XP-backed
// progression_events/progression_profiles. Keep this route for historical
// clients until its public contract is retired explicitly.
const GAMIFICATION_POINTS_ANALYTICS_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
};
async function loadGamificationPointsAnalyticsForUser(
  userId: string,
  dateFloor: string | null,
) {
  const supabase = getSupabaseServerClient();
  return loadGamificationPointsAnalytics(supabase, userId, dateFloor);
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
    const analytics = await loadGamificationPointsAnalyticsForUser(
      userId,
      dateFloor,
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
