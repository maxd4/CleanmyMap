import { createHash } from "node:crypto";
import {
  buildDateFloor,
  resolveReportQuery,
} from "@/lib/reports/csv";
import { buildDeliverableHeaders } from "@/lib/reports/http";
import { filterActionContractsByScope } from "@/lib/reports/scope";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  fetchUnifiedActionContracts,
  parseEntityTypesParam,
} from "@/lib/actions/unified-source";

export const runtime = "nodejs";

const ACTIONS_JSON_BUCKET = "reports";
const ACTIONS_JSON_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;
const ACTIONS_JSON_RESPONSE_CACHE_CONTROL =
  "private, max-age=300, stale-while-revalidate=86400";

function buildActionsJsonCachePath(params: {
  cacheDay: string;
  query: ReturnType<typeof resolveReportQuery>;
  types: string[] | null;
}): string {
  const cacheKey = createHash("sha1")
    .update(
      JSON.stringify({
        cacheDay: params.cacheDay,
        days: params.query.days,
        limit: params.query.limit,
        status: params.query.status,
        scopeKind: params.query.scopeKind,
        scopeValue: params.query.scopeValue,
        association: params.query.association,
        types: params.types ? [...params.types].sort() : null,
      }),
    )
    .digest("hex")
    .slice(0, 16);

  return `actions-json/${params.cacheDay}/${cacheKey}.json`;
}

async function createJsonRedirect(params: {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  path: string;
  filename: string;
}): Promise<Response | null> {
  const { data, error } = await params.supabase.storage
    .from(ACTIONS_JSON_BUCKET)
    .createSignedUrl(params.path, ACTIONS_JSON_SIGNED_URL_TTL_SECONDS, {
      download: params.filename,
    });

  if (error || !data?.signedUrl) {
    return null;
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: data.signedUrl,
      "Cache-Control": ACTIONS_JSON_RESPONSE_CACHE_CONTROL,
    },
  });
}

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  const url = new URL(request.url);
  const query = resolveReportQuery(url);
  const floorDate = buildDateFloor(query.days);
  const types = parseEntityTypesParam(url.searchParams.get("types"));
  const exportDate = new Date();
  const cacheDay = exportDate.toISOString().slice(0, 10);
  const { filename: jsonFilename, headers: responseHeaders } =
    buildDeliverableHeaders({
      rubrique: "export_actions",
      extension: "json",
      contentType: "application/json; charset=utf-8",
      date: exportDate,
      cacheControl: ACTIONS_JSON_RESPONSE_CACHE_CONTROL,
    });
  const cachedJsonPath = buildActionsJsonCachePath({
    cacheDay,
    query,
    types,
  });
  const supabase = getSupabaseServerClient();

  try {
    const cachedRedirect = await createJsonRedirect({
      supabase,
      path: cachedJsonPath,
      filename: jsonFilename,
    });

    if (cachedRedirect) {
      return cachedRedirect;
    }

    const { items: contracts, isTruncated, sourceHealth } =
      await fetchUnifiedActionContracts(supabase, {
        limit: Math.min(Math.max(query.limit * 2, query.limit), 1000),
        status: query.status,
        floorDate,
        requireCoordinates: false,
        types,
      });

    const filteredContracts = filterActionContractsByScope(contracts, {
      kind: query.scopeKind,
      value:
        query.scopeKind === "association"
          ? query.scopeValue ?? query.association
          : query.scopeValue,
    });

    const enrichedItems = filteredContracts.map((contract) => ({
      id: contract.id,
      created_at: contract.dates.createdAt,
      action_date: contract.dates.observedAt,
      actor_name: contract.metadata.actorName,
      association_name: contract.metadata.associationName,
      location_label: contract.location.label,
      latitude: contract.location.latitude,
      longitude: contract.location.longitude,
      waste_kg: contract.metadata.wasteKg,
      cigarette_butts: contract.metadata.cigaretteButts,
      volunteers_count: contract.metadata.volunteersCount,
      duration_minutes: contract.metadata.durationMinutes,
      status: contract.status,
      notes: contract.metadata.notes,
      notes_plain: contract.metadata.notesPlain,
      geometry_kind: contract.geometry.kind,
      geometry_geojson: contract.geometry.geojson,
      geometry_confidence: contract.geometry.confidence,
      contract,
      manual_drawing: contract.metadata.manualDrawing,
      manual_drawing_coordinates_json: contract.metadata.manualDrawing
        ? JSON.stringify(contract.metadata.manualDrawing)
        : null,
      manual_drawing_geojson: contract.metadata.manualDrawing
        ? JSON.stringify(
            contract.metadata.manualDrawing.kind === "polyline"
              ? {
                  type: "LineString",
                  coordinates: contract.metadata.manualDrawing.coordinates.map(
                    ([lat, lng]) => [lng, lat],
                  ),
                }
              : {
                  type: "Polygon",
                  coordinates: [
                    contract.metadata.manualDrawing.coordinates.map(
                      ([lat, lng]) => [lng, lat],
                    ),
                  ],
                },
          )
        : null,
    }));

    const payload = {
      exportedAt: exportDate.toISOString(),
      query,
      count: enrichedItems.length,
      isTruncated,
      sourceHealth,
      items: enrichedItems,
    };
    const json = `${JSON.stringify(payload, null, 2)}\n`;
    const uploadResult = await supabase.storage
      .from(ACTIONS_JSON_BUCKET)
      .upload(cachedJsonPath, new Blob([json], { type: "application/json;charset=utf-8" }), {
        upsert: true,
        cacheControl: "3600",
      });

    if (!uploadResult.error) {
      const signedRedirect = await createJsonRedirect({
        supabase,
        path: cachedJsonPath,
        filename: jsonFilename,
      });

      if (signedRedirect) {
        return signedRedirect;
      }
    }

    const headers: Record<string, string> = { ...responseHeaders };
    if (isTruncated) {
      headers["X-Export-Warning"] = "Dataset truncated to limit";
    }
    if (sourceHealth.partial) {
      headers["X-Data-Warning"] = sourceHealth.warnings.join(" |");
    }

    return new Response(json, {
      status: 200,
      headers,
    });
  } catch {
    return new Response("Export unavailable", { status: 500 });
  }
}
