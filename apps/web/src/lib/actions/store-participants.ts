import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ResolvedActionOrganizer,
  ResolvedActionParticipant,
} from "@/lib/actions/participation/organizers";

type ActionParticipantInsertRow = {
  action_id: string;
  user_id: string;
  joined_at: string;
  participation_status: "pending" | "confirmed";
  participation_source:
    | "group_form"
    | "manual_add"
    | "admin"
    | "admin_override"
    | "import";
};

export async function insertActionOrganizers(
  supabase: SupabaseClient,
  actionId: string,
  organizers: ResolvedActionOrganizer[],
): Promise<void> {
  if (organizers.length === 0) {
    throw new Error("At least one organizer is required for action creation.");
  }

  const organizerRows = organizers.map((organizer, index) => ({
    action_id: actionId,
    organizer_clerk_id: organizer.userId,
    organizer_label: organizer.displayName,
    organizer_handle: organizer.handle,
    is_primary: organizer.isPrimary || index === 0,
  }));

  const organizersInserted = await supabase
    .from("action_organizers")
    .insert(organizerRows);

  if (organizersInserted.error) {
    await supabase.from("actions").delete().eq("id", actionId);
    throw organizersInserted.error;
  }
}

export function buildInitialActionParticipantRows(params: {
  actionId: string;
  creatorUserId: string;
  organizers: ResolvedActionOrganizer[];
  manualParticipants?: ResolvedActionParticipant[];
  participationSource?: ActionParticipantInsertRow["participation_source"];
}): ActionParticipantInsertRow[] {
  const joinedAt = new Date().toISOString();
  const source = params.participationSource ?? "group_form";
  const rows: ActionParticipantInsertRow[] = [];
  const seenUserIds = new Set<string>();

  for (const organizer of params.organizers) {
    if (seenUserIds.has(organizer.userId)) {
      continue;
    }
    seenUserIds.add(organizer.userId);
    rows.push({
      action_id: params.actionId,
      user_id: organizer.userId,
      joined_at: joinedAt,
      participation_status: "confirmed",
      participation_source: source,
    });
  }

  if (!seenUserIds.has(params.creatorUserId)) {
    seenUserIds.add(params.creatorUserId);
    rows.push({
      action_id: params.actionId,
      user_id: params.creatorUserId,
      joined_at: joinedAt,
      participation_status: "pending",
      participation_source: source,
    });
  }

  for (const participant of params.manualParticipants ?? []) {
    if (seenUserIds.has(participant.userId)) {
      continue;
    }
    seenUserIds.add(participant.userId);
    rows.push({
      action_id: params.actionId,
      user_id: participant.userId,
      joined_at: joinedAt,
      participation_status: "confirmed",
      participation_source: "manual_add",
    });
  }

  return rows;
}

export async function insertActionParticipants(
  supabase: SupabaseClient,
  actionId: string,
  rows: ActionParticipantInsertRow[],
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const participantsInserted = await supabase
    .from("action_participants")
    .insert(rows);

  if (participantsInserted.error) {
    await supabase.from("action_organizers").delete().eq("action_id", actionId);
    await supabase.from("actions").delete().eq("id", actionId);
    throw participantsInserted.error;
  }
}
