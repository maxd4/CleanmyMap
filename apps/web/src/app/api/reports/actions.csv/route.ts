import {
  buildActionsCsv,
  buildActionsCsvFilename,
  buildDateFloor,
  resolveReportQuery,
} from "@/lib/reports/csv";
import { filterActionContractsByScope } from "@/lib/reports/scope";
import { requireAdminAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  fetchUnifiedActionContracts,
  parseEntityTypesParam,
} from "@/lib/actions/unified-source";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  const url = new URL(request.url);
  const query = resolveReportQuery(url);
  const floorDate = buildDateFloor(query.days);
  const types = parseEntityTypesParam(url.searchParams.get("types"));

  try {
    const supabase = getSupabaseServerClient();
    const { items: contracts, isTruncated, sourceHealth } =
      await fetchUnifiedActionContracts(
      supabase,
      {
        limit: Math.max(query.limit * 4, query.limit),
        status: query.status,
        floorDate,
        requireCoordinates: false,
        types,
      },
    );
    const filteredContracts = filterActionContractsByScope(contracts, {
      kind: query.scopeKind,
      value:
        query.scopeKind === "association"
          ? query.scopeValue ?? query.association
          : query.scopeValue,
    });
    const rows = filteredContracts.map((contract) => ({
      id: contract.id,
      created_at: contract.dates.createdAt ?? "",
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
      record_type: contract.type,
      source: contract.source,
      observed_at: contract.dates.observedAt,
      geometry_kind: contract.geometry.kind,
      geometry_geojson: contract.geometry.geojson,
      manual_drawing_kind: contract.metadata.manualDrawing?.kind ?? null,
      manual_drawing_points:
        contract.metadata.manualDrawing?.coordinates.length ?? null,
      manual_drawing_coordinates_json: contract.metadata.manualDrawing
        ? JSON.stringify(contract.metadata.manualDrawing)
        : null,
      manual_drawing_geojson: contract.geometry.geojson,
    }));

    const csv = buildActionsCsv(rows);
    const filename = buildActionsCsvFilename();
    const withBom = `\uFEFF${csv}`;

    const headers: Record<string, string> = {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    };
    if (isTruncated) {
      headers["X-Export-Warning"] = "Dataset truncated to limit";
    }
    if (sourceHealth.partial) {
      headers["X-Data-Warning"] = sourceHealth.warnings.join(" | ");
    }

    return new Response(withBom, {
      status: 200,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(`Export error: ${message}`, { status: 500 });
  }
}
