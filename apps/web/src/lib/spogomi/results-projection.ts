import {
  calculateSpogomiCompetitionResult,
} from "./scoring";
import { buildSpogomiRegulation } from "./regulation";
import { toSpogomiResultItemInput } from "./result-input";
import type { SpogomiCompetitionResult, SpogomiRegulation } from "./types";
import { buildPublicationSourceSnapshot, type SpogomiPublicationSourceSnapshot } from "./results-projection-snapshot";

type SpogomiPublicResultsVisibility = "hidden" | "provisional" | "certified";
import type { SpogomiDivision, SpogomiDivisionType } from "./types";

export type SpogomiResultsSource = {
  event: {
    id: string;
    actionId: string;
    name: string;
    locationLabel: string;
    mode: "casual" | "world_cup" | "mixed";
    divisions?: Array<Pick<SpogomiDivision, "id" | "division_type"> & {
      regulation_version?: string;
      regulation_status?: "incomplete" | "complete";
      regulation_source_reference?: string | null;
      regulation_config?: unknown;
      team_size_config?: unknown;
    }>;
    state: string;
    startsAt: string;
    endsAt: string | null;
    regulationVersion: string;
    regulationStatus: "incomplete" | "complete";
    regulationSourceReference: string | null;
    regulationConfig: unknown;
    teamSizeConfig: unknown;
    publicResultsVisibility: SpogomiPublicResultsVisibility;
    updatedAt?: string;
  };
  categories: Array<{
    id: string;
    event_id: string;
    division_id?: string;
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
    updated_at?: string;
  }>;
  teams: Array<{ id: string; division_id?: string; team_number: number; public_name: string; composition_state: string; certified_submission_id: string | null; updated_at?: string }>;
  submissions: Array<{ id: string; division_id?: string; team_id: string; version: number; status: string; submitted_at: string | null; updated_at: string; regulation_version?: string }>;
  items: Array<Record<string, unknown>>;
  participants: Array<{ id: string; division_id?: string; team_id: string | null; registration_status: string; attendance_status: string; updated_at?: string }>;
  officialRankings: Array<{ division_id?: string; team_id: string; kind: "points" | "butts"; rank: number; status: "certified" | "revoked"; team_eligible: boolean; decision_version: string; source_reference: string; source_snapshot?: SpogomiPublicationSourceSnapshot | null }>;
  consolidation: { projection: Record<string, unknown>; published_at: string } | null;
  actionIsPublished: boolean;
};

type SpogomiPublicRankingEntry = {
  teamId?: string;
  divisionId?: string;
  teamNumber: number;
  publicName: string;
  rank: number | null;
  status: "certified" | "provisional" | "unavailable";
  eligible: boolean;
  reason: string | null;
  score?: number | null;
  countedButts?: number | null;
  presentParticipants?: number | null;
  numerator?: number | null;
  denominator?: number | null;
  valueUnit: "points" | "mégots/participant";
  ratio?: number | null;
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
  divisions?: Array<{
    id: string;
    type: SpogomiDivisionType;
    regulationVersion: string;
    regulationComplete: boolean;
    sport: SpogomiPublicResults["sport"];
    butts: SpogomiPublicResults["butts"];
  }>;
};

type SpogomiExportTeam = {
  teamId: string;
  divisionId?: string;
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
  publicationSourceSnapshot: SpogomiPublicationSourceSnapshot;
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
    mode: event.mode === "mixed" ? "casual" : event.mode,
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

function compareDescending(left: number | null | undefined, right: number | null | undefined): number {
  if (left === null || left === undefined || right === null || right === undefined) return 0;
  if (!Number.isFinite(left) || !Number.isFinite(right) || left === right) return 0;
  return right - left;
}

function compareRankingValues(left: TeamComputed, right: TeamComputed, kind: "points" | "butts", tiebreakers: SpogomiRegulation["tiebreakers"]): number {
  if (kind === "butts") {
    return compareDescending(left.result?.buttsPerParticipant, right.result?.buttsPerParticipant);
  }
  const score = compareDescending(left.result?.officialScore, right.result?.officialScore);
  if (score) return score;
  for (const tiebreaker of tiebreakers ?? []) {
    if (tiebreaker === "sporting_score") continue;
    const value = tiebreaker === "mass_grams"
      ? compareDescending(left.result?.physicalTotals.massGrams, right.result?.physicalTotals.massGrams)
      : compareDescending(left.result?.physicalTotals.countedObjects, right.result?.physicalTotals.countedObjects);
    if (value) return value;
  }
  return 0;
}

function rankBy(entries: TeamComputed[], kind: "points" | "butts", regulation: SpogomiRegulation): Map<string, number> {
  const comparable = entries.filter((entry) => {
    if (!entry.result) return false;
    return kind === "points"
      ? entry.result.officialScore !== null && entry.result.ineligibleReason === null
      : entry.result.comparableForButtsPerParticipant;
  });
  comparable.sort((left, right) => compareRankingValues(left, right, kind, regulation.tiebreakers) || left.team.team_number - right.team.team_number || left.team.id.localeCompare(right.team.id));
  const ranking = new Map<string, number>();
  let previous: TeamComputed | null = null;
  let previousRank = 0;
  comparable.forEach((entry, index) => {
    const rank = previous && compareRankingValues(previous, entry, kind, regulation.tiebreakers) === 0 ? previousRank : index + 1;
    ranking.set(entry.team.id, rank);
    previous = entry;
    previousRank = rank;
  });
  return ranking;
}

function currentOfficialRankings(source: SpogomiResultsSource, kind: "points" | "butts", snapshot: SpogomiPublicationSourceSnapshot) {
  return new Map(source.officialRankings.filter((ranking) => ranking.kind === kind && ranking.status === "certified" && ranking.source_snapshot && snapshotsEqual(ranking.source_snapshot, snapshot)).map((ranking) => [ranking.team_id, ranking]));
}

function snapshotsEqual(left: SpogomiPublicationSourceSnapshot, right: SpogomiPublicationSourceSnapshot): boolean {
  return JSON.stringify(normalizeSnapshot(left)) === JSON.stringify(normalizeSnapshot(right));
}

function normalizeSnapshot(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeSnapshot);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, normalizeSnapshot(child)]));
  }
  return value;
}

function buildRankingEntries(params: {
  source: SpogomiResultsSource;
  computed: TeamComputed[];
  kind: "points" | "butts";
  regulationComplete: boolean;
  regulation: SpogomiRegulation;
  publicationSourceSnapshot: SpogomiPublicationSourceSnapshot;
}): SpogomiPublicRankingEntry[] {
  const { source, computed, kind, regulationComplete, regulation, publicationSourceSnapshot } = params;
  const official = currentOfficialRankings(source, kind, publicationSourceSnapshot);
  const hasOfficialSet = source.event.state === "certified" && computed.every((entry) => {
    if (!entry.result) return false;
    const eligible = kind === "points"
      ? entry.result.officialScore !== null && entry.result.ineligibleReason === null
      : entry.result.comparableForButtsPerParticipant;
    return !eligible || official.has(entry.team.id);
  });
  const canShowProvisional = source.event.publicResultsVisibility === "provisional" || source.event.publicResultsVisibility === "certified";
  const provisionalEntries = computed.filter((entry) => entry.submission && ["submitted", "provisional", "certified"].includes(entry.submission.status));
  const rankingSource = source.event.publicResultsVisibility === "certified"
    ? computed.filter((entry) => entry.submission?.status === "certified")
    : provisionalEntries;
  const ranking = rankBy(rankingSource, kind, regulation);
  const entries = computed.map((entry): SpogomiPublicRankingEntry => {
    const result = entry.result;
    const comparable = Boolean(result && (kind === "points" ? result.officialScore !== null : result.comparableForButtsPerParticipant));
    const eligible = kind === "points" ? Boolean(result && result.officialScore !== null && result.ineligibleReason === null) : comparable;
    const selected = rankingSource.includes(entry);
    const publishedOfficial = hasOfficialSet && entry.submission?.status === "certified" ? official.get(entry.team.id) ?? null : null;
    const status: SpogomiPublicRankingEntry["status"] = !eligible || !canShowProvisional || !selected ? "unavailable" : source.event.publicResultsVisibility === "certified" ? (publishedOfficial ? "certified" : "unavailable") : publishedOfficial ? "certified" : "provisional";
    const reason = !regulationComplete && kind === "points"
      ? "Règlement incomplet : aucun classement sportif officiel calculé."
      : !entry.submission
        ? "Aucun résultat publié pour cette équipe."
        : !comparable
          ? kind === "butts" ? "Non comparable : comptage direct et présence vérifiée requis." : result?.ineligibleReason ?? "Résultat non éligible."
          : status === "unavailable" ? "Résultat non publié." : null;
    const exposeValues = status !== "unavailable";
    const base = {
      teamId: entry.team.id,
      divisionId: entry.team.division_id,
      teamNumber: entry.team.team_number,
      publicName: entry.team.public_name,
      rank: status === "certified" ? (publishedOfficial?.rank ?? null) : status === "provisional" ? (ranking.get(entry.team.id) ?? null) : null,
      status,
      eligible,
      reason,
      valueUnit: (kind === "points" ? "points" : "mégots/participant") as SpogomiPublicRankingEntry["valueUnit"],
    };
    return exposeValues ? {
      ...base,
      score: kind === "points" && regulationComplete ? result?.officialScore ?? null : null,
      countedButts: result?.physicalTotals.countedButts ?? null,
      presentParticipants: entry.presentParticipants,
      numerator: result?.physicalTotals.countedButts ?? null,
      denominator: entry.presentParticipants,
      ratio: result?.buttsPerParticipant ?? null,
    } : base;
  });
  return entries.sort((left, right) => (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER) || left.teamNumber - right.teamNumber);
}

export function buildSpogomiResultsProjection(source: SpogomiResultsSource, refreshedAt = new Date().toISOString()): SpogomiExportProjection {
  const divisionRows = source.event.divisions ?? [];
  if (source.event.mode === "mixed" && divisionRows.length === 2) {
    const projections = divisionRows.map((division) => buildSpogomiResultsProjection({
      ...source,
      event: {
        ...source.event,
        mode: division.division_type,
        divisions: undefined,
        ...(division.regulation_version ? { regulationVersion: division.regulation_version } : {}),
        ...(division.regulation_status ? { regulationStatus: division.regulation_status } : {}),
        ...(division.regulation_source_reference !== undefined ? { regulationSourceReference: division.regulation_source_reference } : {}),
        ...(division.regulation_config !== undefined ? { regulationConfig: division.regulation_config } : {}),
        ...(division.team_size_config !== undefined ? { teamSizeConfig: division.team_size_config } : {}),
      },
      categories: source.categories.filter((row) => row.division_id === division.id),
      teams: source.teams.filter((row) => row.division_id === division.id),
      submissions: source.submissions.filter((row) => row.division_id === division.id),
      items: source.items.filter((row) => row.division_id === division.id),
      participants: source.participants.filter((row) => row.division_id === division.id),
      officialRankings: source.officialRankings.filter((row) => row.division_id === division.id),
    }, refreshedAt));
    const first = projections[0];
    if (!first) throw new Error("Validation: une édition mixte doit posséder deux divisions.");
    const environmental = source.actionIsPublished && source.consolidation?.projection
      ? {
          status: "available" as const,
          totalWasteMassGrams: parseNumber(source.consolidation.projection.totalWasteMassGrams),
          cigaretteButtsMassGrams: parseNumber(source.consolidation.projection.cigaretteButtsMassGrams),
          cigaretteButtsCount: parseNumber(source.consolidation.projection.cigaretteButtsCount),
          participantsPresent: parseNumber(source.consolidation.projection.participantsPresent),
          projectionVersion: typeof source.consolidation.projection.projectionVersion === "string" ? source.consolidation.projection.projectionVersion : null,
          sourceHash: typeof source.consolidation.projection.sourceHash === "string" ? source.consolidation.projection.sourceHash : null,
        }
      : { status: "unavailable" as const, totalWasteMassGrams: null, cigaretteButtsMassGrams: null, cigaretteButtsCount: null, participantsPresent: null, projectionVersion: null, sourceHash: null };
    return {
      ...first,
      event: source.event,
      teams: projections.flatMap((projection, index) => projection.teams.map((team) => ({ ...team, division_id: divisionRows[index]?.id }))),
      sourceSubmissionIds: projections.flatMap((projection) => projection.sourceSubmissionIds),
      results: {
        ...first.results,
        regulationComplete: projections.every((projection) => projection.results.regulationComplete),
        environmental,
        divisions: projections.map((projection, index) => ({ id: divisionRows[index]!.id, type: divisionRows[index]!.division_type, regulationVersion: projection.results.regulationVersion, regulationComplete: projection.results.regulationComplete, sport: projection.results.sport, butts: projection.results.butts })),
      },
    };
  }
  const regulation = buildSpogomiRegulation(sourceEvent(source.event), source.categories);
  const publicationSourceSnapshot = buildPublicationSourceSnapshot(source);
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
        ? { status: "unavailable", reason: "Règlement incomplet : aucun classement sportif officiel calculé.", entries: buildRankingEntries({ source, computed, kind: "points", regulationComplete, regulation, publicationSourceSnapshot }) }
        : (() => { const entries = buildRankingEntries({ source, computed, kind: "points", regulationComplete, regulation, publicationSourceSnapshot }); const status = entries.some((entry) => entry.status === "provisional") ? "provisional" : entries.every((entry) => entry.status === "certified" || entry.status === "unavailable") && entries.some((entry) => entry.status === "certified") ? "certified" : "unavailable"; return { status, reason: status === "unavailable" ? "Classement sportif certifié non publié pour les équipes éligibles." : null, entries }; })(),
    butts: source.event.publicResultsVisibility === "hidden"
      ? { status: "hidden", reason: "Les résultats ne sont pas publiés.", entries: [] }
      : (() => { const entries = buildRankingEntries({ source, computed, kind: "butts", regulationComplete, regulation, publicationSourceSnapshot }); const status = entries.some((entry) => entry.status === "provisional") ? "provisional" : entries.every((entry) => entry.status === "certified" || entry.status === "unavailable") && entries.some((entry) => entry.status === "certified") ? "certified" : "unavailable"; return { status, reason: null, entries }; })(),
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
  const officialSport = currentOfficialRankings(source, "points", publicationSourceSnapshot);
  const officialButts = currentOfficialRankings(source, "butts", publicationSourceSnapshot);
  const exportTeams = computed.map((entry): SpogomiExportTeam => {
    const certified = entry.submission?.status === "certified";
    const sportDecision = certified ? officialSport.get(entry.team.id) ?? null : null;
    const buttsDecision = certified ? officialButts.get(entry.team.id) ?? null : null;
    return {
      teamId: entry.team.id,
      divisionId: entry.team.division_id,
      teamNumber: entry.team.team_number,
      publicName: entry.team.public_name,
      registeredParticipants: entry.registeredParticipants,
      presentParticipants: entry.presentParticipants,
      submissionStatus: entry.submission?.status ?? null,
      submissionVersion: entry.submission?.version ?? null,
      sportRank: sportDecision?.rank ?? null,
      sportStatus: sportDecision ? "certified" : "unavailable",
      sportScore: sportDecision && regulationComplete ? entry.result?.officialScore ?? null : null,
      buttsRank: buttsDecision?.rank ?? null,
      buttsStatus: buttsDecision ? "certified" : "unavailable",
      buttsCount: certified ? entry.result?.physicalTotals.countedButts ?? null : null,
      buttsPerParticipant: certified ? entry.result?.buttsPerParticipant ?? null : null,
      categories: certified ? source.categories.filter((category) => (category.division_id ?? null) === (entry.team.division_id ?? null)).map((category) => {
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
      }) : [],
    };
  });
  const sourceSubmissionIds = computed.map((entry) => entry.team.certified_submission_id).filter((id): id is string => Boolean(id));
  return { event: source.event, regulation, results: publicResults, teams: exportTeams, consolidation: source.consolidation?.projection ?? null, categories: source.categories, sourceSubmissionIds, publicationSourceSnapshot };
}
