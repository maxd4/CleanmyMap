import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type SpogomiAdmissionRequestKind = "registration" | "presence_regularization";
export type SpogomiAdmissionRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type SpogomiAdmissionRequesterView = {
  id: string;
  requestKind: SpogomiAdmissionRequestKind;
  divisionId: string;
  teamId: string | null;
  providedContext: string;
  status: SpogomiAdmissionRequestStatus;
  decisionMessage: string | null;
  decidedAt: string | null;
  createdAt: string;
};

export type SpogomiAdmissionAdminView = SpogomiAdmissionRequesterView & {
  requesterClerkId: string;
  matchedParticipantId: string | null;
  verificationNote: string | null;
  resolutionNote: string | null;
  decidedByClerkId: string | null;
};

export class SpogomiAdmissionRequestError extends Error {
  constructor(
    message: string,
    public readonly kind: "unavailable" | "conflict" | "forbidden" | "validation",
  ) {
    super(message);
    this.name = "SpogomiAdmissionRequestError";
  }
}

function mapError(error: unknown): SpogomiAdmissionRequestError {
  const code = error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : null;
  const message = error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string"
    ? (error as { message: string }).message
    : "";
  if (code === "P0002") return new SpogomiAdmissionRequestError("Cette édition n’est pas disponible pour ce parcours.", "unavailable");
  if (code === "23505" || code === "40001") {
    if (message.includes("spogomi_admission_request_scope_conflict")) {
      return new SpogomiAdmissionRequestError("Une demande active existe déjà dans une autre division ou équipe.", "conflict");
    }
    return new SpogomiAdmissionRequestError("Une demande ou une liaison existe déjà pour ce compte.", "conflict");
  }
  if (code === "42501") {
    if (message.includes("external_ticketing")) return new SpogomiAdmissionRequestError("Cette édition doit être rejointe par la billetterie officielle.", "forbidden");
    if (message.includes("capacity")) return new SpogomiAdmissionRequestError("La capacité d’inscription de cette édition est atteinte.", "forbidden");
    if (message.includes("world_cup")) return new SpogomiAdmissionRequestError("Cette division World Cup doit être rejointe par le parcours officiel.", "forbidden");
    return new SpogomiAdmissionRequestError("Cette demande n’est pas autorisée dans l’état actuel de l’édition.", "forbidden");
  }
  if (code === "22023") return new SpogomiAdmissionRequestError("La division ou les informations de la demande sont invalides.", "validation");
  return new SpogomiAdmissionRequestError("La demande SPOGOMI n’a pas pu être traitée.", "validation");
}

function asKind(value: unknown): SpogomiAdmissionRequestKind {
  return value === "presence_regularization" ? value : "registration";
}

function asStatus(value: unknown): SpogomiAdmissionRequestStatus {
  return value === "approved" || value === "rejected" || value === "cancelled" ? value : "pending";
}

function mapRequester(row: Record<string, unknown>): SpogomiAdmissionRequesterView {
  return {
    id: String(row.id ?? row.request_id),
    requestKind: asKind(row.request_kind),
    divisionId: String(row.division_id ?? row.request_division_id ?? ""),
    teamId: typeof (row.team_id ?? row.request_team_id) === "string" ? String(row.team_id ?? row.request_team_id) : null,
    providedContext: String(row.provided_context ?? ""),
    status: asStatus(row.status ?? row.request_status),
    decisionMessage: typeof row.decision_message === "string" ? row.decision_message : null,
    decidedAt: typeof row.decided_at === "string" ? row.decided_at : null,
    createdAt: String(row.created_at ?? ""),
  };
}

function mapAdmin(row: Record<string, unknown>): SpogomiAdmissionAdminView {
  return {
    ...mapRequester(row),
    requesterClerkId: String(row.requester_clerk_id ?? ""),
    matchedParticipantId: typeof row.matched_participant_id === "string" ? row.matched_participant_id : null,
    verificationNote: typeof row.verification_note === "string" ? row.verification_note : null,
    resolutionNote: typeof row.resolution_note === "string" ? row.resolution_note : null,
    decidedByClerkId: typeof row.decided_by_clerk_id === "string" ? row.decided_by_clerk_id : null,
  };
}

const REQUESTER_COLUMNS = "id, event_id, request_kind, division_id, team_id, provided_context, status, decision_message, decided_at, created_at";
const ADMIN_COLUMNS = `${REQUESTER_COLUMNS}, requester_clerk_id, matched_participant_id, verification_note, resolution_note, decided_by_clerk_id`;

export async function createSpogomiAdmissionRequest(params: {
  supabase: SupabaseClient;
  eventId: string;
  teamId?: string | null;
  divisionId: string;
  requesterClerkId: string;
  requestKind: SpogomiAdmissionRequestKind;
  providedContext?: string;
}): Promise<SpogomiAdmissionRequesterView> {
  const result = await params.supabase.rpc("create_spogomi_admission_request", {
    p_event_id: params.eventId,
    p_team_id: params.teamId ?? null,
    p_requester_clerk_id: params.requesterClerkId,
    p_request_kind: params.requestKind,
    p_division_id: params.divisionId,
    p_provided_context: (params.providedContext ?? "").trim().slice(0, 1200),
  });
  if (result.error) throw mapError(result.error);
  const row = (Array.isArray(result.data) ? result.data[0] : result.data) as Record<string, unknown> | undefined;
  if (!row) throw new SpogomiAdmissionRequestError("La demande n’a pas pu être créée.", "validation");
  const requestId = typeof row.request_id === "string" ? row.request_id : typeof row.id === "string" ? row.id : "";
  if (!requestId) throw new SpogomiAdmissionRequestError("La demande n’a pas pu être créée.", "validation");
  const persisted = await loadSpogomiAdmissionRequestForRequester(params.supabase, {
    eventId: params.eventId,
    requestId,
    requesterClerkId: params.requesterClerkId,
  });
  if (!persisted) throw new SpogomiAdmissionRequestError("La demande n’a pas pu être relue après son enregistrement.", "validation");
  return persisted;
}

export async function listSpogomiAdmissionRequestsForRequester(
  supabase: SupabaseClient,
  params: { eventId: string; requesterClerkId: string },
): Promise<SpogomiAdmissionRequesterView[]> {
  const result = await supabase
    .from("spogomi_team_join_requests")
    .select(REQUESTER_COLUMNS)
    .eq("event_id", params.eventId)
    .eq("requester_clerk_id", params.requesterClerkId)
    .in("request_kind", ["registration", "presence_regularization"])
    .order("created_at", { ascending: false });
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => mapRequester(row as Record<string, unknown>));
}

export async function loadSpogomiAdmissionRequestForRequester(
  supabase: SupabaseClient,
  params: { eventId: string; requestId: string; requesterClerkId: string },
): Promise<SpogomiAdmissionRequesterView | null> {
  const result = await supabase
    .from("spogomi_team_join_requests")
    .select(REQUESTER_COLUMNS)
    .eq("id", params.requestId)
    .eq("event_id", params.eventId)
    .eq("requester_clerk_id", params.requesterClerkId)
    .in("request_kind", ["registration", "presence_regularization"])
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data ? mapRequester(result.data as Record<string, unknown>) : null;
}

export async function listSpogomiAdmissionRequestsForAdmin(
  supabase: SupabaseClient,
  eventId: string,
): Promise<SpogomiAdmissionAdminView[]> {
  const result = await supabase
    .from("spogomi_team_join_requests")
    .select(ADMIN_COLUMNS)
    .eq("event_id", eventId)
    .in("request_kind", ["registration", "presence_regularization"])
    .order("created_at", { ascending: false });
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => mapAdmin(row as Record<string, unknown>));
}

export async function transitionSpogomiAdmissionRequest(params: {
  supabase: SupabaseClient;
  requestId: string;
  eventId: string;
  targetStatus: "approved" | "rejected";
  actorClerkId: string;
  actorRole: "admin" | "max";
  verificationNote?: string;
  resolutionNote?: string;
  decisionMessage?: string;
}): Promise<SpogomiAdmissionAdminView> {
  const result = await params.supabase.rpc("transition_spogomi_admission_request", {
    p_request_id: params.requestId,
    p_event_id: params.eventId,
    p_target_status: params.targetStatus,
    p_actor_kind: "admin",
    p_actor_clerk_id: params.actorClerkId,
    p_actor_role: params.actorRole,
    p_matched_participant_id: null,
    p_verification_note: params.verificationNote?.trim() || null,
    p_resolution_note: params.resolutionNote?.trim() || null,
    p_decision_message: params.decisionMessage?.trim() || null,
  });
  if (result.error) throw mapError(result.error);
  if (!result.data || typeof result.data !== "object") throw new SpogomiAdmissionRequestError("La décision n’a pas pu être enregistrée.", "validation");
  return mapAdmin(result.data as Record<string, unknown>);
}

export async function cancelSpogomiAdmissionRequest(params: {
  supabase: SupabaseClient;
  requestId: string;
  eventId: string;
  requesterClerkId: string;
}): Promise<SpogomiAdmissionRequesterView> {
  const result = await params.supabase.rpc("transition_spogomi_admission_request", {
    p_request_id: params.requestId,
    p_event_id: params.eventId,
    p_target_status: "cancelled",
    p_actor_kind: "requester",
    p_actor_clerk_id: params.requesterClerkId,
    p_actor_role: null,
    p_matched_participant_id: null,
    p_verification_note: null,
    p_resolution_note: null,
    p_decision_message: null,
  });
  if (result.error) throw mapError(result.error);
  if (!result.data || typeof result.data !== "object") throw new SpogomiAdmissionRequestError("La demande n’a pas pu être annulée.", "validation");
  return mapRequester(result.data as Record<string, unknown>);
}
