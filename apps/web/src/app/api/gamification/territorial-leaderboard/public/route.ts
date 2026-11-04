import { NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/http/api-errors";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  loadTerritorialLegendPage,
  TERRITORIAL_LEGEND_LEVELS,
  validateTerritorialLegendCode,
  validateTerritorialLegendLevel,
} from "@/lib/gamification/territorial-legends";

export const runtime = "nodejs";

const levelSchema = z.enum(TERRITORIAL_LEGEND_LEVELS);

function positiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 100) : fallback;
}

export async function GET(request: Request) {
  const rateLimit = await verifyRateLimit(request, { limit: 30, window: 60 });
  const rateLimitResponse = createServerRateLimitResponse(rateLimit.allowed, rateLimit.retryAfter, rateLimit);
  if (rateLimitResponse) return rateLimitResponse;

  const url = new URL(request.url);
  const level = levelSchema.safeParse(url.searchParams.get("level"));
  const territoryCode = url.searchParams.get("territoryCode")?.trim() ?? "";
  if (!level.success || !territoryCode || !validateTerritorialLegendLevel(level.data) || !validateTerritorialLegendCode(level.data, territoryCode)) {
    return NextResponse.json(
      { error: "Un niveau et un code territorial COG valides sont requis." },
      { status: 400 },
    );
  }

  try {
    const page = await loadTerritorialLegendPage(getSupabaseServerClient(true), {
      level: level.data,
      territoryCode,
      limit: positiveInteger(url.searchParams.get("limit"), 25),
      cursor: url.searchParams.get("cursor"),
    });
    return NextResponse.json(
      { status: "ok", ...page },
      // Public eligibility can change when Clerk age metadata or consent is
      // revoked; a shared CDN response must never outlive that decision.
      { headers: { "Cache-Control": "public, no-store, max-age=0" } },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/gamification/territorial-leaderboard/public");
  }
}
