import { auth } from "@clerk/nextjs/server";
import {
  buildActionsCsv,
  buildActionsCsvFilename,
  buildDateFloor,
  resolveReportQuery,
} from "@/lib/reports/csv";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
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

    const rows = (data ?? []).map((item) => ({
      ...item,
      waste_kg: Number(item.waste_kg ?? 0),
      cigarette_butts: Number(item.cigarette_butts ?? 0),
      volunteers_count: Number(item.volunteers_count ?? 0),
      duration_minutes: Number(item.duration_minutes ?? 0),
      latitude: item.latitude === null ? null : Number(item.latitude),
      longitude: item.longitude === null ? null : Number(item.longitude),
    }));

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
