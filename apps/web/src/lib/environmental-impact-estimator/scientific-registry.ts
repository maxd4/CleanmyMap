/**
 * Registre canonique des facteurs environnementaux et contrats scientifiques.
 *
 * Partagé entre l'estimateur environnemental existant (CleanMyMap site & projet)
 * et « Mon empreinte IA » (utilisation personnelle déclarée & scénarios).
 *
 * INVARIANTS MAJEURS :
 * 1. Périmètres comptables étanches : Ne jamais fusionner fonctionnement CleanMyMap,
 *    développement projet, utilisation personnelle déclarée et scénarios.
 * 2. Unidirectionnalité physique : kWh × facteur -> CO2e / eau. Jamais de division inverse.
 * 3. Ne jamais convertir le proxy générique aiCalls en facteur par token.
 * 4. Ne jamais appliquer automatiquement les coefficients américains à une infrastructure inconnue.
 * 5. Seules les catégories disposant de méthodes sourcées produisent des estimations physiques.
 * 6. Diagnostic déterministe de qualité des données : aucun score de confiance numérique arbitraire.
 * 7. Absence totale de double comptage (IT vs PUE, eau directe/indirecte, carbone/ACV).
 */

export type ScientificProofStatus =
  | "OBSERVED"
  | "DERIVED"
  | "DECLARED"
  | "ASSUMPTION"
  | "PROXY"
  | "NA";

export type AccountingScopeType =
  | "CLEANMYMAP_PRODUCTION"
  | "CLEANMYMAP_DEVELOPMENT"
  | "PERSONAL_AI_USAGE"
  | "HYPOTHETICAL_SCENARIO"
  | "NOT_CALCULABLE";

export type ScientificFactorRegion = "US" | "FR" | "GLOBAL" | "UNKNOWN";

export type ScientificFactorScope =
  | "operational_scope_2"
  | "indirect_water"
  | "ai_inference_energy"
  | "embodied_carbon_overhead"
  | "pedagogical_equivalence"
  | "multimodal_image"
  | "multimodal_audio"
  | "multimodal_video";

export type ScientificPhysicalUnit =
  | "kgCO2e/kWh"
  | "L/kWh"
  | "kWh/million_tokens"
  | "kWh/image"
  | "kWh/minute"
  | "kWh/second"
  | "kgCO2e/100km"
  | "fraction";

export type MultimodalCategory = "text" | "image" | "audio" | "video";

export type EnvironmentalDataQualityDiagnostic =
  | "MEASURED"
  | "DOCUMENTED_MODEL"
  | "PROXY_SCENARIO"
  | "NOT_CALCULABLE";

export type ScientificFactorRecord = {
  readonly id: string;
  readonly version: string;
  readonly label: string;
  readonly source: string;
  readonly sourceUrls: readonly string[];
  readonly date: string;
  readonly region: ScientificFactorRegion;
  readonly scope: ScientificFactorScope;
  readonly unit: ScientificPhysicalUnit;
  readonly value: number | null;
  readonly hypotheses: readonly string[];
  readonly proofStatus: ScientificProofStatus;
  readonly isProxy: boolean;
};

export const ANTI_DOUBLE_COUNTING_RULES = [
  {
    id: "NO_IT_FACILITY_DOUBLE_COUNT",
    title: "Énergie IT vs Énergie totale Data Center (PUE)",
    rule: "L'énergie totale d'un centre de données inclut déjà l'énergie IT multipliée par le PUE (E_total = E_IT × PUE). Ne jamais additionner E_total et E_IT pour une même charge.",
  },
  {
    id: "NO_WATER_DOUBLE_COUNT",
    title: "Eau directe vs Eau indirecte",
    rule: "L'eau indirecte liée à la production d'électricité (kWh × f_W) ne s'ajoute à l'eau directe sur site que si cette dernière n'intègre pas déjà le cycle amont de la centrale électrique.",
  },
  {
    id: "NO_ACV_EMBODIED_DOUBLE_COUNT",
    title: "Carbone opérationnel vs Carbone incorporé",
    rule: "La majoration de sensibilité ACV partielle (+30%) s'applique au carbone opérationnel sans imputer à nouveau la fabrication des mêmes serveurs ou GPU dans un autre poste matériel.",
  },
  {
    id: "NO_CROSS_SCOPE_DOUBLE_COUNT",
    title: "Séparation hermétique des périmètres comptables",
    rule: "Les opérations du site CleanMyMap (CLEANMYMAP_PRODUCTION), son développement assisté par IA (CLEANMYMAP_DEVELOPMENT) et les usages personnels des utilisateurs (PERSONAL_AI_USAGE) sont des périmètres strictement indépendants. Aucun chevauchement ni double comptage n'est permis entre eux.",
  },
  {
    id: "NO_TOKEN_TIME_DOUBLE_COUNT",
    title: "Tokens vs Temps actif",
    rule: "Pour une même session ou activité IA, ne jamais sommer une estimation calculée sur les tokens et une estimation calculée sur la durée de conversation/session.",
  },
  {
    id: "NO_REVERSE_CO2_TO_KWH",
    title: "Unidirectionnalité physique de la conversion électrique",
    rule: "La conversion électrique ne s'effectue que dans le sens physique kWh réel × f_C = kgCO2e. Il est strictement interdit de diviser un CO2e proxy par un facteur d'émission pour fabriquer un prétendu 'kWh électrique mesuré'.",
  },
] as const;

export const SCIENTIFIC_FACTOR_REGISTRY: readonly ScientificFactorRecord[] = [
  {
    id: "electricity-us-egrid-2024",
    version: "2024.1",
    label: "Électricité — Mix moyen États-Unis (EPA eGRID / EIA)",
    source: "EPA eGRID / EIA",
    sourceUrls: [
      "https://www.epa.gov/egrid",
      "https://www.eia.gov/tools/faqs/faq.php?id=74&t=11",
    ],
    date: "2024",
    region: "US",
    scope: "operational_scope_2",
    unit: "kgCO2e/kWh",
    value: 0.35,
    hypotheses: [
      "Proxy représentatif pour serveurs situés aux États-Unis lorsque le mix horaire ou local n'est pas mesuré.",
      "Ne doit jamais être appliqué automatiquement à une infrastructure de localisation inconnue ou non américaine.",
    ],
    proofStatus: "PROXY",
    isProxy: true,
  },
  {
    id: "electricity-fr-rte-2024",
    version: "2024.1",
    label: "Électricité — Intensité moyenne directe de production réseau France (RTE)",
    source: "RTE — Bilan électrique 2024 (émissions directes de production)",
    sourceUrls: [
      "https://analysesetdonnees.rte-france.com/bilan-electrique-2024/emissions",
    ],
    date: "2024",
    region: "FR",
    scope: "operational_scope_2",
    unit: "kgCO2e/kWh",
    value: 0.0217,
    hypotheses: [
      "21,7 gCO₂e/kWh correspond à l'intensité moyenne des émissions directes de la production électrique en France (distincte de 30,2 gCO₂e/kWh en analyse de cycle de vie).",
      "Ne constitue pas une mesure directe de l'électricité consommée par un data center donné : utilisé comme proxy régional d'analyse de sensibilité pour des infrastructures situées en France.",
    ],
    proofStatus: "PROXY",
    isProxy: true,
  },
  {
    id: "water-indirect-datacenter-us-2024",
    version: "2024.1",
    label: "Eau indirecte — Consommation liée à la production d'électricité pour data centers américains (LBNL)",
    source: "LBNL — 2024 United States Data Center Energy Usage Report",
    sourceUrls: [
      "https://doi.org/10.71468/P1WC7Q",
    ],
    date: "2024",
    region: "US",
    scope: "indirect_water",
    unit: "L/kWh",
    value: 4.52,
    hypotheses: [
      "Proxy moyen de consommation hydrique indirecte (évaporation amont en centrale électrique).",
      "Ne mesure pas l'eau directe sur site (tours de refroidissement).",
      "Spécifique au mix thermique/hydrique américain ; non applicable automatiquement à d'autres réseaux.",
    ],
    proofStatus: "PROXY",
    isProxy: true,
  },
  {
    id: "ai-inference-energy-scenario-low-v1",
    version: "2026.05-v1",
    label: "Énergie inférence IA — Scénario bas (modèles compacts / forte mise en cache / requêtes courtes)",
    source: "CleanMyMap impact_IA — Annexe B.7",
    sourceUrls: [
      "documentation/plans/rapport_impact/impact_IA/annexes/B-methodologie-calcul-incertitudes.md",
    ],
    date: "2026-05",
    region: "GLOBAL",
    scope: "ai_inference_energy",
    unit: "kWh/million_tokens",
    value: 0.06,
    hypotheses: [
      "Modèles légers, batching optimisé, cache d'entrée élevé (>95%) ou inférence compacte.",
      "Scénario de sensibilité basse pour l'inférence de texte.",
    ],
    proofStatus: "ASSUMPTION",
    isProxy: true,
  },
  {
    id: "ai-inference-energy-scenario-central-v1",
    version: "2026.05-v1",
    label: "Énergie inférence IA — Scénario central (modèles généralistes / flux agentique modéré)",
    source: "CleanMyMap impact_IA — Annexe B.7",
    sourceUrls: [
      "documentation/plans/rapport_impact/impact_IA/annexes/B-methodologie-calcul-incertitudes.md",
    ],
    date: "2026-05",
    region: "GLOBAL",
    scope: "ai_inference_energy",
    unit: "kWh/million_tokens",
    value: 0.30,
    hypotheses: [
      "Scénario central de sensibilité pour charges multi-modèles de développement et usage courant.",
      "Ancrage retenu pour le bilan des 35 Md token-équivalents de CleanMyMap (≈10,5 MWh).",
    ],
    proofStatus: "ASSUMPTION",
    isProxy: true,
  },
  {
    id: "ai-inference-energy-scenario-high-v1",
    version: "2026.05-v1",
    label: "Énergie inférence IA — Scénario haut (grands modèles de raisonnement / contextes longs / multi-agents intensifs)",
    source: "CleanMyMap impact_IA — Annexe B.7",
    sourceUrls: [
      "documentation/plans/rapport_impact/impact_IA/annexes/B-methodologie-calcul-incertitudes.md",
    ],
    date: "2026-05",
    region: "GLOBAL",
    scope: "ai_inference_energy",
    unit: "kWh/million_tokens",
    value: 0.60,
    hypotheses: [
      "Grands modèles de frontière, raisonnement étendu (extended thinking), contextes de centaines de milliers de tokens sans cache complet.",
    ],
    proofStatus: "ASSUMPTION",
    isProxy: true,
  },
  {
    id: "ai-partial-lca-overhead-v1",
    version: "2026.05-v1",
    label: "ACV partielle — Majoration de sensibilité carbone incorporé (+30%)",
    source: "CleanMyMap impact_IA — Annexe B.14",
    sourceUrls: [
      "documentation/plans/rapport_impact/impact_IA/annexes/B-methodologie-calcul-incertitudes.md",
    ],
    date: "2026-05",
    region: "GLOBAL",
    scope: "embodied_carbon_overhead",
    unit: "fraction",
    value: 0.30,
    hypotheses: [
      "Majoration de sensibilité de 30% sur le carbone opérationnel.",
      "Représente de manière prudente un ordre de grandeur de carbone incorporé du matériel cloud sans prétendre le mesurer.",
      "Ne constitue pas une ACV certifiée complète.",
    ],
    proofStatus: "ASSUMPTION",
    isProxy: true,
  },
  {
    id: "multimodal-image-unmeasured-v1",
    version: "2026.05-v1",
    label: "Génération d'images IA — Facteur physique non calculable (NA)",
    source: "CleanMyMap impact_IA — Annexe B.18",
    sourceUrls: [
      "documentation/plans/rapport_impact/impact_IA/annexes/B-methodologie-calcul-incertitudes.md",
    ],
    date: "2026-05",
    region: "GLOBAL",
    scope: "multimodal_image",
    unit: "kWh/image",
    value: null,
    hypotheses: [
      "Environ 130 générations/modifications d'images déclarées pour CleanMyMap.",
      "L'impact physique (kWh, CO2e, eau) reste NA faute de méthode sourcée reproductible pour ces architectures hétérogènes.",
    ],
    proofStatus: "NA",
    isProxy: false,
  },
  {
    id: "multimodal-audio-unmeasured-v1",
    version: "2026.05-v1",
    label: "Audio / Voix IA — Facteur physique non calculable (NA)",
    source: "CleanMyMap impact_IA — Annexe B",
    sourceUrls: [
      "documentation/plans/rapport_impact/impact_IA/annexes/B-methodologie-calcul-incertitudes.md",
    ],
    date: "2026-05",
    region: "GLOBAL",
    scope: "multimodal_audio",
    unit: "kWh/minute",
    value: null,
    hypotheses: [
      "Catégorie intégrée au contrat scientifique.",
      "Aucun facteur physique générique sourcé n'est applicable : statut NA.",
    ],
    proofStatus: "NA",
    isProxy: false,
  },
  {
    id: "multimodal-video-unmeasured-v1",
    version: "2026.05-v1",
    label: "Vidéo IA — Facteur physique non calculable (NA)",
    source: "CleanMyMap impact_IA — Annexe B",
    sourceUrls: [
      "documentation/plans/rapport_impact/impact_IA/annexes/B-methodologie-calcul-incertitudes.md",
    ],
    date: "2026-05",
    region: "GLOBAL",
    scope: "multimodal_video",
    unit: "kWh/second",
    value: null,
    hypotheses: [
      "Catégorie intégrée au contrat scientifique.",
      "Aucun facteur physique générique sourcé n'est applicable : statut NA.",
    ],
    proofStatus: "NA",
    isProxy: false,
  },
  {
    id: "digital-car-equivalent-ademe-v1",
    version: "2026.05-v1",
    label: "Équivalence pédagogique — Voiture thermique moyenne (Base Empreinte ADEME / Impact CO₂)",
    source: "ADEME / Impact CO₂",
    sourceUrls: [
      "https://impactco2.fr/outils/transport/itineraire?iframe=1",
    ],
    date: "2025",
    region: "FR",
    scope: "pedagogical_equivalence",
    unit: "kgCO2e/100km",
    value: 14.2,
    hypotheses: [
      "Repère d'interface pédagogique (1,42 kgCO2e pour 10 km, ou 10 kgCO2e ≈ 70 km).",
      "Ne constitue pas une conversion des données CleanMyMap ni une distance réelle.",
    ],
    proofStatus: "PROXY",
    isProxy: true,
  },
] as const;

/**
 * Récupère un facteur scientifique par son identifiant et optionnellement sa version.
 */
export function getScientificFactor(id: string, version?: string): ScientificFactorRecord {
  const factor = SCIENTIFIC_FACTOR_REGISTRY.find(
    (item) => item.id === id && (!version || item.version === version),
  );
  if (!factor) {
    throw new Error(
      `Facteur scientifique introuvable dans le registre canonique : id="${id}"${version ? ` version="${version}"` : ""}.`,
    );
  }
  return factor;
}

/**
 * Récupère la valeur numérique garantie d'un facteur scientifique canonique.
 */
export function requireNumericScientificFactorValue(id: string, version?: string): number {
  const factor = getScientificFactor(id, version);
  if (typeof factor.value !== "number" || !Number.isFinite(factor.value)) {
    throw new Error(
      `Le facteur scientifique "${id}" ne possède pas de valeur numérique exploitable.`,
    );
  }
  return factor.value;
}

/**
 * Filtre les facteurs du registre canonique par région ou périmètre.
 */
export function listScientificFactors(filter?: {
  region?: ScientificFactorRegion;
  scope?: ScientificFactorScope;
}): ScientificFactorRecord[] {
  return SCIENTIFIC_FACTOR_REGISTRY.filter((factor) => {
    if (filter?.region && factor.region !== filter.region) return false;
    if (filter?.scope && factor.scope !== filter.scope) return false;
    return true;
  });
}

/**
 * GARDE-FOU SCIENTIFIQUE 1 :
 * Interdiction absolue de convertir le proxy générique aiCalls en facteur par token.
 */
export function assertNoGenericAiCallsToTokensConversion(params: {
  metricKey: string;
  targetUnit: string;
}): void {
  if (
    params.metricKey.toLowerCase().includes("aicalls") &&
    params.targetUnit.toLowerCase().includes("token")
  ) {
    throw new Error(
      "VIOLATION DU CONTRAT SCIENTIFIQUE : Le proxy générique aiCalls (détections photos / inférences applicatives) ne doit jamais être converti en facteur par token LLM.",
    );
  }
}

/**
 * GARDE-FOU SCIENTIFIQUE 2 :
 * Résolution rigoureuse du facteur électrique régional.
 * Si l'infrastructure est inconnue, les coefficients américains NE SONT PAS appliqués automatiquement.
 */
export function resolveElectricityFactorForRegion(
  region: ScientificFactorRegion | string | null | undefined,
): ScientificFactorRecord | null {
  if (!region || region === "UNKNOWN") {
    // Infrastructure inconnue : aucun facteur imposé arbitrairement
    return null;
  }
  if (region === "US") {
    return getScientificFactor("electricity-us-egrid-2024");
  }
  if (region === "FR") {
    return getScientificFactor("electricity-fr-rte-2024");
  }
  return null;
}

/**
 * Évalue le diagnostic déterministe de qualité des données.
 * Conforme à la règle : Aucun score de confiance numérique arbitraire.
 */
export function evaluateDataQualityDiagnostic(params: {
  hasDirectMeasurement?: boolean;
  hasDocumentedModel?: boolean;
  isScenarioOrRegionalProxy?: boolean;
  isMissingOrUnmeasured?: boolean;
}): EnvironmentalDataQualityDiagnostic {
  if (params.isMissingOrUnmeasured) {
    return "NOT_CALCULABLE";
  }
  if (params.hasDirectMeasurement) {
    return "MEASURED";
  }
  if (params.hasDocumentedModel) {
    return "DOCUMENTED_MODEL";
  }
  if (params.isScenarioOrRegionalProxy) {
    return "PROXY_SCENARIO";
  }
  return "NOT_CALCULABLE";
}
