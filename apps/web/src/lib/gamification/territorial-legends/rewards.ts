import type { GamificationSourceFact } from "../progression/gamification-reconstruction";
import type {
  TerritorialLegendAwardProof,
  TerritorialLegendHoldPeriod,
  TerritorialLegendLevel,
  TerritorialLegendWinnerSnapshot,
} from "./types";

export const TERRITORIAL_LEGEND_REWARD_EVENT_TYPE = "territorial_legend_reward" as const;
export const TERRITORIAL_LEGEND_SOURCE_TABLE = "territorial_legend_award_proofs" as const;
export const TERRITORIAL_LEGEND_HOLD_SOURCE_TABLE = "territorial_legend_hold_periods" as const;
export const TERRITORIAL_LEGEND_LONGEVITY_THRESHOLDS = [7, 30, 90, 180, 365, 730] as const;

export type TerritorialLegendRewardFamilyId = `territorial_legend:${TerritorialLegendLevel}`;

export function territorialLegendFamilyId(level: TerritorialLegendLevel): TerritorialLegendRewardFamilyId {
  return `territorial_legend:${level}`;
}

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Date civile invalide: ${value}`);
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, 12));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error(`Date civile invalide: ${value}`);
  }
  return parsed;
}

function dateValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: string, amount: number): string {
  const result = parseDate(value);
  result.setUTCDate(result.getUTCDate() + amount);
  return dateValue(result);
}

export function inclusiveCivilDays(start: string, end: string): number {
  return Math.max(0, Math.floor((parseDate(end).getTime() - parseDate(start).getTime()) / 86_400_000) + 1);
}

export function awardProofId(
  userId: string,
  level: TerritorialLegendLevel,
  territoryCode: string,
  awardKind: TerritorialLegendAwardProof["awardKind"],
  thresholdDays: number,
): string {
  return [userId, level, territoryCode, awardKind, thresholdDays].join(":");
}

export function buildTerritorialLegendHoldTransition(
  current: TerritorialLegendHoldPeriod | null,
  winner: TerritorialLegendWinnerSnapshot | null,
): TerritorialLegendHoldPeriod | null {
  if (!winner) {
    if (!current || current.validityStatus !== "active" || current.endedOn) return current;
    return { ...current, endedOn: current.lastVerifiedOn, validityStatus: "closed" };
  }

  if (!current || current.validityStatus !== "active" || current.endedOn) {
    return {
      userId: winner.userId,
      level: winner.level,
      territoryCode: winner.territoryCode,
      territoryLabel: winner.territoryLabel,
      startedOn: winner.effectiveOn,
      lastVerifiedOn: winner.effectiveOn,
      endedOn: null,
      validityStatus: "active",
      sourceFingerprint: winner.sourceFingerprint,
    };
  }

  if (current.lastVerifiedOn === winner.effectiveOn || current.lastVerifiedOn === addDays(winner.effectiveOn, -1)) {
    return {
      ...current,
      lastVerifiedOn: winner.effectiveOn,
      territoryLabel: winner.territoryLabel,
      sourceFingerprint: winner.sourceFingerprint,
    };
  }

  // A missed effective date is an interruption, not an invitation to fill a
  // fictional interval. The caller closes the old period and opens this one.
  return {
    userId: winner.userId,
    level: winner.level,
    territoryCode: winner.territoryCode,
    territoryLabel: winner.territoryLabel,
    startedOn: winner.effectiveOn,
    lastVerifiedOn: winner.effectiveOn,
    endedOn: null,
    validityStatus: "active",
    sourceFingerprint: winner.sourceFingerprint,
  };
}

export function buildTerritorialLegendAwardProofs(
  period: TerritorialLegendHoldPeriod,
  existingProofIds: ReadonlySet<string> = new Set(),
): TerritorialLegendAwardProof[] {
  if (period.validityStatus === "invalidated") return [];
  const heldThroughOn = period.lastVerifiedOn;
  const days = inclusiveCivilDays(period.startedOn, heldThroughOn);
  const candidates: Array<{ awardKind: TerritorialLegendAwardProof["awardKind"]; thresholdDays: number }> = [
    { awardKind: "conquest", thresholdDays: 0 },
    ...TERRITORIAL_LEGEND_LONGEVITY_THRESHOLDS
      .filter((thresholdDays) => days >= thresholdDays)
      .map((thresholdDays) => ({ awardKind: "longevity" as const, thresholdDays })),
  ];
  return candidates.flatMap(({ awardKind, thresholdDays }) => {
    const proofId = awardProofId(period.userId, period.level, period.territoryCode, awardKind, thresholdDays);
    if (existingProofIds.has(proofId)) return [];
    return [{
      proofId,
      userId: period.userId,
      level: period.level,
      territoryCode: period.territoryCode,
      awardKind,
      thresholdDays,
      holdStartedOn: period.startedOn,
      heldThroughOn,
      awardedOn: heldThroughOn,
      validFrom: heldThroughOn,
      validUntil: null,
      validityStatus: "active" as const,
      sourceFingerprint: period.sourceFingerprint,
    }];
  });
}

export function territorialLegendProofToFact(proof: TerritorialLegendAwardProof): GamificationSourceFact {
  return {
    mechanicId: territorialLegendFamilyId(proof.level),
    eventType: TERRITORIAL_LEGEND_REWARD_EVENT_TYPE,
    sourceTable: TERRITORIAL_LEGEND_SOURCE_TABLE,
    sourceId: proof.proofId,
    occurredOn: proof.awardedOn,
    statusPhase: "validated",
    threshold: proof.thresholdDays,
    xpAwarded: 0,
    eligible: proof.validityStatus === "active",
    badgeId: territorialLegendFamilyId(proof.level),
    metadata: {
      awardKind: proof.awardKind,
      territorialLevel: proof.level,
      territoryCode: proof.territoryCode,
      holdStartedOn: proof.holdStartedOn,
      heldThroughOn: proof.heldThroughOn,
      validFrom: proof.validFrom,
      validUntil: proof.validUntil,
      validityStatus: proof.validityStatus,
      sourceFingerprint: proof.sourceFingerprint,
    },
  };
}
