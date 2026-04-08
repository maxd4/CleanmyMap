import {
  buildActionsCsv,
  buildActionsCsvFilename,
  buildDateFloor,
  resolveReportQuery,
} from "@/lib/reports/csv";
import { requireAdminAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { parseDrawingFromNotes, toGeoJsonString } from "@/lib/actions/drawing";
import { buildActionDataContract } from "@/lib/actions/data-contract";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return new Response(access.error, { status: access.status });
  }

  const url = new URL(request.url);
  const query = resolveReportQuery(url);
  const floorDate = buildDateFloor(query.days);

  try {
    const supabase = getSupabaseServerClient();
    let builder = supabase
      .from("actions")
      .select(
        "id, created_at, action_date, actor_name, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, status, notes",
      )
      .gte("action_date", floorDate)
      .order("action_date", { ascending: false })
      .limit(query.limit);

    if (query.status) {
      builder = builder.eq("status", query.status);
    }

    const { data, error } = await builder;
    if (error) {
      return new Response(`Export error: ${error.message}`, { status: 500 });
    }

    const rows = (data ?? []).map((item) => {
      const parsedNotes = parseDrawingFromNotes(item.notes);
      const contract = buildActionDataContract({
        id: String(item.id),
        type: "action",
        status: item.status,
        source: "actions",
        observedAt: item.action_date,
        createdAt: item.created_at,
        locationLabel: item.location_label,
        latitude: item.latitude === null ? null : Number(item.latitude),
        longitude: item.longitude === null ? null : Number(item.longitude),
        wasteKg: Number(item.waste_kg ?? 0),
        cigaretteButts: Number(item.cigarette_butts ?? 0),
        volunteersCount: Number(item.volunteers_count ?? 0),
        durationMinutes: Number(item.duration_minutes ?? 0),
        actorName: item.actor_name,
        notes: item.notes,
        notesPlain: parsedNotes.cleanNotes,
        manualDrawing: parsedNotes.manualDrawing,
        manualDrawingGeoJson: toGeoJsonString(parsedNotes.manualDrawing),
      });
      return {
        id: contract.id,
        created_at: contract.dates.createdAt ?? "",
        action_date: contract.dates.observedAt,
        actor_name: contract.metadata.actorName,
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
        manual_drawing_points: contract.metadata.manualDrawing?.coordinates.length ?? null,
        manual_drawing_coordinates_json: parsedNotes.drawingJson,
        manual_drawing_geojson: contract.geometry.geojson,
      };
    });

    const csv = buildActionsCsv(rows);
    const filename = buildActionsCsvFilename();
    const withBom = `\uFEFF${csv}`;

    return new Response(withBom, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(`Export error: ${message}`, { status: 500 });
  }
}
