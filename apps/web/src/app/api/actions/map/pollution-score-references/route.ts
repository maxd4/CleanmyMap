import { NextResponse } from "next/server";
import { loadActionCollectionReferenceAverages } from "@/lib/actions/action-collection-reference-averages";
import { loadPollutionScoreReferencesForMap } from "@/lib/actions/pollution/pollution-score-reference-snapshot";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [pollutionResult, collectionResult] = await Promise.allSettled([
      loadPollutionScoreReferencesForMap(),
      loadActionCollectionReferenceAverages(),
    ]);
    if (pollutionResult.status === "rejected") {
      throw pollutionResult.reason;
    }

    const result = pollutionResult.value;
    const collectionReferences = collectionResult.status === "fulfilled"
      ? collectionResult.value
      : null;

    return NextResponse.json({ ...result, collectionReferences }, {
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
