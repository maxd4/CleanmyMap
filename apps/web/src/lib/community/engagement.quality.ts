import { evaluateActionQuality } from "../actions/quality";
import type { ActionListItem } from "../actions/types";
import {
  badgeFromQuality,
  capacityLabel,
  extractArea,
  nextActionFromPartner,
  roleFromPartner,
  round1,
  toFinite,
} from "./engagement.helpers";
import type { PartnerCard, QualityLeaderboardRow } from "./engagement.types";

export function computeQualityLeaderboard(
  actions: ActionListItem[],
): QualityLeaderboardRow[] {
  const grouped = new Map<
    string,
    {
      actions: number;
      wasteKg: number;
      qualitySum: number;
      qualityA: number;
      qualityB: number;
      qualityC: number;
    }
  >();

  for (const item of actions) {
    const actor =
      item.actor_name?.trim() ||
      item.contract?.metadata.actorName?.trim() ||
      "Anonyme";
    const quality = evaluateActionQuality(item);
    const row = grouped.get(actor) ?? {
      actions: 0,
      wasteKg: 0,
      qualitySum: 0,
      qualityA: 0,
      qualityB: 0,
      qualityC: 0,
    };
    row.actions += 1;
    row.wasteKg += toFinite(item.waste_kg, 0);
    row.qualitySum += quality.score;
    if (quality.grade === "A") {
      row.qualityA += 1;
    } else if (quality.grade === "B") {
      row.qualityB += 1;
    } else {
      row.qualityC += 1;
    }
    grouped.set(actor, row);
  }

  return [...grouped.entries()]
    .map(([actor, row]) => {
      const avgQuality = row.actions > 0 ? row.qualitySum / row.actions : 0;
      const rateA = row.actions > 0 ? row.qualityA / row.actions : 0;
      const weightedScore =
        avgQuality * 0.7 +
        rateA * 35 +
        Math.min(row.actions, 20) * 1.5 -
        row.qualityC * 2;
      return {
        actor,
        actions: row.actions,
        wasteKg: round1(row.wasteKg),
        avgQuality: round1(avgQuality),
        qualityA: row.qualityA,
        qualityB: row.qualityB,
        qualityC: row.qualityC,
        rateA: round1(rateA * 100),
        weightedScore: round1(weightedScore),
        badge: badgeFromQuality(avgQuality, row.actions, rateA),
      };
    })
    .sort(
      (a, b) =>
        b.weightedScore - a.weightedScore ||
        b.avgQuality - a.avgQuality ||
        b.actions - a.actions,
    );
}

export function buildPartnerCards(actions: ActionListItem[]): PartnerCard[] {
  const grouped = new Map<
    string,
    {
      actions: number;
      qualitySum: number;
      zoneCounts: Map<string, number>;
    }
  >();

  for (const item of actions) {
    const actor =
      item.actor_name?.trim() ||
      item.contract?.metadata.actorName?.trim() ||
      "Anonyme";
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
      const contact = actor.includes("@")
        ? actor
        : `Canal communaute: ${actor}`;
      return {
        actor,
        role: roleFromPartner(row.actions, avgQuality),
        zone,
        contact,
        capacity: capacityLabel(row.actions),
        actions: row.actions,
        avgQuality: round1(avgQuality),
        nextAction: nextActionFromPartner(zone, avgQuality),
      };
    })
    .sort((a, b) => b.actions - a.actions || b.avgQuality - a.avgQuality)
    .slice(0, 12);
}
