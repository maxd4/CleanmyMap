import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  loadTerritorialLegendPage,
  TERRITORIAL_LEGEND_LEVELS,
  validateTerritorialLegendCode,
} from "@/lib/gamification/territorial-legends";

export const runtime = "nodejs";

const levelSchema = z.enum(TERRITORIAL_LEGEND_LEVELS);

export async function GET(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const url = new URL(request.url);
  const level = levelSchema.safeParse(url.searchParams.get("level"));
  const territoryCode = url.searchParams.get("territoryCode")?.trim() ?? "";
  if (!level.success || !territoryCode || !validateTerritorialLegendCode(level.data, territoryCode)) {
    return NextResponse.json({ error: "Un niveau et un code territorial sont requis." }, { status: 400 });
  }

  try {
    const page = await loadTerritorialLegendPage(getSupabaseServerClient(true), {
      level: level.data,
      territoryCode,
      limit: 100,
      cursor: null,
      ownerUserId: access.userId,
    });
    // Cache/no-store justification: the owner projection contains private
    // consent and rank state and must never enter a shared cache.
    return NextResponse.json(
      {
        status: "ok",
        level: page.level,
        territoryCode: page.territoryCode,
        territoryLabel: page.territoryLabel,
        generatedAt: page.generatedAt,
        windowDays: page.windowDays,
        competitorCount: page.competitorCount,
        maxScore: page.maxScore,
        titleEligible: page.titleEligible,
        title: page.title,
        owner: page.owner,
        items: [],
        nextCursor: null,
      },
      // private/no-store is required because this response contains owner rank state.
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/gamification/territorial-leaderboard/me");
  }
}
