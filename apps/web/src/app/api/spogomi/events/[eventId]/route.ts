import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventForOrganizer } from "@/lib/spogomi/preparation-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const event = await loadSpogomiEventForOrganizer(getSupabaseServerClient(true), (await context.params).eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    const supabase = getSupabaseServerClient(true);
    const [participants, teams, route] = await Promise.all([
      supabase.from("spogomi_participants").select("id, display_name, group_preference, source_row_number, team_id, attendance_status, registration_status").eq("event_id", event.id).order("source_row_number"),
      supabase.from("spogomi_teams").select("id, team_number, public_name, composition_state").eq("event_id", event.id).order("team_number"),
      supabase.from("spogomi_event_routes").select("source, file_name, point_count, reference_distance_km, inferred_topology, geometry_geojson").eq("event_id", event.id).maybeSingle(),
    ]);
    if (participants.error) throw participants.error;
    if (teams.error) throw teams.error;
    if (route.error) throw route.error;
    return NextResponse.json({ event, participants: participants.data ?? [], teams: teams.data ?? [], route: route.data ?? null });
  } catch (error) {
    return handleApiError(error, "spogomi.event.read");
  }
}
