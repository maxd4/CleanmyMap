export type SpogomiTeamRefereeStatus =
  | "to_assign"
  | "pending_validation"
  | "assigned"
  | "unavailable";

export const SPOGOMI_TEAM_REFEREE_STATUS_LABELS: Record<
  SpogomiTeamRefereeStatus,
  string
> = {
  to_assign: "À affecter",
  pending_validation: "En attente de validation",
  assigned: "Affecté",
  unavailable: "Indisponible",
};

export type SpogomiTeamRefereePrivateProjection = {
  teamId: string;
  divisionId: string;
  status: SpogomiTeamRefereeStatus;
  refereeClerkId: string | null;
  refereeDisplayName: string | null;
  assignedAt: string | null;
  conflictReason: string | null;
};

export type SpogomiTeamRefereeCandidate = {
  clerkId: string;
  displayName: string;
  divisionId: string;
  assignedTeamId: string | null;
  assignedTeamName: string | null;
};

export type SpogomiTeamRefereeReadiness = {
  ready: boolean;
  totalTeams: number;
  assignedCount: number;
  unassignedTeamIds: string[];
  pendingTeamIds: string[];
  unavailableTeamIds: string[];
  conflicts: Array<{
    refereeClerkId: string;
    teamIds: string[];
    reason: string;
  }>;
};

export function teamRefereeStatusLabel(status: SpogomiTeamRefereeStatus): string {
  return SPOGOMI_TEAM_REFEREE_STATUS_LABELS[status];
}

export function deriveSpogomiTeamRefereeStatus(params: {
  hasActiveAssignment: boolean;
  isParticipantInEvent: boolean;
  hasActiveReviewerRole: boolean;
  applicationStatus: string | null;
  applicationRegulationVersion: string | null;
  divisionRegulationVersion: string | null;
  applicationQuizVersion?: string | null;
  divisionQuizVersion?: string | null;
  hasQuizProof: boolean;
  hasPracticalConfirmation: boolean;
}): { status: SpogomiTeamRefereeStatus; conflictReason: string | null } {
  if (!params.hasActiveAssignment) {
    return { status: "to_assign", conflictReason: null };
  }
  if (params.isParticipantInEvent) {
    return {
      status: "unavailable",
      conflictReason: "Le compte figure aussi parmi les compétiteurs inscrits.",
    };
  }
  if (!params.hasActiveReviewerRole) {
    return {
      status: "unavailable",
      conflictReason: "L’habilitation arbitre de l’édition a été révoquée.",
    };
  }
  if (
    !params.applicationStatus ||
    params.applicationStatus === "refused" ||
    params.applicationStatus === "revoked"
  ) {
    return {
      status: "unavailable",
      conflictReason: "La qualification arbitre n’est plus valide.",
    };
  }
  const hasValidDivisionRegulation = Boolean(params.divisionRegulationVersion);
  const hasValidQuizVersion =
    Boolean(params.divisionQuizVersion) &&
    Boolean(params.applicationQuizVersion) &&
    params.applicationQuizVersion === params.divisionQuizVersion;
  if (
    params.applicationStatus !== "habilitated" ||
    !hasValidDivisionRegulation ||
    params.applicationRegulationVersion !== params.divisionRegulationVersion ||
    !hasValidQuizVersion ||
    !params.hasQuizProof ||
    !params.hasPracticalConfirmation
  ) {
    return {
      status: "pending_validation",
      conflictReason: "Requalification ou validation pratique requise sur le règlement courant.",
    };
  }
  return { status: "assigned", conflictReason: null };
}

export function computeSpogomiTeamRefereeReadiness(params: {
  teams: Array<{ id: string }>;
  assignments: SpogomiTeamRefereePrivateProjection[];
}): SpogomiTeamRefereeReadiness {
  const byTeamId = new Map(params.assignments.map((item) => [item.teamId, item]));
  const teamsByReferee = new Map<string, string[]>();
  const unassignedTeamIds: string[] = [];
  const pendingTeamIds: string[] = [];
  const unavailableTeamIds: string[] = [];
  let assignedCount = 0;

  for (const team of params.teams) {
    const entry = byTeamId.get(team.id);
    const status = entry?.status ?? "to_assign";
    if (entry?.refereeClerkId) {
      const list = teamsByReferee.get(entry.refereeClerkId) ?? [];
      list.push(team.id);
      teamsByReferee.set(entry.refereeClerkId, list);
    }
    if (status === "assigned") assignedCount += 1;
    else if (status === "pending_validation") pendingTeamIds.push(team.id);
    else if (status === "unavailable") unavailableTeamIds.push(team.id);
    else unassignedTeamIds.push(team.id);
  }

  const conflicts: SpogomiTeamRefereeReadiness["conflicts"] = [];
  for (const [refereeClerkId, teamIds] of teamsByReferee.entries()) {
    if (teamIds.length > 1) {
      conflicts.push({
        refereeClerkId,
        teamIds,
        reason: "Un même arbitre référent est affecté à plusieurs équipes.",
      });
    }
  }

  return {
    ready:
      params.teams.length > 0 &&
      assignedCount === params.teams.length &&
      conflicts.length === 0,
    totalTeams: params.teams.length,
    assignedCount,
    unassignedTeamIds,
    pendingTeamIds,
    unavailableTeamIds,
    conflicts,
  };
}

export function formatSpogomiTeamMobilizedSummary(
  divisionType: "casual" | "world_cup",
  competitorCount: number,
): string {
  if (divisionType === "world_cup") {
    return competitorCount === 3
      ? "3 compétiteurs + 1 arbitre référent (4 personnes mobilisées)"
      : `${competitorCount} compétiteur(s) / 3 requis + 1 arbitre référent`;
  }
  return `${competitorCount} compétiteur(s) + 1 arbitre référent`;
}
