import { NextResponse } from "next/server";
import { fetchUnifiedActionContracts } from "@/lib/actions/unified-source";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildRecyclingBreakdown } from "@/lib/recycling/breakdown";
import { loadOrRefreshPublicSurfaceSnapshot } from "@/lib/public-surface-snapshot-service";

export const runtime = "nodejs";

const RECYCLING_BREAKDOWN_TTL_MINUTES = 60;
const RECYCLING_BREAKDOWN_VERSION = "public-recycling-breakdown-v3";
const RECYCLING_BREAKDOWN_SNAPSHOT_KEY = "recycling-breakdown";

export async function GET() {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }

  try {
    const snapshot = await loadOrRefreshPublicSurfaceSnapshot({
      snapshotKey: RECYCLING_BREAKDOWN_SNAPSHOT_KEY,
      title: "Répartition recyclage",
      version: RECYCLING_BREAKDOWN_VERSION,
      ttlMinutes: RECYCLING_BREAKDOWN_TTL_MINUTES,
      allowStaleOnBuildError: false,
      buildPayload: async () => {
        const supabase = getSupabaseServerClient(true);
        const result = await fetchUnifiedActionContracts(supabase, {
          limit: 2000,
          status: "approved",
          floorDate: null,
          requireCoordinates: false,
          types: ["action"],
        });
        if (result.isTruncated || result.sourceHealth.partial) {
          throw new Error("Recycling breakdown source is incomplete.");
        }

        const breakdown = buildRecyclingBreakdown(result.items);
        return {
          status: "ok" as const,
          totalKg: breakdown.totalKg,
          wasteKnownActions: breakdown.wasteKnownActions,
          wasteCoverageRate: breakdown.wasteCoverageRate,
          lines: breakdown.lines,
          triQuality: breakdown.triQuality,
          generatedAt: new Date().toISOString(),
        };
      },
      meta: {
        route: "api/recycling/breakdown",
      },
    });

    return NextResponse.json(snapshot.payload);
  } catch (error) {
    return handleApiError(error, "GET /api/recycling/breakdown");
  }
}
