import type { SupabaseClient } from "@supabase/supabase-js";

type EventForCompositionMutation = {
  id: string;
  composition_revision?: number;
};

type CompositionLockResult = {
  already_processed: boolean;
  locked: boolean;
  teamCount: number;
  compositionRevision: number;
  divisionId?: string;
  allDivisionsLocked?: boolean;
};

type CompositionMoveResult = {
  already_processed: boolean;
  participantId: string;
  teamId: string | null;
  divisionId?: string;
  compositionRevision: number;
};

type CompositionTeamResult = {
  already_processed: boolean;
  team: { id: string; divisionId: string; teamNumber: number; publicName: string; compositionState: string };
  compositionRevision: number;
};

type CompositionPlaceResult = {
  already_processed: boolean;
  participant: { id: string; divisionId: string; displayName: string; teamId: string | null };
  compositionRevision: number;
};

type CompositionLabelResult = {
  already_processed: boolean;
  participantId: string;
  displayName: string;
  compositionRevision: number;
};

type CompositionDraftSaveResult = { already_processed: boolean; divisionId: string; compositionRevision: number };

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
    already_processed: value.already_processed,
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
    already_processed: value.already_processed,
    participantId: value.participantId,
    teamId: value.teamId,
    compositionRevision: value.compositionRevision,
    ...(typeof value.divisionId === "string" ? { divisionId: value.divisionId } : {}),
  };
}

function parseCompositionTeamResult(value: unknown): CompositionTeamResult {
  if (!isRecord(value) || typeof value.already_processed !== "boolean" || !isRecord(value.team) ||
    typeof value.team.id !== "string" || typeof value.team.divisionId !== "string" || typeof value.team.teamNumber !== "number" ||
    typeof value.team.publicName !== "string" || typeof value.team.compositionState !== "string" || !finiteNumber(value.compositionRevision)) {
    throw new Error("La réponse de création d'équipe SPOGOMI est invalide.");
  }
  return { already_processed: value.already_processed, team: { id: value.team.id, divisionId: value.team.divisionId, teamNumber: value.team.teamNumber, publicName: value.team.publicName, compositionState: value.team.compositionState }, compositionRevision: value.compositionRevision };
}

function parseCompositionPlaceResult(value: unknown): CompositionPlaceResult {
  if (!isRecord(value) || typeof value.already_processed !== "boolean" || !isRecord(value.participant) ||
    typeof value.participant.id !== "string" || typeof value.participant.divisionId !== "string" || typeof value.participant.displayName !== "string" ||
    (value.participant.teamId !== null && typeof value.participant.teamId !== "string") || !finiteNumber(value.compositionRevision)) {
    throw new Error("La réponse de création de place SPOGOMI est invalide.");
  }
  return { already_processed: value.already_processed, participant: { id: value.participant.id, divisionId: value.participant.divisionId, displayName: value.participant.displayName, teamId: value.participant.teamId }, compositionRevision: value.compositionRevision };
}

function parseCompositionLabelResult(value: unknown): CompositionLabelResult {
  if (!isRecord(value) || typeof value.already_processed !== "boolean" || typeof value.participantId !== "string" || typeof value.displayName !== "string" || !finiteNumber(value.compositionRevision)) {
    throw new Error("La réponse de modification de place SPOGOMI est invalide.");
  }
  return { already_processed: value.already_processed, participantId: value.participantId, displayName: value.displayName, compositionRevision: value.compositionRevision };
}

function parseCompositionDraftSaveResult(value: unknown): CompositionDraftSaveResult {
  if (!isRecord(value) || typeof value.already_processed !== "boolean" || typeof value.divisionId !== "string" || !finiteNumber(value.compositionRevision)) throw new Error("La réponse d’enregistrement de composition SPOGOMI est invalide.");
  return { already_processed: value.already_processed, divisionId: value.divisionId, compositionRevision: value.compositionRevision };
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

export async function createSpogomiTeam(params: {
  supabase: SupabaseClient;
  event: EventForCompositionMutation;
  divisionId: string;
  publicName?: string;
  actorClerkId: string;
  expectedRevision: number;
}) {
  const result = await params.supabase.rpc("spogomi_create_team_for_division", {
    p_event_id: params.event.id,
    p_division_id: params.divisionId,
    p_expected_revision: params.expectedRevision,
    p_public_name: params.publicName ?? null,
    p_actor_clerk_id: params.actorClerkId,
  });
  if (result.error) throw compositionRpcError(result.error);
  return parseCompositionTeamResult(result.data);
}

export async function createSpogomiManualPlace(params: {
  supabase: SupabaseClient;
  event: EventForCompositionMutation;
  divisionId: string;
  privateLabel: string;
  actorClerkId: string;
  expectedRevision: number;
}) {
  const result = await params.supabase.rpc("spogomi_create_manual_place_for_division", {
    p_event_id: params.event.id,
    p_division_id: params.divisionId,
    p_expected_revision: params.expectedRevision,
    p_private_label: params.privateLabel,
    p_actor_clerk_id: params.actorClerkId,
  });
  if (result.error) throw compositionRpcError(result.error);
  return parseCompositionPlaceResult(result.data);
}

export async function updateSpogomiParticipantPrivateLabel(params: {
  supabase: SupabaseClient;
  event: EventForCompositionMutation;
  divisionId: string;
  participantId: string;
  expectedPrivateLabel: string | null;
  privateLabel: string;
  actorClerkId: string;
  expectedRevision: number;
}) {
  const result = await params.supabase.rpc("spogomi_update_participant_private_label", {
    p_event_id: params.event.id,
    p_division_id: params.divisionId,
    p_participant_id: params.participantId,
    p_expected_revision: params.expectedRevision,
    p_expected_private_label: params.expectedPrivateLabel,
    p_private_label: params.privateLabel,
    p_actor_clerk_id: params.actorClerkId,
  });
  if (result.error) throw compositionRpcError(result.error);
  return parseCompositionLabelResult(result.data);
}

export async function saveSpogomiCompositionDraft(params: {
  supabase: SupabaseClient;
  event: EventForCompositionMutation;
  divisionId: string;
  expectedRevision: number;
  teams: Array<{ id: string | null; clientKey: string | null; publicName: string; expectedPublicName: string | null }>;
  participants: Array<{ id: string | null; clientKey: string | null; privateLabel: string | null; teamKey: string | null }>;
  actorClerkId: string;
}) {
  const result = await params.supabase.rpc("spogomi_save_team_composition_draft_for_division", {
    p_event_id: params.event.id,
    p_division_id: params.divisionId,
    p_expected_revision: params.expectedRevision,
    p_teams: params.teams,
    p_participants: params.participants,
    p_actor_clerk_id: params.actorClerkId,
  });
  if (result.error) throw compositionRpcError(result.error);
  return parseCompositionDraftSaveResult(result.data);
}
