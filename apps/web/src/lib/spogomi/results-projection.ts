import {
  calculateSpogomiCompetitionResult,
} from "./scoring";
import { buildSpogomiRegulation } from "./regulation";
import { toSpogomiResultItemInput } from "./result-input";
import type { SpogomiCompetitionResult, SpogomiRegulation } from "./types";

export type SpogomiPublicResultsVisibility = "hidden" | "provisional" | "certified";

export type SpogomiResultsSource = {
  event: {
    id: string;
    actionId: string;
    name: string;
    locationLabel: string;
    mode: "casual" | "world_cup";
    state: string;
    startsAt: string;
    endsAt: string | null;
    regulationVersion: string;
    regulationStatus: "incomplete" | "complete";
    regulationSourceReference: string | null;
    regulationConfig: unknown;
    teamSizeConfig: unknown;
    publicResultsVisibility: SpogomiPublicResultsVisibility;
  };
  categories: Array<{
    id: string;
    event_id: string;
    regulation_version: string;
    code: string;
    label: string;
    measurement_kind: "mass" | "count" | "volume";
    unit: string;
    coefficient: number | string | null;
    coefficient_status: "unknown" | "confirmed" | "not_applicable";
    environmental_category_slug: string | null;
    display_order: number;
    is_complete: boolean;
  }>;
  teams: Array<{ id: string; team_number: number; public_name: string; certified_submission_id: string | null }>;
  submissions: Array<{ id: string; team_id: string; version: number; status: string; submitted_at: string | null; updated_at: string }>;
  items: Array<Record<string, unknown>>;
  participants: Array<{ id: string; team_id: string | null; registration_status: string; attendance_status: string }>;
  officialRankings: Array<{ team_id: string; kind: "points" | "butts"; rank: number; status: "certified" | "revoked"; team_eligible: boolean; decision_version: string; source_reference: string }>;
  consolidation: { projection: Record<string, unknown>; published_at: string } | null;
  actionIsPublished: boolean;
};

export type SpogomiPublicRankingEntry = {
  teamNumber: number;
  publicName: string;
  rank: number | null;
  status: "certified" | "provisional" | "unavailable";
  eligible: boolean;
  reason: string | null;
  score: number | null;
  countedButts: number | null;
  presentParticipants: number;
  numerator: number | null;
  denominator: number;
  valueUnit: "points" | "mégots/participant";
  scoreResult: SpogomiCompetitionResult | null;
};

export type SpogomiPublicResults = {
  visibility: SpogomiPublicResultsVisibility;
  regulationVersion: string;
  regulationComplete: boolean;
  refreshedAt: string;
  sport: {
    status: "hidden" | "certified" | "provisional" | "unavailable";
    reason: string | null;
    entries: SpogomiPublicRankingEntry[];
  };
  butts: {
    status: "hidden" | "certified" | "provisional" | "unavailable";
    reason: string | null;
    entries: SpogomiPublicRankingEntry[];
  };
  environmental: {
    status: "available" | "unavailable";
    totalWasteMassGrams: number | null;
    cigaretteButtsMassGrams: number | null;
    cigaretteButtsCount: number | null;
    participantsPresent: number | null;
    projectionVersion: string | null;
    sourceHash: string | null;
  };
};

export type SpogomiExportTeam = {
  teamId: string;
  teamNumber: number;
  publicName: string;
  registeredParticipants: number;
  presentParticipants: number;
  submissionStatus: string | null;
  submissionVersion: number | null;
  sportRank: number | null;
  sportStatus: string;
  sportScore: number | null;
  buttsRank: number | null;
  buttsStatus: string;
  buttsCount: number | null;
  buttsPerParticipant: number | null;
  categories: Array<{
    code: string;
    label: string;
    measurementKind: string;
    unit: string;
    quantity: number | null;
    massGrams: number | null;
    objectCount: number | null;
    environmentalCategorySlug: string | null;
    provenance: string;
    measurementMethod: string | null;
    submissionStatus: string | null;
  }>;
};

export type SpogomiExportProjection = {
  event: SpogomiResultsSource["event"];
  regulation: SpogomiRegulation;
  results: SpogomiPublicResults;
  teams: SpogomiExportTeam[];
  consolidation: Record<string, unknown> | null;
  categories: SpogomiResultsSource["categories"];
  sourceSubmissionIds: string[];
};

type TeamComputed = {
  team: SpogomiResultsSource["teams"][number];
  submission: SpogomiResultsSource["submissions"][number] | null;
  result: SpogomiCompetitionResult | null;
  presentParticipants: number;
  registeredParticipants: number;
  items: Array<Record<string, unknown>>;
};

function sourceEvent(event: SpogomiResultsSource["event"]) {
  return {
    id: event.id,
    name: event.name,
    event_slug: null,
    mode: event.mode,
    state: event.state,
    regulation_version: event.regulationVersion,
    regulation_status: event.regulationStatus,
    regulation_source_reference: event.regulationSourceReference,
    regulation_config: event.regulationConfig,
    team_size_config: event.teamSizeConfig,
  };
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function latestSubmission(teamId: string, submissions: SpogomiResultsSource["submissions"], certifiedId: string | null) {
  const certified = certifiedId ? submissions.find((submission) => submission.id === certifiedId) : null;
  if (certified) return certified;
  return submissions
    .filter((submission) => submission.team_id === teamId)
    .sort((left, right) => right.version - left.version || right.updated_at.localeCompare(left.updated_at) || left.id.localeCompare(right.id))[0] ?? null;
}

function rankBy(entries: TeamComputed[], kind: "points" | "butts"): Map<string, number> {
  const comparable = entries.filter((entry) => {
    if (!entry.result) return false;
    return kind === "points" ? entry.result.officialScore !== null : entry.result.comparableForButtsPerParticipant;
  });
  comparable.sort((left, right) => {
    if (kind === "points") {
      const score = (right.result?.officialScore ?? 0) - (left.result?.officialScore ?? 0);
      if (score) return score;
      const mass = (right.result?.physicalTotals.massGrams ?? -1) - (left.result?.physicalTotals.massGrams ?? -1);
      if (mass) return mass;
      const objects = (right.result?.physicalTotals.countedObjects ?? -1) - (left.result?.physicalTotals.countedObjects ?? -1);
      if (objects) return objects;
    } else {
      const ratio = (left.result?.buttsPerParticipant ?? Number.POSITIVE_INFINITY) - (right.result?.buttsPerParticipant ?? Number.POSITIVE_INFINITY);
      if (ratio) return ratio;
      const count = (right.result?.physicalTotals.countedButts ?? -1) - (left.result?.physicalTotals.countedButts ?? -1);
      if (count) return count;
    }
    return left.team.team_number - right.team.team_number || left.team.id.localeCompare(right.team.id);
  });
  return new Map(comparable.map((entry, index) => [entry.team.id, index + 1]));
}

function currentOfficialRankings(source: SpogomiResultsSource, kind: "points" | "butts") {
  return new Map(source.officialRankings.filter((ranking) => ranking.kind === kind && ranking.status === "certified").map((ranking) => [ranking.team_id, ranking]));
}

function buildRankingEntries(params: {
  source: SpogomiResultsSource;
  computed: TeamComputed[];
  kind: "points" | "butts";
  regulationComplete: boolean;
}): SpogomiPublicRankingEntry[] {
  const { source, computed, kind, regulationComplete } = params;
  const official = currentOfficialRankings(source, kind);
  const hasOfficialSet = source.event.state === "certified" && computed.every((entry) => {
    if (!entry.result) return false;
    const eligible = kind === "points" ? entry.result.officialScore !== null : entry.result.comparableForButtsPerParticipant;
    return !eligible || official.has(entry.team.id);
  });
  const canShowProvisional = source.event.publicResultsVisibility === "provisional" || source.event.publicResultsVisibility === "certified";
  const provisionalEntries = computed.filter((entry) => entry.submission && ["submitted", "provisional", "certified"].includes(entry.submission.status));
  const rankingSource = source.event.publicResultsVisibility === "certified"
    ? computed.filter((entry) => entry.submission?.status === "certified")
    : provisionalEntries;
  const ranking = rankBy(rankingSource, kind);
  const entries = computed.map((entry): SpogomiPublicRankingEntry => {
    const result = entry.result;
    const comparable = Boolean(result && (kind === "points" ? result.officialScore !== null : result.comparableForButtsPerParticipant));
    const eligible = kind === "points" ? Boolean(result && result.ineligibleReason === null) : comparable;
    const selected = rankingSource.includes(entry);
    const publishedOfficial = hasOfficialSet && entry.submission?.status === "certified" ? official.get(entry.team.id) ?? null : null;
    const status = !eligible || !canShowProvisional || !selected ? "unavailable" : source.event.publicResultsVisibility === "certified" ? (publishedOfficial ? "certified" : "unavailable") : publishedOfficial ? "certified" : "provisional";
    const reason = !regulationComplete && kind === "points"
      ? "Règlement incomplet : aucun classement sportif officiel calculé."
      : !entry.submission
        ? "Aucun résultat publié pour cette équipe."
        : !comparable
          ? kind === "butts" ? "Non comparable : comptage direct et présence vérifiée requis." : result?.ineligibleReason ?? "Résultat non éligible."
          : status === "unavailable" ? "Résultat non publié." : null;
    return {
      teamNumber: entry.team.team_number,
      publicName: entry.team.public_name,
      rank: status === "certified" ? (publishedOfficial?.rank ?? null) : status === "provisional" ? (ranking.get(entry.team.id) ?? null) : null,
      status,
      eligible,
      reason,
      score: kind === "points" && regulationComplete ? result?.officialScore ?? null : null,
      countedButts: result?.physicalTotals.countedButts ?? null,
      presentParticipants: entry.presentParticipants,
      numerator: result?.physicalTotals.countedButts ?? null,
      denominator: entry.presentParticipants,
      valueUnit: kind === "points" ? "points" : "mégots/participant",
      scoreResult: result,
    };
  });
  return entries.sort((left, right) => (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER) || left.teamNumber - right.teamNumber);
}

export function buildSpogomiResultsProjection(source: SpogomiResultsSource, refreshedAt = new Date().toISOString()): SpogomiExportProjection {
  const regulation = buildSpogomiRegulation(sourceEvent(source.event), source.categories);
  const regulationComplete = regulation.status === "complete" && regulation.categories.every((category) => category.isComplete);
  const computed: TeamComputed[] = source.teams.map((team) => {
    const submission = latestSubmission(team.id, source.submissions, team.certified_submission_id);
    const items = submission ? source.items.filter((item) => String(item.submission_id) === submission.id) : [];
    const itemInputs = items.map((item) => toSpogomiResultItemInput(item, source.categories.find((category) => category.id === String(item.category_rule_id))?.code ?? ""));
    const teamParticipants = source.participants.filter((participant) => participant.team_id === team.id && participant.registration_status === "registered");
    const presentParticipants = teamParticipants.filter((participant) => participant.attendance_status === "present").length;
    return {
      team,
      submission,
      result: submission ? calculateSpogomiCompetitionResult({ regulation, items: itemInputs, presentParticipants, submissionStatus: submission.status as "submitted" | "provisional" | "certified" }) : null,
      presentParticipants,
      registeredParticipants: teamParticipants.length,
      items,
    };
  });
  const publicResults: SpogomiPublicResults = {
    visibility: source.event.publicResultsVisibility,
    regulationVersion: regulation.version,
    regulationComplete,
    refreshedAt,
    sport: source.event.publicResultsVisibility === "hidden"
      ? { status: "hidden", reason: "Les résultats sportifs ne sont pas publiés.", entries: [] }
      : !regulationComplete
        ? { status: "unavailable", reason: "Règlement incomplet : aucun classement sportif officiel calculé.", entries: buildRankingEntries({ source, computed, kind: "points", regulationComplete }) }
        : (() => { const entries = buildRankingEntries({ source, computed, kind: "points", regulationComplete }); const status = entries.some((entry) => entry.status === "provisional") ? "provisional" : entries.every((entry) => entry.status === "certified" || entry.status === "unavailable") && entries.some((entry) => entry.status === "certified") ? "certified" : "unavailable"; return { status, reason: status === "unavailable" ? "Classement sportif certifié non publié pour les équipes éligibles." : null, entries }; })(),
    butts: source.event.publicResultsVisibility === "hidden"
      ? { status: "hidden", reason: "Les résultats ne sont pas publiés.", entries: [] }
      : (() => { const entries = buildRankingEntries({ source, computed, kind: "butts", regulationComplete }); const status = entries.some((entry) => entry.status === "provisional") ? "provisional" : entries.every((entry) => entry.status === "certified" || entry.status === "unavailable") && entries.some((entry) => entry.status === "certified") ? "certified" : "unavailable"; return { status, reason: null, entries }; })(),
    environmental: source.actionIsPublished && source.consolidation?.projection
      ? {
          status: "available",
          totalWasteMassGrams: parseNumber(source.consolidation.projection.totalWasteMassGrams),
          cigaretteButtsMassGrams: parseNumber(source.consolidation.projection.cigaretteButtsMassGrams),
          cigaretteButtsCount: parseNumber(source.consolidation.projection.cigaretteButtsCount),
          participantsPresent: parseNumber(source.consolidation.projection.participantsPresent),
          projectionVersion: typeof source.consolidation.projection.projectionVersion === "string" ? source.consolidation.projection.projectionVersion : null,
          sourceHash: typeof source.consolidation.projection.sourceHash === "string" ? source.consolidation.projection.sourceHash : null,
        }
      : { status: "unavailable", totalWasteMassGrams: null, cigaretteButtsMassGrams: null, cigaretteButtsCount: null, participantsPresent: null, projectionVersion: null, sourceHash: null },
  };
  const sportByTeam = new Map(publicResults.sport.entries.map((entry) => [entry.teamNumber, entry]));
  const buttsByTeam = new Map(publicResults.butts.entries.map((entry) => [entry.teamNumber, entry]));
  const exportTeams = computed.map((entry): SpogomiExportTeam => {
    const sport = sportByTeam.get(entry.team.team_number);
    const butts = buttsByTeam.get(entry.team.team_number);
    return {
      teamId: entry.team.id,
      teamNumber: entry.team.team_number,
      publicName: entry.team.public_name,
      registeredParticipants: entry.registeredParticipants,
      presentParticipants: entry.presentParticipants,
      submissionStatus: entry.submission?.status ?? null,
      submissionVersion: entry.submission?.version ?? null,
      sportRank: sport?.rank ?? null,
      sportStatus: sport?.status ?? "unavailable",
      sportScore: sport?.score ?? null,
      buttsRank: butts?.rank ?? null,
      buttsStatus: butts?.status ?? "unavailable",
      buttsCount: entry.result?.physicalTotals.countedButts ?? null,
      buttsPerParticipant: entry.result?.buttsPerParticipant ?? null,
      categories: source.categories.map((category) => {
        const item = entry.items.find((candidate) => String(candidate.category_rule_id) === category.id);
        return {
          code: category.code,
          label: category.label,
          measurementKind: category.measurement_kind,
          unit: category.unit,
          quantity: parseNumber(item?.quantity),
          massGrams: parseNumber(item?.mass_grams),
          objectCount: parseNumber(item?.object_count),
          environmentalCategorySlug: category.environmental_category_slug,
          provenance: typeof item?.provenance === "string" ? item.provenance : "",
          measurementMethod: typeof item?.measurement_method === "string" ? item.measurement_method : null,
          submissionStatus: entry.submission?.status ?? null,
        };
      }),
    };
  });
  const sourceSubmissionIds = computed.map((entry) => entry.team.certified_submission_id).filter((id): id is string => Boolean(id));
  return { event: source.event, regulation, results: publicResults, teams: exportTeams, consolidation: source.consolidation?.projection ?? null, categories: source.categories, sourceSubmissionIds };
}
