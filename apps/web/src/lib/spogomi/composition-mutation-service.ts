import type { SupabaseClient } from "@supabase/supabase-js";

type EventForCompositionMutation = {
  id: string;
  composition_revision?: number;
};

export class SpogomiCompositionProtectionError extends Error {
  constructor(message = "Cette composition nécessite une procédure d’arbitrage versionnée et auditée.") {
    super(message);
    this.name = "SpogomiCompositionProtectionError";
  }
}

function compositionRpcError(error: { code?: string; message?: string }): Error {
  if (error.code === "40001") return new Error("Conflict: la composition SPOGOMI a changé entre-temps. Rechargez la page puis réessayez.");
  const message = error.message ?? "";
  if (error.code === "42501" || /explicit audited correction|versioned correction|direct SPOGOMI team changes/i.test(message)) {
    return new SpogomiCompositionProtectionError(
      /preparation|préparation/i.test(message)
        ? "Les déplacements ordinaires sont autorisés uniquement pendant la préparation. Une procédure d’absence ou de remplacement versionnée est requise."
        : undefined,
    );
  }
  if (error.code === "23514") return new Error(`Validation: ${message || "La composition SPOGOMI est invalide."}`);
  return new Error(message || "La composition SPOGOMI n’a pas pu être modifiée.");
}

export async function lockSpogomiTeams(
  supabase: SupabaseClient,
  event: EventForCompositionMutation,
  actorClerkId: string,
  expectedRevision = Number(event.composition_revision ?? 0),
  divisionId?: string,
) {
  if (divisionId) {
    const scoped = await supabase.rpc("spogomi_lock_team_composition_for_division", {
      p_event_id: event.id,
      p_division_id: divisionId,
      p_expected_revision: expectedRevision,
      p_actor_clerk_id: actorClerkId,
    });
    if (scoped.error) throw compositionRpcError(scoped.error);
    return scoped.data;
  }
  const result = await supabase.rpc("spogomi_lock_team_composition", {
    p_event_id: event.id,
    p_expected_revision: expectedRevision,
    p_actor_clerk_id: actorClerkId,
  });
  if (result.error) throw compositionRpcError(result.error);
  return result.data;
}

export async function moveParticipantToTeam(params: {
  supabase: SupabaseClient;
  event: EventForCompositionMutation;
  participantId: string;
  teamId: string | null;
  actorClerkId: string;
  expectedRevision?: number;
  divisionId?: string;
}) {
  const rpcName = params.divisionId ? "spogomi_move_participant_to_team_for_division" : "spogomi_move_participant_to_team";
  const result = await params.supabase.rpc(rpcName, {
    p_event_id: params.event.id,
    ...(params.divisionId ? { p_division_id: params.divisionId } : {}),
    p_participant_id: params.participantId,
    p_team_id: params.teamId,
    p_expected_revision: params.expectedRevision ?? Number(params.event.composition_revision ?? 0),
    p_actor_clerk_id: params.actorClerkId,
  });
  if (result.error) throw compositionRpcError(result.error);
  return result.data;
}
