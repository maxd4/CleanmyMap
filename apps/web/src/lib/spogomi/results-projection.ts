import {
  calculateSpogomiCompetitionResult,
} from "./scoring";
import { buildSpogomiRegulation } from "./regulation";
import { toSpogomiResultItemInput } from "./result-input";
import type { SpogomiCompetitionResult, SpogomiRegulation } from "./types";
import { buildPublicationSourceSnapshot, type SpogomiPublicationSourceSnapshot } from "./results-projection-snapshot";

type SpogomiPublicResultsVisibility = "hidden" | "provisional" | "certified";
import type { SpogomiDivision, SpogomiDivisionType } from "./types";
import { effectiveSpogomiTeamClosureDecision, type SpogomiTeamClosureStatus } from "./closure";

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
    officialTimezone?: string;
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
  teams: Array<{ id: string; division_id?: string; team_number: number; public_name: string; composition_state: string; certified_submission_id: string | null; closure_status?: SpogomiTeamClosureStatus; sport_eligible?: boolean; environmental_eligibility?: string; closure_decision_version?: number; updated_at?: string }>;
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
  closureStatus: SpogomiTeamClosureStatus;
  sportEligible: boolean;
  environmentalEligibility: string;
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

const divisionProjectionStore = new WeakMap<SpogomiExportProjection, SpogomiExportProjection[]>();

/**
 * Returns the private per-division projections used by official publication.
 * The store is deliberately not part of the serialized public projection: it
 * contains source snapshots that must remain server-side.
 */
export function getSpogomiDivisionProjections(projection: SpogomiExportProjection): SpogomiExportProjection[] {
  return divisionProjectionStore.get(projection) ?? [projection];
}

type TeamComputed = {
  team: SpogomiResultsSource["teams"][number];
  submission: SpogomiResultsSource["submissions"][number] | null;
  result: SpogomiCompetitionResult | null;
  presentParticipants: number;
  registeredParticipants: number;
  items: Array<Record<string, unknown>>;
  closure: ReturnType<typeof effectiveSpogomiTeamClosureDecision>;
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
  return compareRankingTiebreakers(left, right, tiebreakers);
}

function compareRankingTiebreakers(left: TeamComputed, right: TeamComputed, tiebreakers: SpogomiRegulation["tiebreakers"]): number {
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
    if (!entry.closure.sportEligible) return false;
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

function isRankingEntryEligible(entry: TeamComputed, kind: "points" | "butts"): boolean {
  if (!entry.closure.sportEligible || !entry.result) return false;
  return kind === "points"
    ? entry.result.officialScore !== null && entry.result.ineligibleReason === null
    : entry.result.comparableForButtsPerParticipant;
}

function hasPublishedOfficialSet(source: SpogomiResultsSource, computed: TeamComputed[], kind: "points" | "butts", official: Map<string, SpogomiResultsSource["officialRankings"][number]>): boolean {
  return source.event.state === "certified" && computed.every((entry) => !isRankingEntryEligible(entry, kind) || official.has(entry.team.id));
}

function rankingReason(
  entry: TeamComputed,
  kind: "points" | "butts",
  regulationComplete: boolean,
  comparable: boolean,
  status: SpogomiPublicRankingEntry["status"],
): string | null {
  if (!regulationComplete && kind === "points") return "Règlement incomplet : aucun classement sportif officiel calculé.";
  if (!entry.submission) return "Aucun résultat publié pour cette équipe.";
  if (!comparable) return kind === "butts" ? "Non comparable : comptage direct et présence vérifiée requis." : entry.result?.ineligibleReason ?? "Résultat non éligible.";
  return status === "unavailable" ? "Résultat non publié." : null;
}

function rankingEntryStatus(eligible: boolean, canShowProvisional: boolean, selected: boolean, visibility: SpogomiPublicResultsVisibility, publishedOfficial: SpogomiResultsSource["officialRankings"][number] | null): SpogomiPublicRankingEntry["status"] {
  if (!eligible || !canShowProvisional || !selected) return "unavailable";
  if (visibility === "certified") return publishedOfficial ? "certified" : "unavailable";
  return publishedOfficial ? "certified" : "provisional";
}

function rankingBase(entry: TeamComputed, kind: "points" | "butts", eligible: boolean, status: SpogomiPublicRankingEntry["status"], rank: number | null, reason: string | null) {
  return {
    teamId: entry.team.id,
    divisionId: entry.team.division_id,
    teamNumber: entry.team.team_number,
    publicName: entry.team.public_name,
    rank,
    status,
    eligible,
    reason: entry.closure.sportEligible ? reason : `Équipe non éligible : ${entry.closure.status}.`,
    valueUnit: (kind === "points" ? "points" : "mégots/participant") as SpogomiPublicRankingEntry["valueUnit"],
  };
}

function exposeRankingValues(base: ReturnType<typeof rankingBase>, entry: TeamComputed, kind: "points" | "butts", regulationComplete: boolean): SpogomiPublicRankingEntry {
  if (base.status === "unavailable") return base;
  return { ...base, score: kind === "points" && regulationComplete ? entry.result?.officialScore ?? null : null, countedButts: entry.result?.physicalTotals.countedButts ?? null, presentParticipants: entry.presentParticipants, numerator: entry.result?.physicalTotals.countedButts ?? null, denominator: entry.presentParticipants, ratio: entry.result?.buttsPerParticipant ?? null };
}

function buildRankingEntry(params: {
  entry: TeamComputed;
  kind: "points" | "butts";
  regulationComplete: boolean;
  canShowProvisional: boolean;
  rankingSource: TeamComputed[];
  ranking: Map<string, number>;
  official: Map<string, SpogomiResultsSource["officialRankings"][number]>;
  hasOfficialSet: boolean;
  visibility: SpogomiPublicResultsVisibility;
}): SpogomiPublicRankingEntry {
  const { entry, kind, regulationComplete, canShowProvisional, rankingSource, ranking, official, hasOfficialSet, visibility } = params;
  const result = entry.result;
  const comparable = Boolean(result && (kind === "points" ? result.officialScore !== null : result.comparableForButtsPerParticipant));
  const eligible = isRankingEntryEligible(entry, kind);
  const selected = rankingSource.includes(entry);
  const publishedOfficial = hasOfficialSet && entry.submission?.status === "certified" ? official.get(entry.team.id) ?? null : null;
  const status = rankingEntryStatus(eligible, canShowProvisional, selected, visibility, publishedOfficial);
  const rank = status === "certified" ? publishedOfficial?.rank ?? null : status === "provisional" ? ranking.get(entry.team.id) ?? null : null;
  return exposeRankingValues(rankingBase(entry, kind, eligible, status, rank, rankingReason(entry, kind, regulationComplete, comparable, status)), entry, kind, regulationComplete);
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
  const hasOfficialSet = hasPublishedOfficialSet(source, computed, kind, official);
  const canShowProvisional = source.event.publicResultsVisibility === "provisional" || source.event.publicResultsVisibility === "certified";
  const provisionalEntries = computed.filter((entry) => entry.submission && ["submitted", "provisional", "certified"].includes(entry.submission.status));
  const rankingSource = source.event.publicResultsVisibility === "certified"
    ? computed.filter((entry) => entry.submission?.status === "certified")
    : provisionalEntries;
  const ranking = rankBy(rankingSource, kind, regulation);
  const entries = computed.map((entry) => buildRankingEntry({ entry, kind, regulationComplete, canShowProvisional, rankingSource, ranking, official, hasOfficialSet, visibility: source.event.publicResultsVisibility }));
  return entries.sort((left, right) => (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER) || left.teamNumber - right.teamNumber);
}

function buildEnvironmentalProjection(source: SpogomiResultsSource): SpogomiPublicResults["environmental"] {
  if (!source.actionIsPublished || !source.consolidation?.projection) return { status: "unavailable", totalWasteMassGrams: null, cigaretteButtsMassGrams: null, cigaretteButtsCount: null, participantsPresent: null, projectionVersion: null, sourceHash: null };
  const projection = source.consolidation.projection;
  return {
    status: "available",
    totalWasteMassGrams: parseNumber(projection.totalWasteMassGrams),
    cigaretteButtsMassGrams: parseNumber(projection.cigaretteButtsMassGrams),
    cigaretteButtsCount: parseNumber(projection.cigaretteButtsCount),
    participantsPresent: parseNumber(projection.participantsPresent),
    projectionVersion: typeof projection.projectionVersion === "string" ? projection.projectionVersion : null,
    sourceHash: typeof projection.sourceHash === "string" ? projection.sourceHash : null,
  };
}

function buildTeamClosure(team: SpogomiResultsSource["teams"][number], submission: SpogomiResultsSource["submissions"][number] | null, hasSubmissionForSport: boolean) {
  const divisionId = team.division_id ?? "";
  return effectiveSpogomiTeamClosureDecision({
    teamId: team.id,
    divisionId,
    certifiedSubmission: submission?.status === "certified",
    decision: team.closure_status
      ? { teamId: team.id, divisionId, status: team.closure_status, sportEligible: team.sport_eligible ?? !["absent", "forfeit", "excluded", "disqualified", "result_missing", "contested"].includes(team.closure_status), environmentalEligibility: (team.environmental_eligibility as "eligible" | "excluded" | "unknown" | undefined) ?? "eligible", decisionVersion: 0, reason: "Projection source" }
      : { teamId: team.id, divisionId, status: hasSubmissionForSport ? "present_measured" : "result_missing", sportEligible: hasSubmissionForSport, environmentalEligibility: submission?.status === "certified" ? "eligible" : "unknown", decisionVersion: 0, reason: "Projection source" },
  });
}

function computeTeam(source: SpogomiResultsSource, team: SpogomiResultsSource["teams"][number], regulation: SpogomiRegulation): TeamComputed {
  const submission = latestSubmission(team.id, source.submissions, team.certified_submission_id);
  const items = submission ? source.items.filter((item) => String(item.submission_id) === submission.id) : [];
  const itemInputs = items.map((item) => toSpogomiResultItemInput(item, source.categories.find((category) => category.id === String(item.category_rule_id))?.code ?? ""));
  const teamParticipants = source.participants.filter((participant) => participant.team_id === team.id && participant.registration_status === "registered");
  const presentParticipants = teamParticipants.filter((participant) => participant.attendance_status === "present").length;
  const hasSubmissionForSport = Boolean(submission && ["submitted", "provisional", "certified"].includes(submission.status));
  return {
    team,
    submission,
    result: submission ? calculateSpogomiCompetitionResult({ regulation, items: itemInputs, presentParticipants, submissionStatus: submission.status as "submitted" | "provisional" | "certified" }) : null,
    presentParticipants,
    registeredParticipants: teamParticipants.length,
    items,
    closure: buildTeamClosure(team, submission, hasSubmissionForSport),
  };
}

function buildComputedTeams(source: SpogomiResultsSource, regulation: SpogomiRegulation): TeamComputed[] {
  return source.teams.map((team) => computeTeam(source, team, regulation));
}

function rankingStatus(entries: SpogomiPublicRankingEntry[]): "certified" | "provisional" | "unavailable" {
  if (entries.some((entry) => entry.status === "provisional")) return "provisional";
  return entries.every((entry) => entry.status === "certified" || entry.status === "unavailable") && entries.some((entry) => entry.status === "certified") ? "certified" : "unavailable";
}

function buildRankingSection(source: SpogomiResultsSource, computed: TeamComputed[], kind: "points" | "butts", regulationComplete: boolean, regulation: SpogomiRegulation, publicationSourceSnapshot: SpogomiPublicationSourceSnapshot): SpogomiPublicResults["sport"] {
  if (source.event.publicResultsVisibility === "hidden") return { status: "hidden", reason: kind === "points" ? "Les résultats sportifs ne sont pas publiés." : "Les résultats ne sont pas publiés.", entries: [] };
  const entries = buildRankingEntries({ source, computed, kind, regulationComplete, regulation, publicationSourceSnapshot });
  if (kind === "points" && !regulationComplete) return { status: "unavailable", reason: "Règlement incomplet : aucun classement sportif officiel calculé.", entries };
  const status = rankingStatus(entries);
  return { status, reason: kind === "points" && status === "unavailable" ? "Classement sportif certifié non publié pour les équipes éligibles." : null, entries };
}

function buildPublicResults(source: SpogomiResultsSource, computed: TeamComputed[], regulation: SpogomiRegulation, regulationComplete: boolean, refreshedAt: string, publicationSourceSnapshot: SpogomiPublicationSourceSnapshot): SpogomiPublicResults {
  return {
    visibility: source.event.publicResultsVisibility,
    regulationVersion: regulation.version,
    regulationComplete,
    refreshedAt,
    sport: buildRankingSection(source, computed, "points", regulationComplete, regulation, publicationSourceSnapshot),
    butts: buildRankingSection(source, computed, "butts", regulationComplete, regulation, publicationSourceSnapshot),
    environmental: buildEnvironmentalProjection(source),
  };
}

function buildExportCategories(source: SpogomiResultsSource, entry: TeamComputed): SpogomiExportTeam["categories"] {
  return source.categories.filter((category) => (category.division_id ?? null) === (entry.team.division_id ?? null)).map((category) => {
    const item = entry.items.find((candidate) => String(candidate.category_rule_id) === category.id);
    return { code: category.code, label: category.label, measurementKind: category.measurement_kind, unit: category.unit, quantity: parseNumber(item?.quantity), massGrams: parseNumber(item?.mass_grams), objectCount: parseNumber(item?.object_count), environmentalCategorySlug: category.environmental_category_slug, provenance: typeof item?.provenance === "string" ? item.provenance : "", measurementMethod: typeof item?.measurement_method === "string" ? item.measurement_method : null, submissionStatus: entry.submission?.status ?? null };
  });
}

function exportTeamDecisions(entry: TeamComputed, officialSport: ReturnType<typeof currentOfficialRankings>, officialButts: ReturnType<typeof currentOfficialRankings>) {
  if (entry.submission?.status !== "certified") return { sport: null, butts: null };
  return { sport: officialSport.get(entry.team.id) ?? null, butts: officialButts.get(entry.team.id) ?? null };
}

function exportTeamMeasurementValues(entry: TeamComputed) {
  if (entry.submission?.status !== "certified") return { buttsCount: null, buttsPerParticipant: null };
  return { buttsCount: entry.result?.physicalTotals.countedButts ?? null, buttsPerParticipant: entry.result?.buttsPerParticipant ?? null };
}

function exportTeamStatusFields(entry: TeamComputed, decisions: ReturnType<typeof exportTeamDecisions>, measurements: ReturnType<typeof exportTeamMeasurementValues>, regulationComplete: boolean) {
  return {
    sportRank: decisions.sport?.rank ?? null,
    sportStatus: decisions.sport ? "certified" : "unavailable",
    sportScore: decisions.sport && regulationComplete ? entry.result?.officialScore ?? null : null,
    buttsRank: decisions.butts?.rank ?? null,
    buttsStatus: decisions.butts ? "certified" : "unavailable",
    buttsCount: measurements.buttsCount,
    buttsPerParticipant: measurements.buttsPerParticipant,
  };
}

function buildExportTeam(source: SpogomiResultsSource, entry: TeamComputed, officialSport: ReturnType<typeof currentOfficialRankings>, officialButts: ReturnType<typeof currentOfficialRankings>, regulationComplete: boolean): SpogomiExportTeam {
  const decisions = exportTeamDecisions(entry, officialSport, officialButts);
  const measurements = exportTeamMeasurementValues(entry);
  const statusFields = exportTeamStatusFields(entry, decisions, measurements, regulationComplete);
  const certified = entry.submission?.status === "certified";
  return {
    teamId: entry.team.id, divisionId: entry.team.division_id, teamNumber: entry.team.team_number, publicName: entry.team.public_name,
    registeredParticipants: entry.registeredParticipants, presentParticipants: entry.presentParticipants, submissionStatus: entry.submission?.status ?? null, submissionVersion: entry.submission?.version ?? null,
    ...statusFields,
    closureStatus: entry.closure.status, sportEligible: entry.closure.sportEligible, environmentalEligibility: entry.closure.environmentalEligibility, categories: certified ? buildExportCategories(source, entry) : [],
  };
}

function buildMixedProjection(source: SpogomiResultsSource, divisionRows: NonNullable<SpogomiResultsSource["event"]["divisions"]>, refreshedAt: string): SpogomiExportProjection {
  const projections = divisionRows.map((division) => buildSpogomiResultsProjection({
    ...source,
    event: { ...source.event, mode: division.division_type, divisions: [division], ...(division.regulation_version ? { regulationVersion: division.regulation_version } : {}), ...(division.regulation_status ? { regulationStatus: division.regulation_status } : {}), ...(division.regulation_source_reference !== undefined ? { regulationSourceReference: division.regulation_source_reference } : {}), ...(division.regulation_config !== undefined ? { regulationConfig: division.regulation_config } : {}), ...(division.team_size_config !== undefined ? { teamSizeConfig: division.team_size_config } : {}) },
    categories: source.categories.filter((row) => row.division_id === division.id), teams: source.teams.filter((row) => row.division_id === division.id), submissions: source.submissions.filter((row) => row.division_id === division.id), items: source.items.filter((row) => row.division_id === division.id), participants: source.participants.filter((row) => row.division_id === division.id), officialRankings: source.officialRankings.filter((row) => row.division_id === division.id),
  }, refreshedAt));
  const first = projections[0];
  if (!first) throw new Error("Validation: une édition mixte doit posséder deux divisions.");
  const mixedProjection: SpogomiExportProjection = {
    ...first,
    event: source.event,
    teams: projections.flatMap((projection, index) => projection.teams.map((team) => ({ ...team, division_id: divisionRows[index]?.id }))),
    sourceSubmissionIds: projections.flatMap((projection) => projection.sourceSubmissionIds),
    results: { ...first.results, regulationComplete: projections.every((projection) => projection.results.regulationComplete), environmental: buildEnvironmentalProjection(source), divisions: projections.map((projection, index) => ({ id: divisionRows[index]!.id, type: divisionRows[index]!.division_type, regulationVersion: projection.results.regulationVersion, regulationComplete: projection.results.regulationComplete, sport: projection.results.sport, butts: projection.results.butts })) },
  };
  divisionProjectionStore.set(mixedProjection, projections);
  return mixedProjection;
}

export function buildSpogomiResultsProjection(source: SpogomiResultsSource, refreshedAt = new Date().toISOString()): SpogomiExportProjection {
  const divisionRows = source.event.divisions ?? [];
  if (source.event.mode === "mixed" && divisionRows.length === 2) return buildMixedProjection(source, divisionRows, refreshedAt);
  const regulation = buildSpogomiRegulation(sourceEvent(source.event), source.categories);
  const publicationSourceSnapshot = buildPublicationSourceSnapshot(source);
  const regulationComplete = regulation.status === "complete" && regulation.categories.every((category) => category.isComplete);
  const computed = buildComputedTeams(source, regulation);
  const publicResults = buildPublicResults(source, computed, regulation, regulationComplete, refreshedAt, publicationSourceSnapshot);
  const officialSport = currentOfficialRankings(source, "points", publicationSourceSnapshot);
  const officialButts = currentOfficialRankings(source, "butts", publicationSourceSnapshot);
  const exportTeams = computed.map((entry) => buildExportTeam(source, entry, officialSport, officialButts, regulationComplete));
  const sourceSubmissionIds = computed.filter((entry) => entry.closure.environmentalEligibility === "eligible").map((entry) => entry.team.certified_submission_id).filter((id): id is string => Boolean(id));
  const projection: SpogomiExportProjection = { event: source.event, regulation, results: publicResults, teams: exportTeams, consolidation: source.consolidation?.projection ?? null, categories: source.categories, sourceSubmissionIds, publicationSourceSnapshot };
  divisionProjectionStore.set(projection, [projection]);
  return projection;
}
