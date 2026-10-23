import type {
  SpogomiPublicRankingEntry,
  SpogomiPublicResultsVisibility,
  SpogomiResultsSource,
  TeamComputed,
} from "./results-projection";
import type { SpogomiRegulation } from "./types";
import type { SpogomiPublicationSourceSnapshot } from "./results-projection-snapshot";

function compareDescending(left: number | null | undefined, right: number | null | undefined): number {
  if (left === null || left === undefined || right === null || right === undefined) return 0;
  if (!Number.isFinite(left) || !Number.isFinite(right) || left === right) return 0;
  return right - left;
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

function compareRankingValues(left: TeamComputed, right: TeamComputed, kind: "points" | "butts", tiebreakers: SpogomiRegulation["tiebreakers"]): number {
  if (kind === "butts") return compareDescending(left.result?.buttsPerParticipant, right.result?.buttsPerParticipant);
  const score = compareDescending(left.result?.officialScore, right.result?.officialScore);
  return score || compareRankingTiebreakers(left, right, tiebreakers);
}

function rankBy(entries: TeamComputed[], kind: "points" | "butts", regulation: SpogomiRegulation): Map<string, number> {
  const comparable = entries.filter((entry) => {
    if (!entry.closure.sportEligible || !entry.result) return false;
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

export function currentOfficialRankings(source: SpogomiResultsSource, kind: "points" | "butts", snapshot: SpogomiPublicationSourceSnapshot) {
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

function rankingReason(entry: TeamComputed, kind: "points" | "butts", regulationComplete: boolean, comparable: boolean, status: SpogomiPublicRankingEntry["status"]): string | null {
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

export function buildRankingEntries(params: {
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
