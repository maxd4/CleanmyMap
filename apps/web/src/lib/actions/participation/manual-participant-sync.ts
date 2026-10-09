import type { SupabaseClient } from "@supabase/supabase-js";
type ManualParticipant = { userId: string };

export async function persistManualParticipantDiff(params: {
  supabase: SupabaseClient;
  actionId: string;
  currentRegistrationIds: string[];
  currentManualRegistrationIds: string[];
  participants: ManualParticipant[];
}): Promise<void> {
  const targetParticipantIds = new Set(
    params.participants.map((participant) => participant.userId),
  );
  const idsToRemove = params.currentManualRegistrationIds.filter(
    (participantId) => !targetParticipantIds.has(participantId),
  );

  if (idsToRemove.length > 0) {
    const deleteResult = await params.supabase
      .from("action_registrations")
      .delete()
      .eq("action_id", params.actionId)
      .eq("registration_source", "manual_add")
      .in("user_id", idsToRemove);

    if (deleteResult.error) {
      throw new Error(deleteResult.error.message);
    }
  }

  const idsToInsert = params.participants.filter(
    (participant) => !params.currentRegistrationIds.includes(participant.userId),
  );
  if (idsToInsert.length === 0) return;

  const joinedAt = new Date().toISOString();
  const reactivated = await Promise.all(
    idsToInsert.map(async (participant) => {
      const result = await params.supabase
        .from("action_registrations")
        .update({
          registered_at: joinedAt,
          registration_status: "pending",
          registration_source: "manual_add",
        })
        .eq("action_id", params.actionId)
        .eq("user_id", participant.userId)
        .eq("registration_source", "manual_add")
        .eq("registration_status", "cancelled")
        .select("id");
      if (result.error) throw new Error(result.error.message);
      return (result.data ?? []).length > 0;
    }),
  );
  const idsStillToInsert = idsToInsert.filter((_, index) => !reactivated[index]);
  if (idsStillToInsert.length === 0) return;
  const insertResult = await params.supabase
    .from("action_registrations")
    .insert(
      idsStillToInsert.map((participant) => ({
        action_id: params.actionId,
        user_id: participant.userId,
        registered_at: joinedAt,
        registration_status: "pending" as const,
        registration_source: "manual_add" as const,
      })),
    );

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }
}
