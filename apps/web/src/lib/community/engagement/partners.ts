import { evaluateActionQuality } from "../../actions/quality";
import type { ActionListItem } from "../../actions/types";
import type { PartnerCard } from "./types";
import { extractArea, round1 } from "./shared";

function roleFromPartner(actions: number, avgQuality: number): string {
  if (actions >= 20 && avgQuality >= 75) {
    return "Coordinateur terrain";
  }
  if (actions >= 10) {
    return "Referent associatif";
  }
  return "Relais local";
}

function capacityLabel(actions: number): string {
  const monthly = actions / 12;
  if (monthly >= 3) {
    return "Forte (>=3 sorties/mois)";
  }
  if (monthly >= 1.5) {
    return "Moyenne (1 a 3 sorties/mois)";
  }
  return "Ponctuelle (<1.5 sortie/mois)";
}

function nextActionFromPartner(zone: string, avgQuality: number): string {
  if (avgQuality < 70) {
    return "Renforcer la qualite de declaration (preuve geo, completude).";
  }
  if (zone === "Hors arrondissement") {
    return "Preciser la zone d'action pour la prochaine intervention.";
  }
  return `Programmer une co-animation sur ${zone} avec objectif qualite maintenu.`;
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
