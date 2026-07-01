import { auth } from"@clerk/nextjs/server";
import { NextResponse } from"next/server";
import { unstable_cache } from"next/cache";
import { getUserProgression } from"@/lib/gamification/progression";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import { handleApiError } from"@/lib/http/api-errors";
import { getSupabaseServerClient } from"@/lib/supabase/server";

export const runtime ="nodejs";
const GAMIFICATION_ME_CACHE_HEADERS = {
 "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
};
const GAMIFICATION_ME_CACHE_REVALIDATE_SECONDS = 30;

function buildGamificationMeCacheKey(userId: string): string {
 return `user:${userId}`;
}

async function loadCachedGamificationMe(userId: string) {
 const cached = unstable_cache(
 async () => {
   const supabase = getSupabaseServerClient();
   return getUserProgression(supabase, userId);
  },
  ["gamification-me", buildGamificationMeCacheKey(userId)],
  {
   revalidate: GAMIFICATION_ME_CACHE_REVALIDATE_SECONDS,
   tags: [`gamification-me:${userId}`],
  },
 );

 return cached();
}

export async function GET() {
 const { userId } = await auth();
 if (!userId) {
 return unauthorizedJsonResponse();
 }

 try {
 const progression = await loadCachedGamificationMe(userId);
 return NextResponse.json({
 status:"ok",
 progression,
 }, {
  headers: GAMIFICATION_ME_CACHE_HEADERS,
 });
 } catch (error) {
 return handleApiError(error, "GET /api/gamification/me");
 }
}
