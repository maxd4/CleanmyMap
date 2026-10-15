import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type SpogomiTeamJoinRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type SpogomiTeamJoinRequest = {
  id: string;
  eventId: string;
  teamId: string;
  requesterClerkId: string;
  status: SpogomiTeamJoinRequestStatus;
  matchedParticipantId: string | null;
  verificationNote: string | null;
  resolutionNote: string | null;
  decidedByClerkId: string | null;
  decidedAt: string | null;
  createdAt: string;
  team: { publicName: string; teamNumber: number } | null;
};

export type SpogomiTeamJoinRequestRequesterView = {
  id: string;
  teamId: string;
  status: SpogomiTeamJoinRequestStatus;
  decidedAt: string | null;
  createdAt: string;
  team: { publicName: string; teamNumber: number } | null;
};

export class SpogomiTeamJoinRequestError extends Error {
  constructor(
    message: string,
    public readonly kind: "unavailable" | "conflict" | "forbidden" | "validation",
  ) {
    super(message);
    this.name = "SpogomiTeamJoinRequestError";
  }
}

function mapError(error: unknown): SpogomiTeamJoinRequestError {
  const code = error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : null;
  if (code === "P0002") return new SpogomiTeamJoinRequestError("Cette équipe n’est pas disponible.", "unavailable");
  if (code === "23505" || code === "40001") return new SpogomiTeamJoinRequestError("Une demande ou une liaison existe déjà pour ce compte.", "conflict");
  if (code === "42501") return new SpogomiTeamJoinRequestError("Cette décision n’est pas autorisée.", "forbidden");
  return new SpogomiTeamJoinRequestError("La demande de rattachement n’a pas pu être traitée.", "validation");
}

function asStatus(value: unknown): SpogomiTeamJoinRequestStatus {
  return value === "approved" || value === "rejected" || value === "cancelled" ? value : "pending";
}

function mapRequest(row: Record<string, unknown>, team: SpogomiTeamJoinRequest["team"] = null): SpogomiTeamJoinRequest {
  return {
    id: String(row.id ?? row.request_id),
    eventId: String(row.event_id),
    teamId: String(row.team_id ?? row.request_team_id),
    requesterClerkId: String(row.requester_clerk_id ?? ""),
    status: asStatus(row.status ?? row.request_status),
    matchedParticipantId: typeof row.matched_participant_id === "string" ? row.matched_participant_id : null,
    verificationNote: typeof row.verification_note === "string" ? row.verification_note : null,
    resolutionNote: typeof row.resolution_note === "string" ? row.resolution_note : null,
    decidedByClerkId: typeof row.decided_by_clerk_id === "string" ? row.decided_by_clerk_id : null,
    decidedAt: typeof row.decided_at === "string" ? row.decided_at : null,
    createdAt: String(row.created_at ?? ""),
    team,
  };
}

function mapRequesterRequest(row: Record<string, unknown>, team: SpogomiTeamJoinRequest["team"] = null): SpogomiTeamJoinRequestRequesterView {
  return {
    id: String(row.id ?? row.request_id),
    teamId: String(row.team_id ?? row.request_team_id),
    status: asStatus(row.status ?? row.request_status),
    decidedAt: typeof row.decided_at === "string" ? row.decided_at : null,
    createdAt: String(row.created_at ?? ""),
    team,
  };
}

export function projectSpogomiTeamJoinRequestForRequester(
  request: SpogomiTeamJoinRequest,
): SpogomiTeamJoinRequestRequesterView {
  return {
    id: request.id,
    teamId: request.teamId,
    status: request.status,
    decidedAt: request.decidedAt,
    createdAt: request.createdAt,
    team: request.team,
  };
}

async function loadTeamLabels(
  supabase: SupabaseClient,
  eventId: string,
  teamIds: string[],
): Promise<Map<string, { publicName: string; teamNumber: number }>> {
  if (!teamIds.length) return new Map();
  const result = await supabase
    .from("spogomi_teams")
    .select("id, public_name, team_number")
    .eq("event_id", eventId)
    .in("id", teamIds);
  if (result.error) throw result.error;
  return new Map((result.data ?? []).map((row) => [
    String(row.id),
    { publicName: String(row.public_name), teamNumber: Number(row.team_number) },
  ]));
}

export async function createSpogomiTeamJoinRequest(params: {
  supabase: SupabaseClient;
  eventId: string;
  teamId: string;
  requesterClerkId: string;
}): Promise<SpogomiTeamJoinRequestRequesterView> {
  const result = await params.supabase.rpc("create_spogomi_team_join_request", {
    p_event_id: params.eventId,
    p_team_id: params.teamId,
    p_requester_clerk_id: params.requesterClerkId,
  });
  if (result.error) throw mapError(result.error);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row || typeof row !== "object") throw new SpogomiTeamJoinRequestError("La demande n’a pas pu être créée.", "validation");
  const requestTeamId = (row as Record<string, unknown>).request_team_id;
  if (typeof requestTeamId !== "string" || !requestTeamId) {
    throw new SpogomiTeamJoinRequestError("La demande retournée est incohérente.", "validation");
  }
  if (requestTeamId !== params.teamId) {
    throw new SpogomiTeamJoinRequestError("Une demande approuvée existe déjà pour une autre équipe de cet événement.", "conflict");
  }
  const mapped = mapRequesterRequest({
    id: (row as Record<string, unknown>).request_id,
    event_id: params.eventId,
    team_id: requestTeamId,
    status: (row as Record<string, unknown>).request_status,
    created_at: new Date().toISOString(),
  });
  const labels = await loadTeamLabels(params.supabase, params.eventId, [requestTeamId]);
  return { ...mapped, team: labels.get(requestTeamId) ?? null };
}

export async function loadSpogomiTeamJoinRequestForRequester(
  supabase: SupabaseClient,
  params: { eventId: string; teamId: string; requesterClerkId: string },
): Promise<SpogomiTeamJoinRequestRequesterView | null> {
  const eventResult = await supabase
    .from("spogomi_events")
    .select("id")
    .eq("id", params.eventId)
    .eq("public_visibility", "published")
    .neq("state", "cancelled")
    .maybeSingle();
  if (eventResult.error) throw eventResult.error;
  if (!eventResult.data) return null;
  const result = await supabase
    .from("spogomi_team_join_requests")
    .select("id, event_id, team_id, status, decided_at, created_at")
    .eq("event_id", params.eventId)
    .eq("team_id", params.teamId)
    .eq("requester_clerk_id", params.requesterClerkId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (result.error) throw result.error;
  const row = result.data?.[0];
  if (!row) return null;
  const requestTeamId = String((row as Record<string, unknown>).team_id);
  const labels = await loadTeamLabels(supabase, params.eventId, [requestTeamId]);
  return mapRequesterRequest(row as Record<string, unknown>, labels.get(requestTeamId) ?? null);
}

export async function listSpogomiTeamJoinRequestsForAdmin(
  supabase: SupabaseClient,
  eventId: string,
): Promise<SpogomiTeamJoinRequest[]> {
  const result = await supabase
    .from("spogomi_team_join_requests")
    .select("id, event_id, team_id, requester_clerk_id, status, matched_participant_id, verification_note, resolution_note, decided_by_clerk_id, decided_at, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (result.error) throw result.error;
  const rows = (result.data ?? []) as Array<Record<string, unknown>>;
  const labels = await loadTeamLabels(supabase, eventId, rows.map((row) => String(row.team_id)));
  return rows.map((row) => mapRequest(row, labels.get(String(row.team_id)) ?? null));
}

export async function transitionSpogomiTeamJoinRequest(params: {
  supabase: SupabaseClient;
  requestId: string;
  eventId: string;
  targetStatus: Exclude<SpogomiTeamJoinRequestStatus, "pending">;
  actorKind: "requester" | "admin";
  actorClerkId: string;
  actorRole?: "admin" | "max";
  matchedParticipantId?: string | null;
  verificationNote?: string | null;
  resolutionNote?: string | null;
}): Promise<SpogomiTeamJoinRequest> {
  const result = await params.supabase.rpc("transition_spogomi_team_join_request", {
    p_request_id: params.requestId,
    p_event_id: params.eventId,
    p_target_status: params.targetStatus,
    p_actor_kind: params.actorKind,
    p_actor_clerk_id: params.actorClerkId,
    p_actor_role: params.actorRole ?? null,
    p_matched_participant_id: params.matchedParticipantId ?? null,
    p_verification_note: params.verificationNote?.trim() || null,
    p_resolution_note: params.resolutionNote?.trim() || null,
  });
  if (result.error) throw mapError(result.error);
  if (!result.data || typeof result.data !== "object") throw new SpogomiTeamJoinRequestError("La décision n’a pas pu être enregistrée.", "validation");
  const row = result.data as Record<string, unknown>;
  const labels = await loadTeamLabels(params.supabase, params.eventId, [String(row.team_id)]);
  return mapRequest(row, labels.get(String(row.team_id)) ?? null);
}
