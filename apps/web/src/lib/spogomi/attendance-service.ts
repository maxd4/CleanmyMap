import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSpogomiCapability, resolveSpogomiEventAccess } from "./authorization";

export type SpogomiAttendanceStatus = "unknown" | "present" | "absent";

type AttendanceParticipantRow = {
  id: string;
  division_id: string;
  display_name: string | null;
  external_reference: string | null;
  source_row_number: number | null;
  team_id: string | null;
  attendance_status: SpogomiAttendanceStatus;
  registration_status: "registered" | "withdrawn";
  updated_at: string;
};

type AttendanceTeamRow = { id: string; division_id: string; team_number: number; public_name: string };

function safeSearchTerm(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/[(),]/g, " ").replace(/\s+/g, " ").slice(0, 80) ?? "";
  return normalized.length ? normalized : null;
}

export async function loadSpogomiAttendanceProjection(params: {
  supabase: SupabaseClient;
  eventId: string;
  userId: string;
  divisionId?: string | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
}) {
  const access = await resolveSpogomiEventAccess({ supabase: params.supabase, eventId: params.eventId, userId: params.userId });
  if (!access || !hasSpogomiCapability(access, "checkin")) return false as const;

  const pageSize = Math.min(Math.max(Math.trunc(params.pageSize ?? 25), 1), 100);
  const page = Math.max(Math.trunc(params.page ?? 0), 0);
  const search = safeSearchTerm(params.search);
  const teamsResult = await params.supabase
    .from("spogomi_teams")
    .select("id, division_id, team_number, public_name")
    .eq("event_id", params.eventId)
    .order("team_number", { ascending: true });
  if (teamsResult.error) throw teamsResult.error;
  const teams = (teamsResult.data ?? []) as AttendanceTeamRow[];
  const selectedTeams = params.divisionId ? teams.filter((team) => team.division_id === params.divisionId) : teams;
  const numericTeam = search && /^\d+$/.test(search) ? Number(search) : null;
  const teamIds = numericTeam === null
    ? null
    : selectedTeams.filter((team) => team.team_number === numericTeam).map((team) => team.id);
  const namedTeamIds = search && numericTeam === null
    ? selectedTeams.filter((team) => team.public_name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map((team) => team.id)
    : [];

  let participantsQuery = params.supabase
    .from("spogomi_participants")
    .select("id, division_id, display_name, external_reference, source_row_number, team_id, attendance_status, registration_status, updated_at", { count: "exact" })
    .eq("event_id", params.eventId);
  if (params.divisionId) participantsQuery = participantsQuery.eq("division_id", params.divisionId);
  if (teamIds) {
    participantsQuery = teamIds.length
      ? participantsQuery.or(`source_row_number.eq.${numericTeam},team_id.in.(${teamIds.join(",")})`)
      : participantsQuery.eq("source_row_number", numericTeam);
  }
  if (search && numericTeam === null) {
    const teamClause = namedTeamIds.length ? `,team_id.in.(${namedTeamIds.join(",")})` : "";
    participantsQuery = participantsQuery.or(`display_name.ilike.%${search}%,external_reference.ilike.%${search}%${teamClause}`);
  }
  const from = page * pageSize;
  const participantsResult = await participantsQuery.order("source_row_number", { ascending: true, nullsFirst: false }).order("id", { ascending: true }).range(from, from + pageSize - 1);
  if (participantsResult.error) throw participantsResult.error;
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const participants = (participantsResult.data ?? [] as AttendanceParticipantRow[]).map((participant) => {
    const row = participant as AttendanceParticipantRow;
    const team = row.team_id ? teamById.get(row.team_id) : undefined;
    return {
      id: row.id,
      divisionId: row.division_id,
      displayName: row.display_name,
      externalReference: row.external_reference,
      place: row.source_row_number,
      team: team ? { id: team.id, number: team.team_number, publicName: team.public_name } : null,
      attendanceStatus: row.attendance_status,
      registrationStatus: row.registration_status,
      updatedAt: row.updated_at,
    };
  });
  return {
    eventId: params.eventId,
    divisionId: params.divisionId ?? null,
    page,
    pageSize,
    total: participantsResult.count ?? 0,
    participants,
  };
}

export async function setSpogomiAttendanceStatus(params: {
  supabase: SupabaseClient;
  eventId: string;
  divisionId: string;
  participantId: string;
  status: SpogomiAttendanceStatus;
  actorClerkId: string;
  reason: string;
  provenance: string;
  expectedUpdatedAt?: string | null;
}) {
  const result = await params.supabase.rpc("spogomi_set_attendance_status", {
    p_event_id: params.eventId,
    p_division_id: params.divisionId,
    p_participant_id: params.participantId,
    p_next_status: params.status,
    p_actor_clerk_id: params.actorClerkId,
    p_reason: params.reason.trim(),
    p_provenance: params.provenance.trim(),
    p_expected_updated_at: params.expectedUpdatedAt ?? null,
  });
  if (result.error) throw result.error;
  return result.data;
}
