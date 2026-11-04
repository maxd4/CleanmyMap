import { NextResponse } from "next/server";

import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import {
  loadTerritorialLegendOverview,
} from "@/lib/gamification/territorial-legends";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();

  try {
    const overview = await loadTerritorialLegendOverview(
      getSupabaseServerClient(true),
      access.userId,
    );
    return NextResponse.json(
      { status: "ok", ...overview },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/gamification/territorial-leaderboard/overview");
  }
}
