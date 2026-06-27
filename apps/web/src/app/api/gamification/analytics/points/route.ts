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
const GAMIFICATION_POINTS_ANALYTICS_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
};

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get("days");

  try {
    const supabase = getSupabaseServerClient();
    const scopeQuery = resolveTimeScopeFromRequest({
      scope: searchParams.get("scope"),
      days: daysParam,
      fallback: "rolling30d",
    });
    const scope: TimeScope = scopeQuery.scope;
    const dateFloor = getTimeScopeFloorDate(scope);
    const analytics = await loadGamificationPointsAnalytics(supabase, userId, dateFloor);

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
