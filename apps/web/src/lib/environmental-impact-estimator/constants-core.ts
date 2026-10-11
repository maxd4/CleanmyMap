import type { EnvironmentalImpactProjectAnchor } from "./types-project";

export const ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION =
  "environmental-impact-estimator-2026.05-v1";

/**
 * Default location-based electricity factor for infrastructure mainly hosted
 * in the United States. It is a configuration anchor, not a measurement of
 * CleanMyMap's actual provider mix. Replace it when a provider region or a
 * measured electricity signal is available.
 */
export const ENVIRONMENTAL_IMPACT_ELECTRICITY_FACTOR = {
  kgCo2ePerKwh: 0.35,
  region: "Serveurs majoritairement américains",
  sourceLabel: "EPA eGRID / EIA",
  sourceUrls: [
    "https://www.epa.gov/egrid",
    "https://www.eia.gov/tools/faqs/faq.php?id=74&t=11",
  ],
} as const;

/**
 * Configurable U.S. average proxy for indirect water consumption associated
 * with electricity used by data centers. Replace it with a location-specific
 * factor when the provider/grid location is known.
 */
export const ENVIRONMENTAL_IMPACT_WATER_FACTOR = {
  litersPerKwh: 4.52,
  region: "Électricité associée à des data centers américains",
  sourceLabel: "LBNL — 2024 United States Data Center Energy Usage Report",
  sourceUrl: "https://doi.org/10.71468/P1WC7Q",
  isProxy: true,
} as const;

export const ENVIRONMENTAL_IMPACT_CO2E_COMPOSITION_NOTE =
  "Le CO₂e agrège plusieurs gaz à effet de serre en équivalent CO₂. Pour l’électricité, le CO₂ domine généralement les émissions de combustion ; CH₄ et N₂O sont inclus lorsque le facteur utilisé les couvre.";

export const ENVIRONMENTAL_IMPACT_ESTIMATOR_HYPOTHESES = [
  "Les mesures sont des proxys d'usage et non un bilan carbone certifié.",
  "Une donnée absente signifie 'non branchée' et non zéro.",
  "Quand elles existent, les métriques sont déduites des tables opérationnelles CleanMyMap plutôt que de moyennes externes génériques.",
  "Le stockage est normalisé en GB-mois pour rester comparable dans le temps.",
  "Les appels IA sont isolés car leur coût varie davantage que les autres postes.",
  "Les calculs restent additifs et traçables poste par poste.",
] as const;

export const ENVIRONMENTAL_IMPACT_ESTIMATOR_LIMITATIONS = [
  "Le socle décrit une structure d'estimation, pas une méthode d'ACV complète.",
  "Les facteurs doivent être recalibrés lorsque des données réelles seront disponibles.",
  "Le moteur conserve les postes visibles même si certaines sources ne sont pas branchées.",
] as const;
export const ENVIRONMENTAL_IMPACT_PROJECT_ANCHORS = [
  {
    key: "central-ai-accounting",
    label: "Comptabilité IA centrale CleanMyMap",
    description:
      "35 Md token-équivalent, déclaré et associé à une hypothèse; les valeurs physiques sont des proxys auditables, pas des mesures fournisseur.",
    kWhEquivalent: 10_500,
    kgCo2eProxy: 3_675,
    waterLitersEquivalent: 47_500,
    comparisonNote:
      "Calcul central: 10,5 MWh, 3,675 tCO2e électrique et 47,5 m³ d'eau indirecte; affichage arrondi à 10 MWh, 3,7 t et 45 m³.",
  },
  {
    key: "partial-lca",
    label: "ACV partielle centrale",
    description:
      "Complément partiel de cycle de vie conservé comme hypothèse et proxy, sans double comptage avec l'électricité.",
    kWhEquivalent: null,
    kgCo2eProxy: 5_000,
    waterLitersEquivalent: null,
    comparisonNote:
      "Valeur centrale calculée: 4,8 tCO2e, affichée ≈5 tCO2e; aucune compensation ou soustraction avec un autre poste.",
  },
  {
    key: "audited-services",
    label: "Services audités — activité sans facteur physique",
    description:
      "Vercel, Supabase, GitHub Actions, Clerk et LWS exposent leurs observations d'audit; l'impact physique reste NA.",
    kWhEquivalent: null,
    kgCo2eProxy: null,
    waterLitersEquivalent: null,
    comparisonNote:
      "Usage observé + facteur physique absent = OBSERVED/DERIVED + NA; aucune conversion arbitraire n'est appliquée.",
  },
] as const satisfies readonly EnvironmentalImpactProjectAnchor[];
