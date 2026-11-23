import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionAttendanceEntryRow, ActionAttendanceTeamRow, ActionAttendanceTeamSnapshot } from "@/types/database";

export type AttendanceRegistryOperation = "add" | "rename" | "delete" | "link" | "mark";
export type AttendanceTeamOperation = "team_create" | "team_rename" | "team_delete" | "member_assign" | "leader_set";

export type AttendanceRegistryMutation = {
  actionId: string;
  actorClerkId: string;
  requestId: string;
  operation: AttendanceRegistryOperation;
  entryId?: string | null;
  expectedRevision?: number | null;
  payload?: Record<string, string | null>;
};

export type AttendanceTeamMutation = {
  actionId: string;
  actorClerkId: string;
  requestId: string;
  operation: AttendanceTeamOperation;
  teamId?: string | null;
  entryId?: string | null;
  targetTeamId?: string | null;
  expectedRevisions?: Array<{ teamId: string; revision: number }>;
  payload?: Record<string, string | null>;
};

export async function listActionAttendanceEntries(
  supabase: SupabaseClient,
  actionId: string,
): Promise<ActionAttendanceEntryRow[]> {
  const result = await supabase
    .from("action_attendance_entries")
    .select("id, action_id, display_label, clerk_user_id, provenance, attendance_status, observed_at, created_by, created_at, updated_at, updated_by, revision, deleted_at, deleted_by")
    .eq("action_id", actionId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as ActionAttendanceEntryRow[];
}

export async function mutateActionAttendanceEntry(
  supabase: SupabaseClient,
  mutation: AttendanceRegistryMutation,
): Promise<ActionAttendanceEntryRow> {
  const result = await supabase.rpc("mutate_action_attendance_entry", {
    p_action_id: mutation.actionId,
    p_actor_clerk_id: mutation.actorClerkId,
    p_request_id: mutation.requestId,
    p_operation: mutation.operation,
    p_entry_id: mutation.entryId ?? null,
    p_expected_revision: mutation.expectedRevision ?? null,
    p_payload: mutation.payload ?? {},
  });
  if (result.error) {
    const error = new Error(result.error.message);
    if ("code" in result.error) Object.assign(error, { code: result.error.code });
    throw error;
  }
  if (!result.data || typeof result.data !== "object") throw new Error("Attendance registry returned an invalid result.");
  return result.data as ActionAttendanceEntryRow;
}

export async function listActionAttendanceTeams(
  supabase: SupabaseClient,
  actionId: string,
): Promise<ActionAttendanceTeamSnapshot[]> {
  const [teamsResult, membersResult] = await Promise.all([
    supabase.from("action_attendance_teams")
      .select("id, action_id, name, normalized_name, leader_entry_id, revision, created_by, created_at, updated_by, updated_at")
      .eq("action_id", actionId).order("created_at", { ascending: true }).order("id", { ascending: true }),
    supabase.from("action_attendance_team_members")
      .select("action_id, entry_id, team_id")
      .eq("action_id", actionId),
  ]);
  if (teamsResult.error) throw new Error(teamsResult.error.message);
  if (membersResult.error) throw new Error(membersResult.error.message);
  const memberships = new Map<string, string[]>();
  for (const member of membersResult.data ?? []) {
    const current = memberships.get(member.team_id) ?? [];
    current.push(member.entry_id);
    memberships.set(member.team_id, current);
  }
  return ((teamsResult.data ?? []) as ActionAttendanceTeamRow[]).map((team) => ({
    ...team,
    member_entry_ids: memberships.get(team.id) ?? [],
  }));
}

export async function mutateActionAttendanceTeam(
  supabase: SupabaseClient,
  mutation: AttendanceTeamMutation,
): Promise<Record<string, unknown>> {
  const result = await supabase.rpc("mutate_action_attendance_team", {
    p_action_id: mutation.actionId,
    p_actor_clerk_id: mutation.actorClerkId,
    p_request_id: mutation.requestId,
    p_operation: mutation.operation,
    p_team_id: mutation.teamId ?? null,
    p_entry_id: mutation.entryId ?? null,
    p_target_team_id: mutation.targetTeamId ?? null,
    p_expected_revisions: mutation.expectedRevisions ?? [],
    p_payload: mutation.payload ?? {},
  });
  if (result.error) {
    const error = new Error(result.error.message);
    if ("code" in result.error) Object.assign(error, { code: result.error.code });
    throw error;
  }
  if (!result.data || typeof result.data !== "object") throw new Error("Attendance team mutation returned an invalid result.");
  return result.data as Record<string, unknown>;
}
