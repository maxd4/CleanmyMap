import type { SupabaseClient } from "@supabase/supabase-js";

type EventForCompositionMutation = {
  id: string;
  composition_revision?: number;
};

type CompositionLockResult = {
  alreadyProcessed: boolean;
  locked: boolean;
  teamCount: number;
  compositionRevision: number;
  divisionId?: string;
  allDivisionsLocked?: boolean;
};

type CompositionMoveResult = {
  alreadyProcessed: boolean;
  participantId: string;
  teamId: string | null;
  divisionId?: string;
  compositionRevision: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseCompositionLockResult(value: unknown): CompositionLockResult {
  if (!isRecord(value) || typeof value.already_processed !== "boolean" || value.locked !== true ||
    !finiteNumber(value.teamCount) || !finiteNumber(value.compositionRevision) ||
    (value.divisionId !== undefined && typeof value.divisionId !== "string") ||
    (value.allDivisionsLocked !== undefined && typeof value.allDivisionsLocked !== "boolean")) {
    throw new Error("La réponse de verrouillage de composition SPOGOMI est invalide.");
  }
  return {
    alreadyProcessed: value.already_processed,
    locked: value.locked,
    teamCount: value.teamCount,
    compositionRevision: value.compositionRevision,
    ...(typeof value.divisionId === "string" ? { divisionId: value.divisionId } : {}),
    ...(typeof value.allDivisionsLocked === "boolean" ? { allDivisionsLocked: value.allDivisionsLocked } : {}),
  };
}

function parseCompositionMoveResult(value: unknown): CompositionMoveResult {
  if (!isRecord(value) || typeof value.already_processed !== "boolean" || typeof value.participantId !== "string" ||
    (value.teamId !== null && typeof value.teamId !== "string") ||
    (value.divisionId !== undefined && typeof value.divisionId !== "string") || !finiteNumber(value.compositionRevision)) {
    throw new Error("La réponse de déplacement de composition SPOGOMI est invalide.");
  }
  return {
    alreadyProcessed: value.already_processed,
    participantId: value.participantId,
    teamId: value.teamId,
    compositionRevision: value.compositionRevision,
    ...(typeof value.divisionId === "string" ? { divisionId: value.divisionId } : {}),
  };
}

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
    return parseCompositionLockResult(scoped.data);
  }
  const result = await supabase.rpc("spogomi_lock_team_composition", {
    p_event_id: event.id,
    p_expected_revision: expectedRevision,
    p_actor_clerk_id: actorClerkId,
  });
  if (result.error) throw compositionRpcError(result.error);
  return parseCompositionLockResult(result.data);
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
  return parseCompositionMoveResult(result.data);
}
