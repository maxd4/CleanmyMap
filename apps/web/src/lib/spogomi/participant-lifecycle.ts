import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export class SpogomiParticipantLifecycleError extends Error {
  constructor(message: string, public readonly kind: "not_found" | "forbidden" | "conflict" | "validation") {
    super(message);
    this.name = "SpogomiParticipantLifecycleError";
  }
}

function mapError(error: unknown): SpogomiParticipantLifecycleError {
  const code = error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string" ? (error as { code: string }).code : null;
  if (code === "P0002") return new SpogomiParticipantLifecycleError("Participant SPOGOMI introuvable.", "not_found");
  if (code === "42501") return new SpogomiParticipantLifecycleError("Vous ne pouvez pas vous désister de ce participant.", "forbidden");
  if (code === "40001" || code === "23505") return new SpogomiParticipantLifecycleError("L’état du participant a changé, rechargez la fiche.", "conflict");
  return new SpogomiParticipantLifecycleError("Le désistement SPOGOMI n’a pas pu être enregistré.", "validation");
}

export async function withdrawSpogomiParticipant(params: {
  supabase: SupabaseClient;
  eventId: string;
  participantId: string;
  clerkId: string;
  reason?: string;
}): Promise<{ participantId: string; eventId: string; registrationStatus: "withdrawn"; alreadyProcessed: boolean }> {
  const result = await params.supabase.rpc("withdraw_spogomi_participant", {
    p_event_id: params.eventId,
    p_participant_id: params.participantId,
    p_actor_kind: "participant",
    p_actor_clerk_id: params.clerkId,
    p_actor_role: null,
    p_reason: params.reason?.trim().slice(0, 1200) ?? null,
  });
  if (result.error) throw mapError(result.error);
  if (!result.data || typeof result.data !== "object" || Array.isArray(result.data)) {
    throw new SpogomiParticipantLifecycleError("La réponse de désistement est invalide.", "validation");
  }
  const row = result.data as Record<string, unknown>;
  if (typeof row.participantId !== "string" || typeof row.eventId !== "string" || row.registrationStatus !== "withdrawn" || typeof row.alreadyProcessed !== "boolean") {
    throw new SpogomiParticipantLifecycleError("La réponse de désistement est invalide.", "validation");
  }
  return { participantId: row.participantId, eventId: row.eventId, registrationStatus: "withdrawn", alreadyProcessed: row.alreadyProcessed };
}
