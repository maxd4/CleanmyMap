import { auth } from"@clerk/nextjs/server";
import { NextResponse } from"next/server";
import { unstable_cache } from"next/cache";
import { z } from"zod";
import { getGamificationLeaderboard } from"@/lib/gamification/progression";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import { handleApiError } from"@/lib/http/api-errors";
import { getSupabaseServerClient } from"@/lib/supabase/server";

export const runtime ="nodejs";
const GAMIFICATION_LEADERBOARD_CACHE_HEADERS = {
 "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
};
const GAMIFICATION_LEADERBOARD_CACHE_REVALIDATE_SECONDS = 120;

const scopeSchema = z.enum(["individual","collective"]);
const periodSchema = z.enum(["lifetime","yearToDate"]);

function buildLeaderboardCacheKey(
 scope: "individual" | "collective",
 period: "lifetime" | "yearToDate",
): string {
 return [`scope:${scope}`, `period:${period}`].join("|");
}

async function loadCachedGamificationLeaderboard(
 scope: "individual" | "collective",
 period: "lifetime" | "yearToDate",
) {
 const cached = unstable_cache(
  async () => {
   const supabase = getSupabaseServerClient();
   return getGamificationLeaderboard(supabase, scope, period);
  },
  ["gamification-leaderboard", buildLeaderboardCacheKey(scope, period)],
  {
   revalidate: GAMIFICATION_LEADERBOARD_CACHE_REVALIDATE_SECONDS,
   tags: ["gamification-leaderboard"],
  },
 );

 return cached();
}

export async function GET(request: Request) {
 const { userId } = await auth();
 if (!userId) {
 return unauthorizedJsonResponse();
 }

 const url = new URL(request.url);
 const parsed = scopeSchema.safeParse(url.searchParams.get("scope") ??"individual");
 const period = periodSchema.safeParse(url.searchParams.get("period") ??"lifetime");
  if (!parsed.success) {
 return NextResponse.json(
 { error:"Invalid scope. Use individual|collective." },
 { status: 400 },
 );
  }
  if (!period.success) {
    return NextResponse.json(
      { error:"Invalid period. Use lifetime|yearToDate." },
      { status: 400 },
    );
  }

  try {
 const leaderboard = await loadCachedGamificationLeaderboard(parsed.data, period.data);
 return NextResponse.json({
 status:"ok",
 period: period.data,
 ...leaderboard,
 }, {
  headers: GAMIFICATION_LEADERBOARD_CACHE_HEADERS,
 });
 } catch (error) {
 return handleApiError(error, "GET /api/gamification/leaderboard");
 }
}
