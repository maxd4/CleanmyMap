import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { fetchActionPollutionScoreReferences } from "@/lib/actions/pollution-score-references";
import { DEFAULT_POLLUTION_SCORE_REFERENCES } from "@/lib/actions/pollution-score";
import { handleApiError } from "@/lib/http/api-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient(false);
    const references = await fetchActionPollutionScoreReferences(supabase).catch(
      () => DEFAULT_POLLUTION_SCORE_REFERENCES,
    );

    return NextResponse.json(
      {
        status: "ok",
        wastePerVolunteer: references.wastePerVolunteer,
        buttsPerVolunteer: references.buttsPerVolunteer,
      },
      {
        headers: {
          // Justification Vercel: these coefficients feed the live map UI and must never be cached.
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/actions/pollution-score-references");
  }
}
