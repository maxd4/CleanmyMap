import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readAllSpogomiPages } from "./pagination";
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

const CLERK_USER_LIST_BATCH_SIZE = 100;

async function resolvePrivateDisplayNames(clerkIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(clerkIds.map((id) => id.trim()).filter(Boolean)));
  const names = new Map<string, string>();
  if (!uniqueIds.length) return names;
  try {
    const client = await clerkClient();
    for (let index = 0; index < uniqueIds.length; index += CLERK_USER_LIST_BATCH_SIZE) {
      const batch = uniqueIds.slice(index, index + CLERK_USER_LIST_BATCH_SIZE);
      const result = await client.users.getUserList({
        userId: batch,
        limit: CLERK_USER_LIST_BATCH_SIZE,
      });
      for (const user of result.data) {
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
        const displayName = fullName || user.username?.trim() || user.id;
        names.set(user.id, displayName);
      }
    }
  } catch {
    // Fallback to Clerk IDs in private organizer views if Clerk lookup is unavailable.
  }
  return names;
}

type RawTeamRow = { id: string; division_id: string; public_name: string };
type RawDivisionRow = { id: string; regulation_version: string | null };
type RawAssignmentRow = { team_id: string; division_id: string; referee_clerk_id: string; assigned_at: string };
type RawReviewerRow = { clerk_id: string; role: string; revoked_at: string | null };
type RawApplicationRow = {
  clerk_id: string;
  division_id: string;
  status: string;
  regulation_version: string | null;
  quiz_version?: string | null;
  theory_proof_id: string | null;
  practical_confirmed_at: string | null;
};
type RawParticipantRow = { clerk_id: string | null; registration_status: string };

async function loadDivisionQuizVersions(params: {
  supabase: SupabaseClient;
  eventId: string;
  divisionIds: string[];
}): Promise<Map<string, string | null>> {
  const quizVersions = new Map<string, string | null>();
  if (!params.divisionIds.length || typeof params.supabase.rpc !== "function") {
    return quizVersions;
  }
  const results = await Promise.all(
    params.divisionIds.map(async (divisionId) => {
      try {
        const res = await params.supabase.rpc("spogomi_referee_quiz_definition_internal", {
          p_event_id: params.eventId,
          p_division_id: divisionId,
        });
        if (res?.error || !res?.data || typeof res.data !== "object") {
          return [divisionId, null] as const;
        }
        const payload = res.data as { quizVersion?: unknown; available?: unknown };
        if (payload.available === false || typeof payload.quizVersion !== "string" || !payload.quizVersion.trim()) {
          return [divisionId, null] as const;
        }
        return [divisionId, payload.quizVersion] as const;
      } catch {
        return [divisionId, null] as const;
      }
    }),
  );
  for (const [divisionId, quizVersion] of results) {
    if (quizVersion !== undefined) {
      quizVersions.set(divisionId, quizVersion);
    }
  }
  return quizVersions;
}

export async function loadSpogomiTeamRefereeState(params: {
  supabase: SupabaseClient;
  eventId: string;
  eventRegulationVersion?: string | null;
  divisions?: RawDivisionRow[];
  teams: RawTeamRow[];
  includeIdentityNames?: boolean;
  registeredParticipantClerkIds?: Set<string>;
}): Promise<{
  teamReferees: SpogomiTeamRefereePrivateProjection[];
  refereeCandidates: SpogomiTeamRefereeCandidate[];
}> {
  const [assignments, reviewers, applications, participants, divisions] = await Promise.all([
    readAllSpogomiPages<RawAssignmentRow & { revoked_at?: string | null }>(
      "team referee assignments",
      (from, to) =>
        params.supabase
          .from("spogomi_team_referee_assignments")
          .select("team_id, division_id, referee_clerk_id, assigned_at, revoked_at")
          .eq("event_id", params.eventId)
          .is("revoked_at", null)
          .order("team_id", { ascending: true })
          .range(from, to),
    ),
    readAllSpogomiPages<RawReviewerRow>(
      "event referee reviewers",
      (from, to) =>
        params.supabase
          .from("spogomi_event_reviewers")
          .select("clerk_id, role, revoked_at")
          .eq("event_id", params.eventId)
          .eq("role", "referee")
          .is("revoked_at", null)
          .order("clerk_id", { ascending: true })
          .range(from, to),
    ),
    readAllSpogomiPages<RawApplicationRow>(
      "referee applications",
      (from, to) =>
        params.supabase
          .from("spogomi_referee_applications")
          .select(
            "clerk_id, division_id, status, regulation_version, quiz_version, theory_proof_id, practical_confirmed_at",
          )
          .eq("event_id", params.eventId)
          .order("division_id", { ascending: true })
          .order("clerk_id", { ascending: true })
          .range(from, to),
    ),
    params.registeredParticipantClerkIds
      ? Promise.resolve([] as RawParticipantRow[])
      : readAllSpogomiPages<RawParticipantRow>(
          "registered event participants",
          (from, to) =>
            params.supabase
              .from("spogomi_participants")
              .select("clerk_id, registration_status")
              .eq("event_id", params.eventId)
              .eq("registration_status", "registered")
              .order("id", { ascending: true })
              .range(from, to),
        ),
    params.divisions
      ? Promise.resolve(params.divisions)
      : readAllSpogomiPages<RawDivisionRow>(
          "event divisions",
          (from, to) =>
            params.supabase
              .from("spogomi_divisions")
              .select("id, regulation_version")
              .eq("event_id", params.eventId)
              .order("id", { ascending: true })
              .range(from, to),
        ),
  ]);

  const activeAssignments = assignments.filter((row) => !row.revoked_at);
  const activeReviewers = reviewers.filter(
    (row) => row.role === "referee" && !row.revoked_at,
  );
  const activeReviewerIds = new Set(activeReviewers.map((r) => r.clerk_id));
  const participantIds =
    params.registeredParticipantClerkIds ??
    new Set(
      participants
        .filter((p) => p.registration_status === "registered")
        .map((p) => p.clerk_id)
        .filter((id): id is string => Boolean(id)),
    );
  const divisionRegulationById = new Map(
    divisions.map((division) => [division.id, division.regulation_version]),
  );
  const relevantDivisionIds = Array.from(
    new Set([
      ...divisions.map((d) => d.id),
      ...params.teams.map((t) => t.division_id),
      ...applications.map((a) => a.division_id),
    ].filter(Boolean)),
  );
  const divisionQuizVersionById = await loadDivisionQuizVersions({
    supabase: params.supabase,
    eventId: params.eventId,
    divisionIds: relevantDivisionIds,
  });

  const appByKey = new Map(
    applications.map((app) => [`${app.division_id}:${app.clerk_id}`, app]),
  );
  const assignmentByTeamId = new Map(activeAssignments.map((a) => [a.team_id, a]));
  const assignmentByRefereeId = new Map(activeAssignments.map((a) => [a.referee_clerk_id, a]));
  const teamById = new Map(params.teams.map((t) => [t.id, t]));

  const allRefereeIds = [
    ...activeAssignments.map((a) => a.referee_clerk_id),
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
    const divisionRegulationVersion = divisionRegulationById.get(team.division_id) ?? null;
    const divisionQuizVersion = divisionQuizVersionById.get(team.division_id) ?? null;
    const derived = deriveSpogomiTeamRefereeStatus({
      hasActiveAssignment: true,
      isParticipantInEvent: participantIds.has(active.referee_clerk_id),
      hasActiveReviewerRole: activeReviewerIds.has(active.referee_clerk_id),
      applicationStatus: app?.status ?? null,
      applicationRegulationVersion: app?.regulation_version ?? null,
      divisionRegulationVersion,
      applicationQuizVersion: app?.quiz_version ?? null,
      divisionQuizVersion,
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
        .filter((app) => {
          const divisionRegulationVersion = divisionRegulationById.get(app.division_id) ?? null;
          const divisionQuizVersion = divisionQuizVersionById.get(app.division_id) ?? null;
          const quizMatches =
            Boolean(divisionQuizVersion) &&
            Boolean(app.quiz_version) &&
            app.quiz_version === divisionQuizVersion;
          return (
            app.status === "habilitated" &&
            Boolean(divisionRegulationVersion) &&
            app.regulation_version === divisionRegulationVersion &&
            quizMatches &&
            Boolean(app.theory_proof_id) &&
            Boolean(app.practical_confirmed_at) &&
            activeReviewerIds.has(app.clerk_id) &&
            !participantIds.has(app.clerk_id)
          );
        })
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
  eventRegulationVersion?: string | null;
  divisions?: RawDivisionRow[];
  teams: Array<{ id: string; division_id: string }>;
}): Promise<Map<string, SpogomiTeamRefereeStatus>> {
  const { teamReferees } = await loadSpogomiTeamRefereeState({
    supabase: params.supabase,
    eventId: params.eventId,
    eventRegulationVersion: params.eventRegulationVersion,
    divisions: params.divisions,
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
