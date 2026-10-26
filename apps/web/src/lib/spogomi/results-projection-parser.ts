import type { SpogomiPublicRankingEntry, SpogomiPublicResults } from "./results-projection";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function optionalNullableNumber(value: unknown): value is number | null | undefined {
  return value === undefined || nullableNumber(value);
}

type PublicRankingEntryCore = Record<string, unknown> & {
  teamNumber: number;
  publicName: string;
  rank: number | null;
  status: "certified" | "provisional" | "unavailable";
  eligible: boolean;
  reason: string | null;
  valueUnit: "points" | "mégots/participant";
};

type PublicRankingEntryMetrics = {
  score?: number | null;
  countedButts?: number | null;
  presentParticipants?: number | null;
  numerator?: number | null;
  denominator?: number | null;
  ratio?: number | null;
};

function isPublicRankingEntryCore(value: Record<string, unknown>): value is PublicRankingEntryCore {
  return typeof value.teamNumber === "number" &&
    typeof value.publicName === "string" &&
    (value.rank === null || typeof value.rank === "number") &&
    (value.status === "certified" || value.status === "provisional" || value.status === "unavailable") &&
    typeof value.eligible === "boolean" &&
    (value.reason === null || typeof value.reason === "string") &&
    (value.valueUnit === "points" || value.valueUnit === "mégots/participant");
}

function hasValidPublicRankingEntryMetrics(value: PublicRankingEntryCore): value is PublicRankingEntryCore & PublicRankingEntryMetrics {
  return optionalNullableNumber(value.score) &&
    optionalNullableNumber(value.countedButts) &&
    optionalNullableNumber(value.presentParticipants) &&
    optionalNullableNumber(value.numerator) &&
    optionalNullableNumber(value.denominator) &&
    optionalNullableNumber(value.ratio);
}

type PublicRankingEntryIdentifiers = {
  teamId?: string;
  divisionId?: string;
};

function hasValidPublicRankingEntryIdentifiers(
  value: PublicRankingEntryCore & PublicRankingEntryMetrics,
): value is PublicRankingEntryCore & PublicRankingEntryMetrics & PublicRankingEntryIdentifiers {
  return (value.teamId === undefined || typeof value.teamId === "string") &&
    (value.divisionId === undefined || typeof value.divisionId === "string");
}

function parsePublicRankingEntry(value: unknown): SpogomiPublicRankingEntry | null {
  if (!isRecord(value) || !isPublicRankingEntryCore(value) || !hasValidPublicRankingEntryMetrics(value)) return null;
  if (!hasValidPublicRankingEntryIdentifiers(value)) return null;
  return {
    ...(value.teamId === undefined ? {} : { teamId: value.teamId }),
    ...(value.divisionId === undefined ? {} : { divisionId: value.divisionId }),
    teamNumber: value.teamNumber,
    publicName: value.publicName,
    rank: value.rank,
    status: value.status,
    eligible: value.eligible,
    reason: value.reason,
    ...(value.score === undefined ? {} : { score: value.score }),
    ...(value.countedButts === undefined ? {} : { countedButts: value.countedButts }),
    ...(value.presentParticipants === undefined ? {} : { presentParticipants: value.presentParticipants }),
    ...(value.numerator === undefined ? {} : { numerator: value.numerator }),
    ...(value.denominator === undefined ? {} : { denominator: value.denominator }),
    valueUnit: value.valueUnit,
    ...(value.ratio === undefined ? {} : { ratio: value.ratio }),
  };
}

function parsePublicRanking(value: unknown): SpogomiPublicResults["sport"] | null {
  if (!isRecord(value) || (value.status !== "hidden" && value.status !== "certified" && value.status !== "provisional" && value.status !== "unavailable") || !(value.reason === null || typeof value.reason === "string") || !Array.isArray(value.entries)) return null;
  const entries = value.entries.map(parsePublicRankingEntry);
  return entries.every((entry): entry is SpogomiPublicRankingEntry => entry !== null) ? { status: value.status, reason: value.reason, entries } : null;
}

function parsePublicEnvironmental(value: unknown): SpogomiPublicResults["environmental"] | null {
  if (!isRecord(value)) return null;
  if (value.status !== "available" && value.status !== "unavailable") return null;
  if (!nullableNumber(value.totalWasteMassGrams) || !nullableNumber(value.cigaretteButtsMassGrams)) return null;
  if (!nullableNumber(value.cigaretteButtsCount) || !nullableNumber(value.participantsPresent)) return null;
  if (value.projectionVersion !== null && typeof value.projectionVersion !== "string") return null;
  if (value.sourceHash !== null && typeof value.sourceHash !== "string") return null;
  return {
    status: value.status,
    totalWasteMassGrams: value.totalWasteMassGrams,
    cigaretteButtsMassGrams: value.cigaretteButtsMassGrams,
    cigaretteButtsCount: value.cigaretteButtsCount,
    participantsPresent: value.participantsPresent,
    projectionVersion: value.projectionVersion,
    sourceHash: value.sourceHash,
  };
}

function parsePublicDivision(value: unknown): NonNullable<SpogomiPublicResults["divisions"]>[number] | null {
  if (!isRecord(value) || typeof value.id !== "string" ||
    (value.type !== "casual" && value.type !== "world_cup") ||
    typeof value.regulationVersion !== "string" || typeof value.regulationComplete !== "boolean") return null;
  const sport = parsePublicRanking(value.sport);
  const butts = parsePublicRanking(value.butts);
  return sport && butts
    ? {
        id: value.id,
        type: value.type,
        regulationVersion: value.regulationVersion,
        regulationComplete: value.regulationComplete,
        sport,
        butts,
      }
    : null;
}

function parsePublicDivisions(
  value: unknown,
): SpogomiPublicResults["divisions"] | null | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;
  const divisions = value.map(parsePublicDivision);
  return divisions.every((division): division is NonNullable<typeof division> => division !== null)
    ? divisions
    : null;
}

export function parseSpogomiPublicResults(value: unknown): SpogomiPublicResults | null {
  if (!isRecord(value) ||
    (value.visibility !== "hidden" && value.visibility !== "provisional" && value.visibility !== "certified") ||
    typeof value.regulationVersion !== "string" || typeof value.regulationComplete !== "boolean" ||
    typeof value.refreshedAt !== "string") return null;
  const sport = parsePublicRanking(value.sport);
  const butts = parsePublicRanking(value.butts);
  const environmental = parsePublicEnvironmental(value.environmental);
  const divisions = parsePublicDivisions(value.divisions);
  if (!sport || !butts || !environmental || divisions === null) return null;
  return {
    visibility: value.visibility,
    regulationVersion: value.regulationVersion,
    regulationComplete: value.regulationComplete,
    refreshedAt: value.refreshedAt,
    sport,
    butts,
    environmental,
    ...(divisions === undefined ? {} : { divisions }),
  };
}
