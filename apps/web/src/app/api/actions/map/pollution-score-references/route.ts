import { NextResponse } from "next/server";
import { loadPollutionScoreReferencesForMap } from "@/lib/actions/pollution/pollution-score-reference-snapshot";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await loadPollutionScoreReferencesForMap();
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        error: "Impossible de charger la référence du score pollution.",
      },
      { status: 503 },
    );
  }
}
