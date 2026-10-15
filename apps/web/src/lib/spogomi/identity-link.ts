import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { claimFinishedActionParticipation } from "@/lib/actions/participation/post-action-claims";
import { joinActionParticipation } from "@/lib/actions/participation/group-participation";
import { readActionRegistrationRecord } from "@/lib/actions/participation/registration-records";
import { readParticipantRecord } from "@/lib/actions/participation/group-participation.helpers";
import { loadSpogomiResultsProjection } from "./results-projection-service";
import type {
  SpogomiIdentityLinkResult,
  SpogomiIdentityParticipation,
  SpogomiIdentityState,
  SpogomiIdentityStateResult,
  SpogomiLinkedTeam,
  SpogomiPublishedTeamResult,
} from "./identity-link-contract";

export type {
  SpogomiIdentityLinkResult,
  SpogomiIdentityParticipation,
  SpogomiIdentityState,
  SpogomiIdentityStateResult,
  SpogomiLinkedTeam,
  SpogomiPublishedTeamResult,
} from "./identity-link-contract";

const IDENTITY_CODE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class SpogomiIdentityLinkError extends Error {
  constructor(
    message: string,
    public readonly kind: "invalid_code" | "already_linked" | "not_found" | "validation",
  ) {
    super(message);
    this.name = "SpogomiIdentityLinkError";
  }
}

function toErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function toRpcRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    const first = data[0];
    return first && typeof first === "object" ? first as Record<string, unknown> : null;
  }
  return data && typeof data === "object" ? data as Record<string, unknown> : null;
}

export function normalizeSpogomiIdentityCode(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export function hashSpogomiIdentityCode(value: string): string {
  const normalized = normalizeSpogomiIdentityCode(value);
  if (normalized.length < 16 || normalized.length > 80) {
    throw new SpogomiIdentityLinkError("Code de liaison invalide.", "invalid_code");
  }
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export function generateSpogomiIdentityCode(): string {
  const token = randomBytes(15).toString("hex").toUpperCase();
  return `SPOGOMI-${token.slice(0, 5)}-${token.slice(5, 10)}-${token.slice(10, 15)}-${token.slice(15, 20)}-${token.slice(20)}`;
}

function mapRpcError(error: unknown): SpogomiIdentityLinkError {
  const code = toErrorCode(error);
  if (code === "23505") {
    return new SpogomiIdentityLinkError(
      "Cette identité SPOGOMI ou ce compte est déjà lié à cet événement.",
      "already_linked",
    );
  }
  if (code === "P0002") {
    return new SpogomiIdentityLinkError("Participant SPOGOMI introuvable.", "not_found");
  }
  if (code === "P0001") {
    return new SpogomiIdentityLinkError("Le code de liaison est invalide, expiré ou révoqué.", "invalid_code");
  }
  return new SpogomiIdentityLinkError("La liaison SPOGOMI n’a pas pu être vérifiée.", "validation");
}

export async function issueSpogomiIdentityCode(
  supabase: SupabaseClient,
  params: { eventId: string; participantId: string; organizerId: string; now?: Date },
): Promise<{ code: string; expiresAt: string }> {
  const code = generateSpogomiIdentityCode();
  const expiresAt = new Date((params.now ?? new Date()).getTime() + IDENTITY_CODE_TTL_MS).toISOString();
  const result = await supabase.rpc("issue_spogomi_identity_link_code", {
    p_event_id: params.eventId,
    p_participant_id: params.participantId,
    p_code_hash: hashSpogomiIdentityCode(code),
    p_issued_by_clerk_id: params.organizerId,
    p_expires_at: expiresAt,
  });
  if (result.error) throw mapRpcError(result.error);
  if (!toRpcRow(result.data)) {
    throw new SpogomiIdentityLinkError("Le code de liaison n’a pas pu être créé.", "validation");
  }
  return { code, expiresAt };
}

export async function claimSpogomiIdentityLink(
  supabase: SupabaseClient,
  params: { eventId: string; code: string; clerkId: string },
): Promise<SpogomiIdentityLinkResult> {
  const result = await supabase.rpc("claim_spogomi_identity_link", {
    p_event_id: params.eventId,
    p_code_hash: hashSpogomiIdentityCode(params.code),
    p_clerk_id: params.clerkId,
  });
  if (result.error) throw mapRpcError(result.error);
  const row = toRpcRow(result.data);
  const participantId = typeof row?.participant_id === "string" ? row.participant_id : null;
  const actionId = typeof row?.action_id === "string" ? row.action_id : null;
  const linkStatus = row?.link_status === "already_linked" ? "already_linked" : row?.link_status === "linked" ? "linked" : null;
  const attendanceStatus = row?.attendance_status === "present" || row?.attendance_status === "absent" ? row.attendance_status : "unknown";
  if (!participantId || !actionId || !linkStatus) {
    throw new SpogomiIdentityLinkError("La liaison SPOGOMI n’a pas pu être vérifiée.", "validation");
  }
  return { linkStatus, participantId, actionId, attendanceStatus };
}

export async function requestCleanMyMapParticipation(
  supabase: SupabaseClient,
  params: { actionId: string; clerkId: string; actionPhase: "pre_action" | "post_action_draft" | "post_action_complete" },
): Promise<SpogomiIdentityParticipation> {
  if (params.actionPhase === "pre_action") {
    try {
      const result = await joinActionParticipation(supabase, {
        actionId: params.actionId,
        userId: params.clerkId,
        isAdminLike: false,
      });
      return {
        status: result.participationStatus,
        store: "action_registrations",
      };
    } catch (error) {
      if (error instanceof Error && (error.name === "NotFoundError" || error.name === "ValidationError")) {
        return { status: "unavailable", store: "action_registrations" };
      }
      throw error;
    }
  }

  if (params.actionPhase === "post_action_complete") {
    try {
      const result = await claimFinishedActionParticipation(supabase, {
        actionId: params.actionId,
        userId: params.clerkId,
      });
      return {
        status: result.participationStatus,
        store: "action_participants",
      };
    } catch (error) {
      if (error instanceof Error && (error.name === "NotFoundError" || error.name === "ValidationError")) {
        return { status: "unavailable", store: "action_participants" };
      }
      throw error;
    }
  }

  return { status: "unavailable", store: null };
}

type VerifiedSpogomiIdentity = {
  participantId: string;
  actionId: string;
  teamId: string | null;
  attendanceStatus: "unknown" | "present" | "absent";
  actionPhase: "pre_action" | "post_action_draft" | "post_action_complete" | null;
};

function createIdentityNotFoundError(): SpogomiIdentityLinkError {
  return new SpogomiIdentityLinkError(
    "La liaison SPOGOMI n’est pas disponible pour ce compte.",
    "not_found",
  );
}

async function loadVerifiedSpogomiIdentity(
  supabase: SupabaseClient,
  params: { eventId: string; clerkId: string },
): Promise<VerifiedSpogomiIdentity | null> {
  const eventResult = await supabase
    .from("spogomi_events")
    .select("action_id")
    .eq("id", params.eventId)
    .maybeSingle();
  if (eventResult.error) throw eventResult.error;
  const actionId = typeof eventResult.data?.action_id === "string"
    ? eventResult.data.action_id
    : null;
  if (!actionId) return null;

  const participantResult = await supabase
    .from("spogomi_participants")
    .select("id, clerk_id, team_id, account_link_status, attendance_status")
    .eq("event_id", params.eventId)
    .eq("clerk_id", params.clerkId)
    .eq("account_link_status", "verified")
    .limit(2);
  if (participantResult.error) throw participantResult.error;
  const participants = participantResult.data ?? [];
  if (participants.length !== 1) return null;
  const participant = participants[0] as {
    id?: unknown;
    team_id?: unknown;
    attendance_status?: unknown;
  };
  if (typeof participant.id !== "string") return null;

  const actionResult = await supabase
    .from("actions")
    .select("action_phase")
    .eq("id", actionId)
    .maybeSingle();
  if (actionResult.error) throw actionResult.error;
  const actionPhase = actionResult.data?.action_phase === "pre_action" ||
    actionResult.data?.action_phase === "post_action_draft" ||
    actionResult.data?.action_phase === "post_action_complete"
    ? actionResult.data.action_phase
    : null;
  const attendanceStatus = participant.attendance_status === "present" || participant.attendance_status === "absent"
    ? participant.attendance_status
    : "unknown";

  return {
    participantId: participant.id,
    actionId,
    teamId: typeof participant.team_id === "string" ? participant.team_id : null,
    attendanceStatus,
    actionPhase,
  };
}

function mapPublishedTeamResult(
  entries: Array<{ teamId?: string; status: string; rank: number | null; score?: number | null; countedButts?: number | null; ratio?: number | null }>,
  teamId: string,
): SpogomiPublishedTeamResult | null {
  const entry = entries.find((candidate) => candidate.teamId === teamId);
  if (!entry || (entry.status !== "provisional" && entry.status !== "certified")) return null;
  return {
    status: entry.status,
    rank: entry.rank,
    score: entry.score ?? null,
    countedButts: entry.countedButts ?? null,
    ratio: entry.ratio ?? null,
  };
}

async function loadLinkedTeam(
  supabase: SupabaseClient,
  params: { eventId: string; identity: VerifiedSpogomiIdentity; participationStatus: SpogomiIdentityParticipation["status"] },
): Promise<SpogomiLinkedTeam | null> {
  if (!params.identity.teamId) return null;

  const teamResult = await supabase
    .from("spogomi_teams")
    .select("id, division_id, team_number, public_name")
    .eq("id", params.identity.teamId)
    .eq("event_id", params.eventId)
    .maybeSingle();
  if (teamResult.error) throw teamResult.error;
  if (!teamResult.data) return null;
  const teamDivisionId = typeof teamResult.data.division_id === "string" ? teamResult.data.division_id : null;

  let divisionType: SpogomiLinkedTeam["divisionType"] = null;
  if (teamDivisionId) {
    const divisionResult = await supabase
      .from("spogomi_divisions")
      .select("division_type")
      .eq("id", teamDivisionId)
      .eq("event_id", params.eventId)
      .maybeSingle();
    if (divisionResult.error) throw divisionResult.error;
    divisionType = divisionResult.data?.division_type === "casual" || divisionResult.data?.division_type === "world_cup"
      ? divisionResult.data.division_type
      : null;
  }

  const projection = await loadSpogomiResultsProjection({
    supabase,
    eventId: params.eventId,
    publicOnly: true,
  });
  const divisionResults = projection?.event?.mode === "mixed"
    ? teamDivisionId ? projection.results.divisions?.find((division) => division.id === teamDivisionId) ?? null : null
    : projection?.results ?? null;
  const sport = divisionResults ? mapPublishedTeamResult(divisionResults.sport.entries, params.identity.teamId) : null;
  const butts = divisionResults ? mapPublishedTeamResult(divisionResults.butts.entries, params.identity.teamId) : null;

  return {
    publicName: String(teamResult.data.public_name),
    teamNumber: Number(teamResult.data.team_number),
    divisionType,
    attendanceStatus: params.identity.attendanceStatus,
    participationStatus: params.participationStatus,
    publishedResults: sport || butts ? { sport, butts } : null,
  };
}

async function loadStoredParticipation(
  supabase: SupabaseClient,
  identity: VerifiedSpogomiIdentity,
  clerkId: string,
): Promise<SpogomiIdentityParticipation> {
  if (identity.actionPhase === "pre_action" || identity.actionPhase === "post_action_draft") {
    const record = await readActionRegistrationRecord(supabase, {
      actionId: identity.actionId,
      userId: clerkId,
    });
    return {
      status: record?.registration_status ?? "not_requested",
      store: "action_registrations",
    };
  }
  if (identity.actionPhase === "post_action_complete") {
    const record = await readParticipantRecord(supabase, {
      actionId: identity.actionId,
      userId: clerkId,
    });
    return {
      status: record?.participation_status ?? "not_requested",
      store: "action_participants",
    };
  }
  return { status: "unavailable", store: null };
}

function resolveIdentityState(
  participation: SpogomiIdentityParticipation,
): SpogomiIdentityState {
  if (participation.status === "pending") return "participation_pending";
  if (participation.status === "confirmed") return "participation_confirmed";
  if (participation.status === "cancelled") return "participation_cancelled";
  if (participation.status === "unavailable") return "participation_unavailable";
  return "identity_verified";
}

function buildIdentityStateResult(
  identity: VerifiedSpogomiIdentity | null,
  participation: SpogomiIdentityParticipation,
  team: SpogomiLinkedTeam | null = null,
): SpogomiIdentityStateResult {
  if (!identity) {
    return {
      state: "identity_unlinked",
      participantId: null,
      actionId: null,
      attendanceStatus: "unknown",
      participation: { status: "not_requested", store: null },
      team: null,
    };
  }
  return {
    state: resolveIdentityState(participation),
    participantId: identity.participantId,
    actionId: identity.actionId,
    attendanceStatus: identity.attendanceStatus,
    participation,
    team,
  };
}

export async function loadSpogomiIdentityState(
  supabase: SupabaseClient,
  params: { eventId: string; clerkId: string },
): Promise<SpogomiIdentityStateResult> {
  const identity = await loadVerifiedSpogomiIdentity(supabase, params);
  if (!identity) return buildIdentityStateResult(null, { status: "not_requested", store: null });
  const participation = await loadStoredParticipation(supabase, identity, params.clerkId);
  return buildIdentityStateResult(identity, participation, await loadLinkedTeam(supabase, {
    eventId: params.eventId,
    identity,
    participationStatus: participation.status,
  }));
}

export async function resumeSpogomiIdentityParticipation(
  supabase: SupabaseClient,
  params: { eventId: string; clerkId: string },
): Promise<SpogomiIdentityStateResult> {
  const identity = await loadVerifiedSpogomiIdentity(supabase, params);
  if (!identity) throw createIdentityNotFoundError();

  const existing = await loadStoredParticipation(supabase, identity, params.clerkId);
  if (existing.status !== "not_requested") {
    return buildIdentityStateResult(identity, existing, await loadLinkedTeam(supabase, {
      eventId: params.eventId,
      identity,
      participationStatus: existing.status,
    }));
  }
  if (!identity.actionPhase) {
    return buildIdentityStateResult(identity, { status: "unavailable", store: null }, await loadLinkedTeam(supabase, {
      eventId: params.eventId,
      identity,
      participationStatus: "unavailable",
    }));
  }

  const participation = await requestCleanMyMapParticipation(supabase, {
    actionId: identity.actionId,
    clerkId: params.clerkId,
    actionPhase: identity.actionPhase,
  });
  return buildIdentityStateResult(identity, participation, await loadLinkedTeam(supabase, {
    eventId: params.eventId,
    identity,
    participationStatus: participation.status,
  }));
}
