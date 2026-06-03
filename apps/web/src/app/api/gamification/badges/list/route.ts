import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { loadGamificationBadgesList } from "@/lib/gamification/badges/listing";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  try {
    const supabase = getSupabaseServerClient();
    const payload = await loadGamificationBadgesList(supabase, userId);
    return NextResponse.json({
      status: "ok",
      ...payload,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/gamification/badges/list");
  }
}
