import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionAttendanceEntryRow } from "@/types/database";

export type AttendanceRegistryOperation = "add" | "rename" | "delete" | "link" | "mark";

export type AttendanceRegistryMutation = {
  actionId: string;
  actorClerkId: string;
  requestId: string;
  operation: AttendanceRegistryOperation;
  entryId?: string | null;
  expectedRevision?: number | null;
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
