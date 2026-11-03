import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  loadTerritorialLegendAwardHistory,
  type TerritorialLegendAwardProofQuery,
} from "@/lib/gamification/territorial-legends/award-facts";
import {
  TERRITORIAL_LEGEND_LEVELS,
  validateTerritorialLegendCode,
} from "@/lib/gamification/territorial-legends";

export const runtime = "nodejs";

const levelSchema = z.enum(TERRITORIAL_LEGEND_LEVELS);
const campaignYearSchema = z.coerce.number().int().min(1).max(9999);

export async function GET(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();

  const url = new URL(request.url);
  const campaignYear = campaignYearSchema.safeParse(url.searchParams.get("campaignYear"));
  const rawLevel = url.searchParams.get("level");
  const rawTerritoryCode = url.searchParams.get("territoryCode")?.trim() || undefined;
  const parsedLevel = rawLevel === null ? null : levelSchema.safeParse(rawLevel);
  const level = parsedLevel?.success ? parsedLevel.data : undefined;
  if (!campaignYear.success || (rawLevel !== null && level === undefined) ||
      (rawTerritoryCode !== undefined && (level === undefined || !validateTerritorialLegendCode(level, rawTerritoryCode)))) {
    return NextResponse.json(
      { error: "Une année de campagne valide est requise ; le niveau et le code doivent former un territoire COG valide." },
      { status: 400 },
    );
  }

  try {
    const query: TerritorialLegendAwardProofQuery & { campaignYear: number } = {
      campaignYear: campaignYear.data,
      level,
      territoryCode: rawTerritoryCode,
    };
    const proofs = await loadTerritorialLegendAwardHistory(
      getSupabaseServerClient(true),
      access.userId,
      query,
    );
    // no-store justification: invalidated owner history is private audit data
    // and must not remain in a shared cache after a correction.
    return NextResponse.json(
      { status: "ok", campaignYear: campaignYear.data, proofs },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/gamification/territorial-leaderboard/history");
  }
}
