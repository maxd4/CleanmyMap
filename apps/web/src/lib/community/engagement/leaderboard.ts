import { evaluateActionQuality } from "../../actions/quality";
import type { ActionListItem } from "../../actions/types";
import type { QualityLeaderboardRow } from "./types";
import { round1, toFinite } from "./shared";

function badgeFromQuality(
  avgQuality: number,
  actions: number,
  rateA: number,
): string {
  if (avgQuality >= 85 && actions >= 8 && rateA >= 0.5) {
    return "Ambassadeur qualite";
  }
  if (avgQuality >= 75 && actions >= 10) {
    return "Pilier terrain";
  }
  if (avgQuality >= 70 && actions >= 5) {
    return "Contributeur fiable";
  }
  return "En progression";
}

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
