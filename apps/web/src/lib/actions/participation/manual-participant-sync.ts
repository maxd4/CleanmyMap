import type { SupabaseClient } from "@supabase/supabase-js";
type ManualParticipant = { userId: string };

export class ManualParticipantSyncValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManualParticipantSyncValidationError";
  }
}

export async function persistManualParticipantDiff(params: {
  supabase: SupabaseClient;
  actionId: string;
  participants: ManualParticipant[];
}): Promise<void> {
  const result = await params.supabase.rpc("sync_action_manual_participants", {
    p_action_id: params.actionId,
    p_participant_user_ids: params.participants.map((participant) => participant.userId),
  });

  if (!result.error) return;

  if (result.error.code === "P0001" && result.error.message.includes("rejected by recipient")) {
    throw new ManualParticipantSyncValidationError(
      "Cette invitation a été refusée par son destinataire et ne peut pas être renvoyée depuis une sauvegarde ordinaire.",
    );
  }

  throw new Error(result.error.message);
}
