import type { HomeCounters, HomeImpactSnapshot } from "@/lib/accueil/config";

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

function formatMass(kg: number): string {
  return kg >= 1 ? `${format(kg, 1)} kg` : `${format(kg * 1000, 1)} g`;
}

function formatPlural(
  value: number,
  singular: string,
  plural: string,
  maximumFractionDigits = 1,
): string {
  return `${format(value, maximumFractionDigits)} ${value === 1 ? singular : plural}`;
}

export function buildImpactInsight(
  key: string,
  counters: HomeCounters,
  actionCount: number,
  impactSnapshot?: HomeImpactSnapshot | null,
): ImpactInsight {
  switch (key) {
    case "wasteKg": {
      const results = impactSnapshot?.impactTerrain;
      if (!results) return { lines: [] };

      return {
        lines: [
          `≈ ${formatPlural(results.wasteBagsEquivalent, "sac poubelle de 50 L", "sacs poubelle de 50 L")}`,
          `≈ ${formatPlural(results.wasteMechanicalBicyclesEquivalent, "Vélib'", "Vélib'")}`,
        ],
      };
    }
    case "butts": {
      const results = impactSnapshot?.impactTerrain;
      if (!results) return { lines: [] };

      const lines = [
        `≈ ${formatDistance(results.buttsDistanceMeters)} de mégots alignés`,
      ];
      if (results.estimatedButtsWeightKg !== null) {
        lines.push(`≈ ${formatMass(results.estimatedButtsWeightKg)} de mégots`);
      }

      return {
        lines,
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
      const results = impactSnapshot?.impactTerrain;
      if (!results) return { lines: [] };

      return {
        lines: [
          `≈ ${format(results.co2CarKilometers)} km en voiture thermique, soit ${formatPlural(results.co2ParisMoscowCarTrips, "voyage", "voyages", 2)} Paris–Moscou`,
          `≈ ${formatPlural(results.co2ParisNewYorkFlightShares, "voyage", "voyages", 2)} Paris–New York en avion`,
        ],
      };
    }
    case "water": {
      const results = impactSnapshot?.impactTerrain;
      if (!results) return { lines: [] };

      return {
        lines: [
          `≈ ${formatPlural(results.waterOlympicPools, "piscine olympique", "piscines olympiques", 2)}`,
          `≈ ${formatPlural(results.waterFrenchPersonYears, "année", "années", 2)} de consommation d'eau d'un Français moyen`,
        ],
      };
    }
    case "euro": {
      const savings = impactSnapshot?.streetCleaningSavings;
      if (!savings) return { lines: [] };

      return {
        lines: [
          `${format(savings.lowerBoundEuros, 2)} à ${format(savings.upperBoundEuros, 2)} € économisés grâce au temps d'action bénévole et aux déchets retirés`,
        ],
      };
    }
    default:
      return { lines: ["Indicateur d'impact terrain."] };
  }
}
