import { auth } from"@clerk/nextjs/server";
import { NextResponse } from"next/server";
import { z } from"zod";
import { getGamificationLeaderboard } from"@/lib/gamification/progression";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import { handleApiError } from"@/lib/http/api-errors";
import { getSupabaseServerClient } from"@/lib/supabase/server";

export const runtime ="nodejs";
const GAMIFICATION_LEADERBOARD_CACHE_HEADERS = {
 "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
};

const scopeSchema = z.enum(["individual","collective"]);
const periodSchema = z.enum(["lifetime","yearToDate"]);

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
 const supabase = getSupabaseServerClient();
 const leaderboard = await getGamificationLeaderboard(supabase, parsed.data, period.data);
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
