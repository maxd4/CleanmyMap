import type { SpogomiDivisionType } from "./types";

export const SPOGOMI_TEAM_CLOSURE_STATUSES = [
  "present_measured",
  "absent",
  "forfeit",
  "excluded",
  "disqualified",
  "result_missing",
  "contested",
] as const;

export type SpogomiTeamClosureStatus = (typeof SPOGOMI_TEAM_CLOSURE_STATUSES)[number];
export type SpogomiEnvironmentalEligibility = "eligible" | "excluded" | "unknown";

export type SpogomiTeamClosureDecision = {
  teamId: string;
  divisionId: string;
  status: SpogomiTeamClosureStatus;
  sportEligible: boolean;
  environmentalEligibility: SpogomiEnvironmentalEligibility;
  decisionVersion: number;
  reason: string;
};

export type SpogomiClosureTeamInput = {
  teamId: string;
  divisionId: string;
  certifiedSubmission: boolean;
  decision?: SpogomiTeamClosureDecision | null;
};

export type SpogomiClosureDivisionInput = {
  id: string;
  type: SpogomiDivisionType;
  regulationComplete: boolean;
  officialRankingCount: number;
  teams: SpogomiClosureTeamInput[];
};

export type SpogomiClosureSummary = {
  fieldCompetition: "not_started" | "finished";
  arbitration: "ongoing" | "complete";
  rankings: "provisional" | "certified" | "published" | "blocked";
  environmental: "pending" | "consolidated" | "blocked";
  action: "pending" | "approved" | "published";
  individualRequests: "pending" | "complete";
  blockers: string[];
  certificationsRemaining: number;
  divisions: Array<{
    id: string;
    type: SpogomiDivisionType;
    regulationComplete: boolean;
    sportEligibleTeams: number;
    certifiedTeams: number;
    officialRankingCount: number;
    blockers: string[];
  }>;
};

const explicitNonParticipants = new Set<SpogomiTeamClosureStatus>(["absent", "forfeit"]);
const sportExcluded = new Set<SpogomiTeamClosureStatus>(["absent", "forfeit", "excluded", "disqualified", "result_missing", "contested"]);

export function defaultSpogomiTeamClosureDecision(team: Pick<SpogomiClosureTeamInput, "teamId" | "divisionId" | "certifiedSubmission">): SpogomiTeamClosureDecision {
  return team.certifiedSubmission
    ? { teamId: team.teamId, divisionId: team.divisionId, status: "present_measured", sportEligible: true, environmentalEligibility: "eligible", decisionVersion: 0, reason: "Déduction de compatibilité depuis la soumission certifiée courante." }
    : { teamId: team.teamId, divisionId: team.divisionId, status: "result_missing", sportEligible: false, environmentalEligibility: "unknown", decisionVersion: 0, reason: "Aucune décision de clôture explicite ni soumission certifiée." };
}

export function effectiveSpogomiTeamClosureDecision(team: SpogomiClosureTeamInput): SpogomiTeamClosureDecision {
  return team.decision ?? defaultSpogomiTeamClosureDecision(team);
}

export function isSpogomiTeamNonParticipating(status: SpogomiTeamClosureStatus): boolean {
  return explicitNonParticipants.has(status);
}

export function isSpogomiTeamSportExcluded(status: SpogomiTeamClosureStatus): boolean {
  return sportExcluded.has(status);
}

export function deriveSpogomiClosureSummary(input: {
  eventState: string;
  publicResultsVisibility: "hidden" | "provisional" | "certified";
  actionStatus: string | null;
  actionPublishedAt: string | null;
  environmentalConsolidated: boolean;
  pendingIndividualRequests: number;
  divisions: SpogomiClosureDivisionInput[];
}): SpogomiClosureSummary {
  const blockers: string[] = [];
  let certificationsRemaining = 0;
  const divisions = input.divisions.map((division) => {
    const divisionBlockers: string[] = [];
    if (!division.regulationComplete) divisionBlockers.push("regulation_incomplete");
    const effective = division.teams.map(effectiveSpogomiTeamClosureDecision);
    const divisionCertificationsRemaining = effective.filter((decision, index) => {
      const team = division.teams[index];
      return !isSpogomiTeamNonParticipating(decision.status) && (!team.certifiedSubmission || decision.status === "result_missing" || decision.status === "contested");
    }).length;
    if (divisionCertificationsRemaining > 0) divisionBlockers.push("certification_remaining");
    certificationsRemaining += divisionCertificationsRemaining;
    if (effective.some((decision) => decision.status === "contested")) divisionBlockers.push("contested_result");
    const sportEligibleTeams = effective.filter((decision) => decision.sportEligible).length;
    if (sportEligibleTeams > 0 && division.officialRankingCount === 0) divisionBlockers.push("official_ranking_missing");
    if (division.officialRankingCount > 0 && input.publicResultsVisibility === "hidden") divisionBlockers.push("ranking_not_published");
    blockers.push(...divisionBlockers.map((reason) => `${division.id}:${reason}`));
    return {
      id: division.id,
      type: division.type,
      regulationComplete: division.regulationComplete,
      sportEligibleTeams,
      certifiedTeams: division.teams.filter((team) => team.certifiedSubmission).length,
      officialRankingCount: division.officialRankingCount,
      blockers: divisionBlockers,
    };
  });

  const fieldCompetition = ["judging", "certified", "archived"].includes(input.eventState) ? "finished" : "not_started";
  const arbitration = blockers.some((reason) => reason.endsWith("contested_result") || reason.endsWith("certification_remaining")) ? "ongoing" : "complete";
  const allRankingsCertified = divisions.every((division) => division.blockers.every((reason) => reason !== "official_ranking_missing" && reason !== "regulation_incomplete" && reason !== "certification_remaining" && reason !== "contested_result"));
  const rankings = !allRankingsCertified ? (input.publicResultsVisibility === "provisional" ? "provisional" : "blocked") : input.publicResultsVisibility === "certified" ? "published" : "certified";
  const environmentalBlockers = blockers.filter((reason) => reason.endsWith(":regulation_incomplete") || reason.endsWith(":certification_remaining") || reason.endsWith(":contested_result"));
  const environmental = input.environmentalConsolidated ? "consolidated" : environmentalBlockers.length > 0 ? "blocked" : "pending";
  const action = input.actionPublishedAt ? "published" : input.actionStatus === "approved" ? "approved" : "pending";
  return {
    fieldCompetition,
    arbitration,
    rankings,
    environmental,
    action,
    individualRequests: input.pendingIndividualRequests > 0 ? "pending" : "complete",
    blockers,
    certificationsRemaining,
    divisions,
  };
}
