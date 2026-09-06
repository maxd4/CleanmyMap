import type { HomeCounters } from "@/lib/accueil/config";

export type ImpactInsight = {
  lines: string[];
  note?: string;
};

function format(value: number, maximumFractionDigits = 1): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits,
  }).format(value);
}

function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${format(meters / 1000, 1)} km`
    : `${format(meters, 1)} m`;
}

export function buildImpactInsight(
  key: string,
  counters: HomeCounters,
  actionCount: number,
): ImpactInsight {
  switch (key) {
    case "wasteKg":
      return {
        lines: [
          `≈ ${format(counters.wasteKg / 5)} sacs de ramassage de 50 L`,
          `≈ ${format(counters.wasteKg / 15)} vélos mécaniques`,
        ],
        note: "Base indicative : 1 sac = 5 kg, 1 vélo = 15 kg.",
      };
    case "butts": {
      const meters = counters.butts * 0.025;
      const kilometres = meters / 1000;
      return {
        lines: [
          `Mis bout à bout : ≈ ${formatDistance(meters)}`,
          `Soit ≈ ${format((kilometres / 775) * 100, 2)} % d'un Paris–Marseille`,
          `Poids cumulé : ≈ ${format((counters.butts * 0.2) / 1000)} kg`,
        ],
        note: "Repères : 1 mégot = 2,5 cm et 0,2 g.",
      };
    }
    case "volunteers":
      return {
        lines: [
          "Une dynamique de proximité en solo, binôme ou trinôme",
          actionCount > 0
            ? `≈ ${format(counters.volunteers / actionCount)} participants par action collective`
            : "Les actions collectives créent leur propre dynamique.",
        ],
        note: actionCount > 0 ? "Moyenne indicative sur les actions comptabilisées." : undefined,
      };
    case "co2": {
      const grams = counters.co2AvoidedKg * 1000;
      const parisMoscowTrips = grams / (142 * 2840);
      return {
        lines: [
          `≈ ${format(grams / 142)} km en voiture thermique évités`,
          `≈ ${format(parisMoscowTrips, 2)} trajet${parisMoscowTrips > 1 ? "s" : ""} Paris–Moscou`,
          `≈ ${format((grams / 1_000_000) * 100, 2)} % d'un vol Paris–New York`,
        ],
        note: "Repères : 142 g/km en voiture, 1 000 000 g par vol aller simple.",
      };
    }
    case "water": {
      const pools = counters.waterSavedLiters / 2_500_000;
      const years = counters.waterSavedLiters / 55_000;
      return {
        lines: [
          `≈ ${format(pools, 2)} piscine${pools > 1 ? "s" : ""} olympique${pools > 1 ? "s" : ""}`,
          `≈ ${format(years)} année${years > 1 ? "s" : ""} de consommation`,
        ],
        note: "Base scientifique : 1 mégot = 500 L potentiellement pollués.",
      };
    }
    case "euro":
      return {
        lines: [
          "Estimation du coût de voirie évité",
          "Calcul : heures d'action cumulées × 11,92 €",
          "Une méthode lisible pour valoriser l'effort terrain.",
        ],
        note: "Voir la méthodologie pour le détail du calcul.",
      };
    default:
      return { lines: ["Indicateur d'impact terrain."] };
  }
}
