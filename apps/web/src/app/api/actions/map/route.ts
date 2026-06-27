import { NextResponse } from "next/server";
import { buildMapActionsRouteResult, parseMapActionsParams } from "@/lib/actions/map-route";
import { buildActionInsights } from "@/lib/actions/insights";
import { toActionMapItem } from "@/lib/actions/data-contract";
import { fetchUnifiedActionContracts, parseEntityTypesParam } from "@/lib/actions/unified-source";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { filterActionContractsByScope } from "@/lib/reports/scope";
import { handleApiError } from "@/lib/http/api-errors";
import { loadOrRefreshPublicSurfaceSnapshot } from "@/lib/public-surface-snapshot-service";

export const runtime = "nodejs";
// Justification Vercel: la carte dépend des filtres et doit rester fraîche, mais le résultat se snapshotte.
export const dynamic = "force-dynamic";

const MAP_ACTIONS_SNAPSHOT_TTL_MINUTES = 15;
const MAP_ACTIONS_SNAPSHOT_VERSION = "public-map-actions-v1";

function buildMapActionsSnapshotKey(url: URL): string {
  const parsed = parseMapActionsParams(url, parseEntityTypesParam);
  return JSON.stringify({
    route: "api/actions/map",
    limit: parsed.limit,
    days: parsed.days,
    status: parsed.status ?? "all",
    floorDate: parsed.floorDate ?? "all",
    types: parsed.types && parsed.types.length > 0
      ? [...parsed.types].sort().join(",")
      : "all",
    qualityMin: parsed.qualityMin ?? "all",
    impact: parsed.impact ?? "all",
    scopeKind: parsed.scope.kind,
    scopeValue: parsed.scope.value ?? "all",
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const snapshot = await loadOrRefreshPublicSurfaceSnapshot({
      snapshotKey: buildMapActionsSnapshotKey(url),
      title: "Actions cartographiques",
      version: MAP_ACTIONS_SNAPSHOT_VERSION,
      ttlMinutes: MAP_ACTIONS_SNAPSHOT_TTL_MINUTES,
      buildPayload: async () => {
        const result = await buildMapActionsRouteResult(url, {
          getSupabaseServerClient,
          fetchUnifiedActionContracts,
          parseEntityTypesParam,
          buildActionInsights,
          toActionMapItem,
          filterActionContractsByScope,
        });
        return result.body;
      },
      meta: {
        route: "api/actions/map",
      },
    });

    return NextResponse.json(
      snapshot.payload,
      snapshot.payload.partialSource
        ? {
            headers: {
              "X-Data-Warning": "Partial source data",
            },
          }
        : undefined,
    );
  } catch (error) {
    return handleApiError(error, "GET /api/actions/map");
  }
}
