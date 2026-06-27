import { auth } from"@clerk/nextjs/server";
import { NextResponse } from"next/server";
import { getUserProgression } from"@/lib/gamification/progression";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import { handleApiError } from"@/lib/http/api-errors";
import { getSupabaseServerClient } from"@/lib/supabase/server";

export const runtime ="nodejs";
const GAMIFICATION_ME_CACHE_HEADERS = {
 "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
};

export async function GET() {
 const { userId } = await auth();
 if (!userId) {
 return unauthorizedJsonResponse();
 }

 try {
 const supabase = getSupabaseServerClient();
 const progression = await getUserProgression(supabase, userId);
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
