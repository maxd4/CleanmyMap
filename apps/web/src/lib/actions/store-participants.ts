import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ResolvedActionOrganizer,
  ResolvedActionParticipant,
} from "@/lib/actions/participation/organizers";
import type {
  ActionRegistrationSource,
  ActionRegistrationStatus,
} from "@/lib/actions/participation/registration-records";

type ActionRegistrationInsertRow = {
  action_id: string;
  user_id: string;
  registered_at: string;
  registration_status: ActionRegistrationStatus;
  registration_source: ActionRegistrationSource;
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

export function buildInitialActionRegistrationRows(params: {
  actionId: string;
  creatorUserId: string;
  organizers: ResolvedActionOrganizer[];
  manualParticipants?: ResolvedActionParticipant[];
  registrationSource?: ActionRegistrationSource;
}): ActionRegistrationInsertRow[] {
  const registeredAt = new Date().toISOString();
  const source = params.registrationSource ?? "group_form";
  const rows: ActionRegistrationInsertRow[] = [];
  const seenUserIds = new Set<string>();

  for (const organizer of params.organizers) {
    if (seenUserIds.has(organizer.userId)) {
      continue;
    }
    seenUserIds.add(organizer.userId);
    rows.push({
      action_id: params.actionId,
      user_id: organizer.userId,
      registered_at: registeredAt,
      registration_status: "confirmed",
      registration_source: source,
    });
  }

  if (!seenUserIds.has(params.creatorUserId)) {
    seenUserIds.add(params.creatorUserId);
    rows.push({
      action_id: params.actionId,
      user_id: params.creatorUserId,
      registered_at: registeredAt,
      registration_status: "pending",
      registration_source: source,
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
      registered_at: registeredAt,
      registration_status: "confirmed",
      registration_source: "manual_add",
    });
  }

  return rows;
}

export async function insertActionRegistrations(
  supabase: SupabaseClient,
  actionId: string,
  rows: ActionRegistrationInsertRow[],
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const registrationsInserted = await supabase
    .from("action_registrations")
    .insert(rows);

  if (registrationsInserted.error) {
    await supabase.from("action_organizers").delete().eq("action_id", actionId);
    await supabase.from("actions").delete().eq("id", actionId);
    throw registrationsInserted.error;
  }
}
