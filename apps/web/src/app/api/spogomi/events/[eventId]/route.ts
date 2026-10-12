import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventForOrganizer, updateSpogomiEvent } from "@/lib/spogomi/preparation-service";
import { isCachanTicketCompositionEligible } from "@/lib/spogomi/ticket-reconciliation";

export const runtime = "nodejs";
// Justification Vercel: event metadata and permissions are mutable and must be resolved dynamically.
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
      supabase.from("spogomi_participants").select("id, display_name, external_reference, order_reference, identity_status, group_preference, source_row_number, team_id, attendance_status, registration_status, account_link_status, source_system, ticket_status, ticket_deleted").eq("event_id", event.id).order("source_row_number"),
      supabase.from("spogomi_teams").select("id, team_number, public_name, composition_state").eq("event_id", event.id).order("team_number"),
      supabase.from("spogomi_event_routes").select("source, file_name, point_count, reference_distance_km, inferred_topology, geometry_geojson").eq("event_id", event.id).maybeSingle(),
    ]);
    if (participants.error) throw participants.error;
    if (teams.error) throw teams.error;
    if (route.error) throw route.error;
    const organizerParticipants = (participants.data ?? []).map((participant) => ({
      ...participant,
      composition_eligible: isCachanTicketCompositionEligible({
        sourceSystem: participant.source_system,
        ticketStatus: participant.ticket_status,
        ticketDeleted: Boolean(participant.ticket_deleted),
        registrationStatus: String(participant.registration_status),
      }),
    }));
    return NextResponse.json({ event, participants: organizerParticipants, teams: teams.data ?? [], route: route.data ?? null });
  } catch (error) {
    return handleApiError(error, "spogomi.event.read");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const supabase = getSupabaseServerClient(true);
    const event = await loadSpogomiEventForOrganizer(supabase, (await context.params).eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    const updated = await updateSpogomiEvent({
      supabase,
      event,
      input: {
        name: typeof body.name === "string" ? body.name : undefined,
        locationLabel: typeof body.locationLabel === "string" ? body.locationLabel : undefined,
        startsAt: typeof body.startsAt === "string" ? body.startsAt : undefined,
        endsAt: body.endsAt === null || typeof body.endsAt === "string" ? body.endsAt : undefined,
        mode: body.mode === "casual" || body.mode === "world_cup" ? body.mode : undefined,
        casualTeamSize: body.casualTeamSize === null || typeof body.casualTeamSize === "number" ? body.casualTeamSize : undefined,
        publicVisibility: body.publicVisibility === "private" || body.publicVisibility === "published" ? body.publicVisibility : undefined,
        publicResultsVisibility: body.publicResultsVisibility === "hidden" || body.publicResultsVisibility === "provisional" || body.publicResultsVisibility === "certified" ? body.publicResultsVisibility : undefined,
      },
    });
    return NextResponse.json({ event: updated });
  } catch (error) {
    return handleApiError(error, "spogomi.event.update");
  }
}
