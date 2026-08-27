import { NextResponse } from "next/server";
import {
  buildMapActionsRouteResult,
  filterPublicMapResponse,
  parseMapActionsParams,
} from "@/lib/actions/map/map-route";
import { buildActionInsights } from "@/lib/actions/insights";
import { toActionMapItem } from "@/lib/actions/data-contract";
import { fetchUnifiedActionContracts, parseEntityTypesParam } from "@/lib/actions/unified-source";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { filterActionContractsByScope } from "@/lib/reports/scope";
import { handleApiError } from "@/lib/http/api-errors";
import { loadOrRefreshPublicSurfaceSnapshot } from "@/lib/public-surface-snapshot-service";

export const runtime = "nodejs";
// Justification Vercel: la carte dépend des filtres et doit rester fraîche.
export const dynamic = "force-dynamic";

const MAP_ACTIONS_SNAPSHOT_TTL_MINUTES = 15;
const MAP_ACTIONS_SNAPSHOT_VERSION = "public-map-actions-v2";

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
    viewport: "global",
  });
}

function isGeolocatedMapRequest(url: URL): boolean {
  return Boolean(parseMapActionsParams(url, parseEntityTypesParam).viewport);
}

async function buildMapActionsPayload(url: URL) {
  const result = await buildMapActionsRouteResult(url, {
    getSupabaseServerClient,
    fetchUnifiedActionContracts,
    parseEntityTypesParam,
    buildActionInsights,
    toActionMapItem,
    filterActionContractsByScope,
  });

  return result;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    // Viewport bounds are derived from the user's ephemeral location. Never
    // send this response through the persistent public snapshot stores.
    if (isGeolocatedMapRequest(url)) {
      const result = await buildMapActionsPayload(url);
      const payload = filterPublicMapResponse(result.body);
      return NextResponse.json(
        payload,
        payload.partialSource
          ? {
              headers: {
                "X-Data-Warning": "Partial source data",
              },
            }
          : undefined,
      );
    }

    const snapshot = await loadOrRefreshPublicSurfaceSnapshot({
      snapshotKey: buildMapActionsSnapshotKey(url),
      title: "Actions cartographiques",
      version: MAP_ACTIONS_SNAPSHOT_VERSION,
      ttlMinutes: MAP_ACTIONS_SNAPSHOT_TTL_MINUTES,
      buildPayload: async () => (await buildMapActionsPayload(url)).body,
      meta: {
        route: "api/actions/map",
      },
    });

    const payload = filterPublicMapResponse(snapshot.payload);
    return NextResponse.json(
      payload,
      payload.partialSource
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
