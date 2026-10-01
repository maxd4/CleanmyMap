import { evaluateActionQuality } from "../actions/quality/quality";
import type { ActionListItem } from "../actions/types";
import { extractArea, round1, toFinite } from "./engagement.helpers";
import type { ActorActivityCard, QualityLeaderboardRow } from "./engagement.types";

/** POLICY engagement-quality-v1: values are product policy, not observations. */
export const ENGAGEMENT_QUALITY_POLICY = {
  version: "engagement-quality-v1",
  qualityWeight: 0.7,
  gradeAWeight: 35,
  actionCap: 20,
  actionWeight: 1.5,
  gradeCPenalty: 2,
} as const;

type QualityAggregationRow = {
  actions: number;
  wasteKg: number;
  wasteKgKnownActions: number;
  qualitySum: number;
  qualityA: number;
  qualityB: number;
  qualityC: number;
};

function getQualityActor(item: ActionListItem): string {
  return (
    item.actor_name?.trim() ||
    item.contract?.metadata.actorName?.trim() ||
    "Anonyme"
  );
}

function addQualityAction(row: QualityAggregationRow, item: ActionListItem): void {
  const quality = evaluateActionQuality(item);
  row.actions += 1;
  const wasteKg = item.waste_kg === null || item.waste_kg === undefined
    ? Number.NaN
    : toFinite(item.waste_kg, Number.NaN);
  if (Number.isFinite(wasteKg) && wasteKg >= 0) {
    row.wasteKg += wasteKg;
    row.wasteKgKnownActions += 1;
  }
  row.qualitySum += quality.score;
  if (quality.grade === "A") {
    row.qualityA += 1;
  } else if (quality.grade === "B") {
    row.qualityB += 1;
  } else {
    row.qualityC += 1;
  }
}

function buildQualityLeaderboardRow(
  actor: string,
  row: QualityAggregationRow,
): QualityLeaderboardRow {
  const avgQuality = row.actions > 0 ? row.qualitySum / row.actions : 0;
  const rateA = row.actions > 0 ? row.qualityA / row.actions : 0;
  const weightedScore =
    avgQuality * ENGAGEMENT_QUALITY_POLICY.qualityWeight +
    rateA * ENGAGEMENT_QUALITY_POLICY.gradeAWeight +
    Math.min(row.actions, ENGAGEMENT_QUALITY_POLICY.actionCap) *
      ENGAGEMENT_QUALITY_POLICY.actionWeight -
    row.qualityC * ENGAGEMENT_QUALITY_POLICY.gradeCPenalty;
  return {
    actor,
    actions: row.actions,
    wasteKg: row.wasteKgKnownActions > 0 ? round1(row.wasteKg) : null,
    wasteKgCoverage: {
      knownActions: row.wasteKgKnownActions,
      totalActions: row.actions,
    },
    avgQuality: round1(avgQuality),
    qualityA: row.qualityA,
    qualityB: row.qualityB,
    qualityC: row.qualityC,
    rateA: round1(rateA * 100),
    weightedScore: round1(weightedScore),
  };
}

export function computeQualityLeaderboard(
  actions: ActionListItem[],
): QualityLeaderboardRow[] {
  const grouped = new Map<string, QualityAggregationRow>();

  for (const item of actions) {
    const actor = getQualityActor(item);
    const row = grouped.get(actor) ?? {
      actions: 0,
      wasteKg: 0,
      wasteKgKnownActions: 0,
      qualitySum: 0,
      qualityA: 0,
      qualityB: 0,
      qualityC: 0,
    };
    addQualityAction(row, item);
    grouped.set(actor, row);
  }

  return [...grouped.entries()]
    .map(([actor, row]) => buildQualityLeaderboardRow(actor, row))
    .sort(
      (a, b) =>
        b.weightedScore - a.weightedScore ||
        b.avgQuality - a.avgQuality ||
        b.actions - a.actions,
    );
}

export function buildActorActivityCards(actions: ActionListItem[]): ActorActivityCard[] {
  const grouped = new Map<
    string,
    {
      actions: number;
      qualitySum: number;
      zoneCounts: Map<string, number>;
    }
  >();

  for (const item of actions) {
    const actor = item.actor_name?.trim();
    if (!actor) {
      continue;
    }
    const quality = evaluateActionQuality(item);
    const zone = extractArea(
      item.location_label || item.contract?.location.label || "",
    );
    const row = grouped.get(actor) ?? {
      actions: 0,
      qualitySum: 0,
      zoneCounts: new Map<string, number>(),
    };
    row.actions += 1;
    row.qualitySum += quality.score;
    row.zoneCounts.set(zone, (row.zoneCounts.get(zone) ?? 0) + 1);
    grouped.set(actor, row);
  }

  return [...grouped.entries()]
    .map(([actor, row]) => {
      const avgQuality = row.actions > 0 ? row.qualitySum / row.actions : 0;
      const zone =
        [...row.zoneCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
        "Hors arrondissement";
      return {
        actor,
        zone,
        actions: row.actions,
        avgActionQuality: round1(avgQuality),
      };
    })
    .sort((a, b) => b.actions - a.actions || b.avgActionQuality - a.avgActionQuality)
    .slice(0, 12);
}
