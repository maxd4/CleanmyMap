import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SpogomiIdentityAssistanceStatus = "pending" | "treated" | "rejected" | "cancelled";

export type SpogomiIdentityAssistanceRequest = {
  id: string;
  eventId: string;
  providedContext: string;
  status: SpogomiIdentityAssistanceStatus;
  matchedParticipantId: string | null;
  verificationNote: string | null;
  resolutionNote: string | null;
  handledAt: string | null;
  createdAt: string;
};

export type SpogomiIdentityAssistanceRequesterView = {
  id: string;
  providedContext: string;
  status: SpogomiIdentityAssistanceStatus;
  createdAt: string;
};

export class SpogomiIdentityAssistanceError extends Error {
  constructor(
    message: string,
    public readonly kind: "unavailable" | "conflict" | "validation",
  ) {
    super(message);
    this.name = "SpogomiIdentityAssistanceError";
  }
}

function mapError(error: unknown): SpogomiIdentityAssistanceError {
  const code = error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : null;
  if (code === "P0002") return new SpogomiIdentityAssistanceError("Cette demande n’est pas disponible.", "unavailable");
  if (code === "40001") return new SpogomiIdentityAssistanceError("Cette demande a déjà été traitée.", "conflict");
  if (code === "42501") return new SpogomiIdentityAssistanceError("Une vérification indépendante est requise avant cette décision.", "validation");
  return new SpogomiIdentityAssistanceError("La demande d’assistance n’a pas pu être enregistrée.", "validation");
}

export function normalizeAssistanceContext(value: string | undefined): string {
  return (value ?? "").trim().slice(0, 1200);
}

export function generateSpogomiIdentityAssistanceToken(): string {
  return `SPOGOMI-ASSIST-${randomBytes(24).toString("hex")}`;
}

export function hashSpogomiIdentityAssistanceToken(token: string): string {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

function mapOrganizerRequest(row: Record<string, unknown>): SpogomiIdentityAssistanceRequest {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    providedContext: String(row.provided_context ?? ""),
    status: row.status === "treated" || row.status === "rejected" || row.status === "cancelled" ? row.status : "pending",
    matchedParticipantId: typeof row.matched_participant_id === "string" ? row.matched_participant_id : null,
    verificationNote: typeof row.verification_note === "string" ? row.verification_note : null,
    resolutionNote: typeof row.resolution_note === "string" ? row.resolution_note : null,
    handledAt: typeof row.handled_at === "string" ? row.handled_at : null,
    createdAt: String(row.created_at),
  };
}

function mapRequesterRequest(row: Record<string, unknown>): SpogomiIdentityAssistanceRequesterView {
  return {
    id: String(row.id),
    providedContext: String(row.provided_context ?? ""),
    status: row.status === "treated" || row.status === "rejected" || row.status === "cancelled" ? row.status : "pending",
    createdAt: String(row.created_at),
  };
}

export function projectSpogomiIdentityAssistanceForRequester(
  request: SpogomiIdentityAssistanceRequest,
): SpogomiIdentityAssistanceRequesterView {
  return {
    id: request.id,
    providedContext: request.providedContext,
    status: request.status,
    createdAt: request.createdAt,
  };
}

export async function createSpogomiIdentityAssistanceRequest(params: {
  supabase: SupabaseClient;
  eventId: string;
  requesterClerkId: string;
  providedContext?: string;
  invitationToken?: string;
}): Promise<Pick<SpogomiIdentityAssistanceRequesterView, "id" | "status">> {
  const result = await params.supabase.rpc("create_spogomi_identity_assistance_request", {
    p_event_id: params.eventId,
    p_requester_clerk_id: params.requesterClerkId,
    p_provided_context: normalizeAssistanceContext(params.providedContext),
    p_invitation_token_hash: params.invitationToken ? hashSpogomiIdentityAssistanceToken(params.invitationToken) : null,
  });
  if (result.error) throw mapError(result.error);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row || typeof row !== "object") throw new SpogomiIdentityAssistanceError("La demande d’assistance n’a pas pu être enregistrée.", "validation");
  const status = (row as Record<string, unknown>).request_status;
  if (status !== "pending") throw new SpogomiIdentityAssistanceError("La demande d’assistance n’a pas pu être enregistrée.", "validation");
  return { id: String((row as Record<string, unknown>).request_id), status };
}

export async function listSpogomiIdentityAssistanceRequests(
  supabase: SupabaseClient,
  eventId: string,
): Promise<SpogomiIdentityAssistanceRequest[]> {
  const result = await supabase
    .from("spogomi_identity_assistance_requests")
    .select("id, event_id, provided_context, status, matched_participant_id, verification_note, resolution_note, handled_at, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => mapOrganizerRequest(row as Record<string, unknown>));
}

export async function loadSpogomiIdentityAssistanceRequestForRequester(
  supabase: SupabaseClient,
  params: { eventId: string; requesterClerkId: string },
): Promise<SpogomiIdentityAssistanceRequesterView | null> {
  const result = await supabase
    .from("spogomi_identity_assistance_requests")
    .select("id, provided_context, status, created_at")
    .eq("event_id", params.eventId)
    .eq("requester_clerk_id", params.requesterClerkId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (result.error) throw result.error;
  const row = result.data?.[0];
  return row ? mapRequesterRequest(row as Record<string, unknown>) : null;
}

export async function transitionSpogomiIdentityAssistanceRequest(params: {
  supabase: SupabaseClient;
  requestId: string;
  eventId: string;
  targetStatus: Exclude<SpogomiIdentityAssistanceStatus, "pending">;
  actorKind: "requester" | "organizer";
  actorClerkId: string;
  matchedParticipantId?: string | null;
  verificationNote?: string | null;
  resolutionNote?: string | null;
}): Promise<SpogomiIdentityAssistanceRequest> {
  const result = await params.supabase.rpc("transition_spogomi_identity_assistance_request", {
    p_request_id: params.requestId,
    p_event_id: params.eventId,
    p_target_status: params.targetStatus,
    p_actor_kind: params.actorKind,
    p_actor_clerk_id: params.actorClerkId,
    p_matched_participant_id: params.matchedParticipantId ?? null,
    p_verification_note: params.verificationNote?.trim() || null,
    p_resolution_note: params.resolutionNote?.trim() || null,
  });
  if (result.error) throw mapError(result.error);
  if (!result.data || typeof result.data !== "object") throw new SpogomiIdentityAssistanceError("La décision n’a pas pu être enregistrée.", "validation");
  return mapOrganizerRequest(result.data as Record<string, unknown>);
}

export async function issueSpogomiIdentityAssistanceInvitation(params: {
  supabase: SupabaseClient;
  eventId: string;
  organizerId: string;
  now?: Date;
}): Promise<{ token: string; expiresAt: string }> {
  const token = generateSpogomiIdentityAssistanceToken();
  const expiresAt = new Date((params.now ?? new Date()).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const result = await params.supabase.rpc("issue_spogomi_identity_assistance_invitation", {
    p_event_id: params.eventId,
    p_token_hash: hashSpogomiIdentityAssistanceToken(token),
    p_issued_by_clerk_id: params.organizerId,
    p_expires_at: expiresAt,
  });
  if (result.error) throw mapError(result.error);
  return { token, expiresAt };
}
