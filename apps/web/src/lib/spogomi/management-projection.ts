import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isCachanTicketCompositionEligible } from "./ticket-reconciliation";
import type { EventRow } from "./preparation-service";

/**
 * Organizer-only projection. The caller must have already passed the canonical
 * event-management guard; this projection intentionally contains roster data.
 */
export async function loadSpogomiManagementProjection(params: {
  supabase: SupabaseClient;
  event: EventRow;
  divisionId?: string | null;
}) {
  const { supabase, event, divisionId } = params;
  const divisions = await supabase
    .from("spogomi_divisions")
    .select("id, event_id, division_type, division_key")
    .eq("event_id", event.id)
    .order("division_type");
  if (divisions.error) throw divisions.error;

  let participantsQuery = supabase
    .from("spogomi_participants")
    .select("id, division_id, display_name, external_reference, order_reference, identity_status, group_preference, source_row_number, team_id, attendance_status, registration_status, account_link_status, source_system, ticket_status, ticket_deleted")
    .eq("event_id", event.id)
    .order("source_row_number");
  let teamsQuery = supabase
    .from("spogomi_teams")
    .select("id, division_id, team_number, public_name, composition_state")
    .eq("event_id", event.id)
    .order("team_number");
  if (divisionId) {
    participantsQuery = participantsQuery.eq("division_id", divisionId);
    teamsQuery = teamsQuery.eq("division_id", divisionId);
  }

  const [participants, teams, route] = await Promise.all([
    participantsQuery,
    teamsQuery,
    supabase
      .from("spogomi_event_routes")
      .select("source, file_name, point_count, reference_distance_km, inferred_topology, geometry_geojson")
      .eq("event_id", event.id)
      .maybeSingle(),
  ]);
  if (participants.error) throw participants.error;
  if (teams.error) throw teams.error;
  if (route.error) throw route.error;

  return {
    event,
    divisions: divisions.data ?? [],
    participants: (participants.data ?? []).map((participant) => ({
      ...participant,
      composition_eligible: isCachanTicketCompositionEligible({
        sourceSystem: participant.source_system,
        ticketStatus: participant.ticket_status,
        ticketDeleted: Boolean(participant.ticket_deleted),
        registrationStatus: String(participant.registration_status),
      }),
    })),
    teams: teams.data ?? [],
    route: route.data ?? null,
  };
}
