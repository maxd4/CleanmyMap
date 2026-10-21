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

function resolveAttendanceTeamFilter(teams: AttendanceTeamRow[], divisionId: string | null | undefined, search: string | null): { teamIds: string[] | null; numericTeam: number | null; namedTeamIds: string[] } {
  const selectedTeams = divisionId ? teams.filter((team) => team.division_id === divisionId) : teams;
  const numericTeam = search && /^\d+$/.test(search) ? Number(search) : null;
  const teamIds = numericTeam === null ? null : selectedTeams.filter((team) => team.team_number === numericTeam).map((team) => team.id);
  const namedTeamIds = search && numericTeam === null ? selectedTeams.filter((team) => team.public_name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map((team) => team.id) : [];
  return { teamIds, numericTeam, namedTeamIds };
}

function buildAttendanceParticipantsQuery(params: { supabase: SupabaseClient; eventId: string; divisionId?: string | null; search: string | null; teamFilter: ReturnType<typeof resolveAttendanceTeamFilter>; page: number; pageSize: number }) {
  const { supabase, eventId, divisionId, search, teamFilter, page, pageSize } = params;
  let query = supabase.from("spogomi_participants").select("id, division_id, display_name, external_reference, source_row_number, team_id, attendance_status, registration_status, updated_at", { count: "exact" }).eq("event_id", eventId);
  if (divisionId) query = query.eq("division_id", divisionId);
  if (teamFilter.teamIds) query = teamFilter.teamIds.length ? query.or(`source_row_number.eq.${teamFilter.numericTeam},team_id.in.(${teamFilter.teamIds.join(",")})`) : query.eq("source_row_number", teamFilter.numericTeam);
  if (search && teamFilter.numericTeam === null) {
    const teamClause = teamFilter.namedTeamIds.length ? `,team_id.in.(${teamFilter.namedTeamIds.join(",")})` : "";
    query = query.or(`display_name.ilike.%${search}%,external_reference.ilike.%${search}%${teamClause}`);
  }
  const from = page * pageSize;
  return query.order("source_row_number", { ascending: true, nullsFirst: false }).order("id", { ascending: true }).range(from, from + pageSize - 1);
}

function mapAttendanceParticipant(participant: AttendanceParticipantRow, teamById: Map<string, AttendanceTeamRow>) {
  const team = participant.team_id ? teamById.get(participant.team_id) : undefined;
  return { id: participant.id, divisionId: participant.division_id, displayName: participant.display_name, externalReference: participant.external_reference, place: participant.source_row_number, team: team ? { id: team.id, number: team.team_number, publicName: team.public_name } : null, attendanceStatus: participant.attendance_status, registrationStatus: participant.registration_status, updatedAt: participant.updated_at };
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
  const teamFilter = resolveAttendanceTeamFilter(teams, params.divisionId, search);
  const participantsResult = await buildAttendanceParticipantsQuery({ supabase: params.supabase, eventId: params.eventId, divisionId: params.divisionId, search, teamFilter, page, pageSize });
  if (participantsResult.error) throw participantsResult.error;
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const participants = (participantsResult.data ?? [] as AttendanceParticipantRow[]).map((participant) => mapAttendanceParticipant(participant as AttendanceParticipantRow, teamById));
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
