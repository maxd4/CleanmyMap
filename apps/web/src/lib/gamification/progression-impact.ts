import {
  ACTION_QUALITY_RULESET_VERSION,
  ACTION_QUALITY_WEIGHTS,
} from "@/lib/actions/quality-rules";
import type {
  ActionRow,
  PersonalImpactMethodology,
  PersonalImpactMetrics,
} from "./progression-types";
import { IMPACT_PROXY_CONFIG } from "./impact-proxy-config";
import { toFloat, toInt } from "./progression-utils";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function computePersonalImpactMetrics(
  rows: ActionRow[],
): PersonalImpactMetrics {
  const factors = IMPACT_PROXY_CONFIG.factors;
  let totalButts = 0;
  let totalWasteKg = 0;
  let totalVolunteerMinutes = 0;

  for (const row of rows) {
    if (row.status !== "approved") {
      continue;
    }
    totalButts += toInt(row.cigarette_butts, 0);
    totalWasteKg += toFloat(row.waste_kg, 0);
    totalVolunteerMinutes +=
      Math.max(0, toInt(row.duration_minutes, 0)) *
      Math.max(1, toInt(row.volunteers_count, 1));
  }

  return {
    waterSavedLiters: Math.round(
      totalButts * factors.waterLitersPerCigaretteButt,
    ),
    co2AvoidedKg: round1(totalWasteKg * factors.co2KgPerWasteKg),
    surfaceCleanedM2: round1(
      totalWasteKg * factors.surfaceM2PerWasteKg +
        totalVolunteerMinutes * factors.surfaceM2PerVolunteerMinute,
    ),
    wasteKg: round1(totalWasteKg),
    cigaretteButts: totalButts,
  };
}

export function buildPersonalImpactMethodology(
  qualityAverage: number,
): PersonalImpactMethodology {
  const factors = IMPACT_PROXY_CONFIG.factors;
  const qualityWeightLabel = [
    `completude ${(ACTION_QUALITY_WEIGHTS.completeness * 100).toFixed(0)}%`,
    `coherence ${(ACTION_QUALITY_WEIGHTS.coherence * 100).toFixed(0)}%`,
    `geoloc ${(ACTION_QUALITY_WEIGHTS.geoloc * 100).toFixed(0)}%`,
    `tracabilite ${(ACTION_QUALITY_WEIGHTS.traceability * 100).toFixed(0)}%`,
    `fraicheur ${(ACTION_QUALITY_WEIGHTS.freshness * 100).toFixed(0)}%`,
  ].join(", ");

  return {
    proxyVersion: IMPACT_PROXY_CONFIG.version,
    qualityRulesVersion: ACTION_QUALITY_RULESET_VERSION,
    scope: "Actions approuvees uniquement (status=approved).",
    pollutionScoreAverage: Math.round(qualityAverage * 10) / 10,
    formulas: [
      {
        id: "water_saved",
        label: "Eau sauvee (proxy)",
        formula: `eau_L = megots_valides * ${factors.waterLitersPerCigaretteButt}`,
        interpretation:
          "Ordre de grandeur du risque de pollution evite lie au retrait des megots.",
      },
      {
        id: "co2_avoided",
        label: "CO2 evite (proxy)",
        formula: `co2_kg = dechets_kg_valides * ${factors.co2KgPerWasteKg}`,
        interpretation:
          "Proxy de potentiel evite, sans remplacer un bilan carbone complet.",
      },
      {
        id: "surface_cleaned",
        label: "Surface nettoyee (proxy)",
        formula:
          `surface_m2 = dechets_kg_valides * ${factors.surfaceM2PerWasteKg} + ` +
          `minutes_benevoles * ${factors.surfaceM2PerVolunteerMinute}`,
        interpretation:
          "Approximation de couverture operationnelle, sensible au contexte terrain.",
      },
      {
        id: "pollution_score_mean",
        label: "Score pollution moyen (qualite des preuves)",
        formula: `moyenne(score_qualite_action), score_qualite = ${qualityWeightLabel}`,
        interpretation:
          "Score 0-100 pour la credibilite des declarations, puis moyenne sur actions approuvees.",
      },
    ],
    approximations: [
      "Les facteurs eau/CO2/surface sont des proxys versionnes, pas des mesures instrumentales.",
      "Les volumes et durees proviennent des declarations terrain puis moderation.",
    ],
    hypotheses: [
      "Les declarations validees refletent correctement les quantites et localisations observees.",
      "Le temps benevole cumule est un indicateur raisonnable de couverture d'intervention.",
    ],
    sources: IMPACT_PROXY_CONFIG.sources,
    errorMargins: {
      waterSavedLitersPct: 35,
      co2AvoidedKgPct: 30,
      surfaceCleanedM2Pct: 40,
      pollutionScoreMeanPoints: 10,
    },
  };
}
