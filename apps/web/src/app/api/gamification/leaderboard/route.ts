import { NextResponse } from"next/server";
import { unstable_cache } from"next/cache";
import { z } from"zod";
import {
  getGamificationLeaderboard,
  projectGamificationLeaderboardResponse,
} from "@/lib/gamification/progression";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import { handleApiError } from"@/lib/http/api-errors";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from"@/lib/supabase/server";

export const runtime ="nodejs";
const GAMIFICATION_LEADERBOARD_CACHE_HEADERS = {
 "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
};
const GAMIFICATION_LEADERBOARD_CACHE_REVALIDATE_SECONDS = 120;

const scopeSchema = z.enum(["individual","collective"]);
const metricSchema = z.enum(["level", "xp", "badges"]);

function buildLeaderboardCacheKey(
 scope: "individual" | "collective",
 metric: "level" | "xp" | "badges",
): string {
 return [`scope:${scope}`, `metric:${metric}`].join("|");
}

async function loadCachedGamificationLeaderboard(
 scope: "individual" | "collective",
 metric: "level" | "xp" | "badges",
) {
 const cached = unstable_cache(
  async () => {
   const supabase = getSupabaseServerClient(true);
    const leaderboard = await getGamificationLeaderboard(supabase, scope, metric);
    return projectGamificationLeaderboardResponse(leaderboard);
  },
   ["gamification-leaderboard", buildLeaderboardCacheKey(scope, metric)],
  {
   revalidate: GAMIFICATION_LEADERBOARD_CACHE_REVALIDATE_SECONDS,
   tags: ["gamification-leaderboard"],
  },
 );

 return cached();
}

export async function GET(request: Request) {
 const access = await requireAuthenticatedAccess();
 if (!access.ok) return unauthorizedJsonResponse();

 const url = new URL(request.url);
 const parsed = scopeSchema.safeParse(url.searchParams.get("scope") ??"individual");
 const metric = metricSchema.safeParse(url.searchParams.get("metric") ?? "level");
  if (!parsed.success) {
 return NextResponse.json(
 { error:"Invalid scope. Use individual|collective." },
 { status: 400 },
 );
  }
  if (!metric.success) {
    return NextResponse.json(
      { error:"Invalid metric. Use level|xp|badges." },
      { status: 400 },
    );
  }

  try {
  const leaderboard = await loadCachedGamificationLeaderboard(parsed.data, metric.data);
 return NextResponse.json({
 status:"ok",
  metric: metric.data,
 ...leaderboard,
 }, {
  headers: GAMIFICATION_LEADERBOARD_CACHE_HEADERS,
 });
 } catch (error) {
 return handleApiError(error, "GET /api/gamification/leaderboard");
 }
}
