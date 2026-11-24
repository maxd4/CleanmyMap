import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deriveSpogomiTeamRefereeStatus,
  type SpogomiTeamRefereeCandidate,
  type SpogomiTeamRefereePrivateProjection,
  type SpogomiTeamRefereeStatus,
} from "./team-referees";

export class SpogomiTeamRefereeError extends Error {
  constructor(
    message: string,
    public readonly kind: "validation" | "forbidden" | "conflict" | "not_found",
  ) {
    super(message);
    this.name = "SpogomiTeamRefereeError";
  }
}

function mapTeamRefereeRpcError(error: unknown): SpogomiTeamRefereeError {
  const code =
    error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : "";
  const message =
    error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";

  if (message.includes("spogomi_referee_already_assigned_in_event") || code === "23505") {
    return new SpogomiTeamRefereeError(
      "Cet arbitre référent est déjà affecté à une autre équipe de cette édition.",
      "conflict",
    );
  }
  if (message.includes("spogomi_participant_cannot_be_team_referee")) {
    return new SpogomiTeamRefereeError(
      "Un compétiteur inscrit à l’édition ne peut pas être affecté comme arbitre référent.",
      "forbidden",
    );
  }
  if (message.includes("spogomi_referee_not_habilitated_for_division")) {
    return new SpogomiTeamRefereeError(
      "Ce compte n’est pas habilité comme arbitre avec qualification et confirmation pratique valides pour cette division.",
      "forbidden",
    );
  }
  if (message.includes("spogomi_team_referee_organizer_required") || code === "42501") {
    return new SpogomiTeamRefereeError(
      "Seul un organisateur habilité peut gérer l’affectation des arbitres référents.",
      "forbidden",
    );
  }
  if (message.includes("spogomi_event_not_found") || message.includes("spogomi_team_not_found") || code === "P0002") {
    return new SpogomiTeamRefereeError("Équipe ou édition SPOGOMI introuvable.", "not_found");
  }
  return new SpogomiTeamRefereeError(
    "L’affectation de l’arbitre référent n’a pas pu être enregistrée.",
    "validation",
  );
}

async function resolvePrivateDisplayNames(clerkIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(clerkIds.map((id) => id.trim()).filter(Boolean)));
  const names = new Map<string, string>();
  if (!uniqueIds.length) return names;
  try {
    const client = await clerkClient();
    const result = await client.users.getUserList({ userId: uniqueIds, limit: 100 });
    for (const user of result.data) {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
      const displayName = fullName || user.username?.trim() || user.id;
      names.set(user.id, displayName);
    }
  } catch {
    // Fallback to Clerk IDs in private organizer views if Clerk lookup is unavailable.
  }
  return names;
}

type RawTeamRow = { id: string; division_id: string; public_name: string };
type RawAssignmentRow = { team_id: string; division_id: string; referee_clerk_id: string; assigned_at: string };
type RawReviewerRow = { clerk_id: string; role: string; revoked_at: string | null };
type RawApplicationRow = {
  clerk_id: string;
  division_id: string;
  status: string;
  regulation_version: string | null;
  theory_proof_id: string | null;
  practical_confirmed_at: string | null;
};
type RawParticipantRow = { clerk_id: string | null; registration_status: string };

export async function loadSpogomiTeamRefereeState(params: {
  supabase: SupabaseClient;
  eventId: string;
  eventRegulationVersion: string | null;
  teams: RawTeamRow[];
  includeIdentityNames?: boolean;
  registeredParticipantClerkIds?: Set<string>;
}): Promise<{
  teamReferees: SpogomiTeamRefereePrivateProjection[];
  refereeCandidates: SpogomiTeamRefereeCandidate[];
}> {
  const [assignmentsRes, reviewersRes, applicationsRes, participantsRes] = await Promise.all([
    params.supabase
      .from("spogomi_team_referee_assignments")
      .select("team_id, division_id, referee_clerk_id, assigned_at, revoked_at")
      .eq("event_id", params.eventId),
    params.supabase
      .from("spogomi_event_reviewers")
      .select("clerk_id, role, revoked_at")
      .eq("event_id", params.eventId),
    params.supabase
      .from("spogomi_referee_applications")
      .select("clerk_id, division_id, status, regulation_version, theory_proof_id, practical_confirmed_at")
      .eq("event_id", params.eventId),
    params.registeredParticipantClerkIds
      ? Promise.resolve({ data: [], error: null })
      : params.supabase
          .from("spogomi_participants")
          .select("clerk_id, registration_status")
          .eq("event_id", params.eventId),
  ]);

  if (assignmentsRes.error) throw assignmentsRes.error;
  if (reviewersRes.error) throw reviewersRes.error;
  if (applicationsRes.error) throw applicationsRes.error;
  if (participantsRes.error) throw participantsRes.error;

  const assignments = ((assignmentsRes.data ?? []) as Array<RawAssignmentRow & { revoked_at?: string | null }>).filter(
    (row) => !row.revoked_at,
  );
  const reviewers = ((reviewersRes.data ?? []) as RawReviewerRow[]).filter(
    (row) => row.role === "referee" && !row.revoked_at,
  );
  const applications = (applicationsRes.data ?? []) as RawApplicationRow[];
  const participants = (participantsRes.data ?? []) as RawParticipantRow[];

  const activeReviewerIds = new Set(reviewers.map((r) => r.clerk_id));
  const participantIds =
    params.registeredParticipantClerkIds ??
    new Set(
      participants
        .filter((p) => p.registration_status === "registered")
        .map((p) => p.clerk_id)
        .filter((id): id is string => Boolean(id)),
    );
  const appByKey = new Map(
    applications.map((app) => [`${app.division_id}:${app.clerk_id}`, app]),
  );
  const assignmentByTeamId = new Map(assignments.map((a) => [a.team_id, a]));
  const assignmentByRefereeId = new Map(assignments.map((a) => [a.referee_clerk_id, a]));
  const teamById = new Map(params.teams.map((t) => [t.id, t]));

  const allRefereeIds = [
    ...assignments.map((a) => a.referee_clerk_id),
    ...applications.map((a) => a.clerk_id),
  ];
  const displayNames = params.includeIdentityNames
    ? await resolvePrivateDisplayNames(allRefereeIds)
    : new Map<string, string>();

  const teamReferees: SpogomiTeamRefereePrivateProjection[] = params.teams.map((team) => {
    const active = assignmentByTeamId.get(team.id);
    if (!active) {
      return {
        teamId: team.id,
        divisionId: team.division_id,
        status: "to_assign",
        refereeClerkId: null,
        refereeDisplayName: null,
        assignedAt: null,
        conflictReason: null,
      };
    }
    const app = appByKey.get(`${team.division_id}:${active.referee_clerk_id}`);
    const derived = deriveSpogomiTeamRefereeStatus({
      hasActiveAssignment: true,
      isParticipantInEvent: participantIds.has(active.referee_clerk_id),
      hasActiveReviewerRole: activeReviewerIds.has(active.referee_clerk_id),
      applicationStatus: app?.status ?? null,
      applicationRegulationVersion: app?.regulation_version ?? null,
      eventRegulationVersion: params.eventRegulationVersion,
      hasQuizProof: Boolean(app?.theory_proof_id),
      hasPracticalConfirmation: Boolean(app?.practical_confirmed_at),
    });
    return {
      teamId: team.id,
      divisionId: team.division_id,
      status: derived.status,
      refereeClerkId: params.includeIdentityNames ? active.referee_clerk_id : null,
      refereeDisplayName: params.includeIdentityNames
        ? (displayNames.get(active.referee_clerk_id) ?? active.referee_clerk_id)
        : null,
      assignedAt: active.assigned_at,
      conflictReason: derived.conflictReason,
    };
  });

  const refereeCandidates: SpogomiTeamRefereeCandidate[] = params.includeIdentityNames
    ? applications
        .filter(
          (app) =>
            app.status === "habilitated" &&
            app.regulation_version === params.eventRegulationVersion &&
            Boolean(app.theory_proof_id) &&
            Boolean(app.practical_confirmed_at) &&
            activeReviewerIds.has(app.clerk_id) &&
            !participantIds.has(app.clerk_id),
        )
        .map((app) => {
          const activeAssignment = assignmentByRefereeId.get(app.clerk_id);
          const assignedTeam = activeAssignment ? teamById.get(activeAssignment.team_id) : undefined;
          return {
            clerkId: app.clerk_id,
            displayName: displayNames.get(app.clerk_id) ?? app.clerk_id,
            divisionId: app.division_id,
            assignedTeamId: activeAssignment?.team_id ?? null,
            assignedTeamName: assignedTeam?.public_name ?? null,
          };
        })
    : [];

  return { teamReferees, refereeCandidates };
}

export async function loadSpogomiPublicTeamRefereeStatuses(params: {
  supabase: SupabaseClient;
  eventId: string;
  eventRegulationVersion: string | null;
  teams: Array<{ id: string; division_id: string }>;
}): Promise<Map<string, SpogomiTeamRefereeStatus>> {
  const { teamReferees } = await loadSpogomiTeamRefereeState({
    supabase: params.supabase,
    eventId: params.eventId,
    eventRegulationVersion: params.eventRegulationVersion,
    teams: params.teams.map((t) => ({ ...t, public_name: "" })),
    includeIdentityNames: false,
  });
  return new Map(teamReferees.map((item) => [item.teamId, item.status]));
}

export async function assignSpogomiTeamReferee(params: {
  supabase: SupabaseClient;
  eventId: string;
  divisionId: string;
  teamId: string;
  refereeClerkId: string;
  actorClerkId: string;
  reason?: string;
}) {
  const result = await params.supabase.rpc("spogomi_assign_team_referee", {
    p_event_id: params.eventId,
    p_division_id: params.divisionId,
    p_team_id: params.teamId,
    p_referee_clerk_id: params.refereeClerkId,
    p_actor_clerk_id: params.actorClerkId,
    p_reason: params.reason ?? null,
  });
  if (result.error) throw mapTeamRefereeRpcError(result.error);
  return result.data;
}

export async function revokeSpogomiTeamReferee(params: {
  supabase: SupabaseClient;
  eventId: string;
  divisionId: string;
  teamId: string;
  actorClerkId: string;
  reason?: string;
}) {
  const result = await params.supabase.rpc("spogomi_revoke_team_referee", {
    p_event_id: params.eventId,
    p_division_id: params.divisionId,
    p_team_id: params.teamId,
    p_actor_clerk_id: params.actorClerkId,
    p_reason: params.reason ?? null,
  });
  if (result.error) throw mapTeamRefereeRpcError(result.error);
  return result.data;
}
