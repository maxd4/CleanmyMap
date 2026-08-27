import type { QuizQuestion } from "./quiz-question-contract.ts";
import type {
  ImpactReferenceMetadata,
  ImpactReferenceSource,
  ImpactReferenceValue,
} from "./impact-reference-types.ts";

const LAST_CHECKED_AT = "2026-07-05";

function buildSource(
  label: string,
  url: string,
  publicationYear: number,
  dataYear: number,
  note: string,
): ImpactReferenceSource {
  return { label, url, publicationYear, dataYear, note };
}

function buildValue(
  label: string,
  metric: string,
  value: number,
  unit: string,
  year: number,
  scope: ImpactReferenceValue["scope"],
  note?: string,
): ImpactReferenceValue {
  return { label, metric, value, unit, year, scope, note };
}

function buildReference(
  referenceId: string,
  title: string,
  yearLabel: string,
  scopeLabel: string,
  orderOfMagnitude: string,
  range: string,
  uncertainty: ImpactReferenceMetadata["uncertainty"],
  sources: ImpactReferenceSource[],
  values: ImpactReferenceValue[],
  note?: string,
): ImpactReferenceMetadata {
  return {
    referenceId,
    title,
    yearLabel,
    scopeLabel,
    orderOfMagnitude,
    range,
    uncertainty,
    sources,
    values,
    note,
  };
}

export const IMPACT_REFERENCE_CATALOG = {
  foodVsFlight: buildReference(
    "food-vs-flight",
    "Alimentation végétale vs aller-retour en avion",
    "2025 / 2022",
    "empreinte de consommation + usage-only",
    "quelques kg CO2e par jour contre des centaines à plus d'une tonne pour un long-courrier aller-retour",
    "2,6 kg CO2e / jour pour un régime vegan médian; 147,87 g CO2e / passager-km pour un long-courrier; un aller-retour typique dépasse souvent 0,5 t CO2e",
    "élevée",
    [
      buildSource(
        "Scientific Reports - Vegan and omnivore diets in relation to nutrient intake and greenhouse gas emissions in Iceland",
        "https://www.nature.com/articles/s41598-025-03193-3",
        2025,
        2025,
        "Médiane de 2,6 kg CO2e / jour pour les vegans et 5,3 kg CO2e / jour pour les omnivores.",
      ),
      buildSource(
        "Our World in Data - Carbon footprint of travel per kilometer travelled",
        "https://ourworldindata.org/grapher/carbon-footprint-travel-mode",
        2023,
        2022,
        "Le long-courrier est à 147,87 g CO2e par passager-kilomètre en 2022.",
      ),
    ],
    [
      buildValue(
        "Régime vegan médian",
        "empreinte alimentaire",
        2.6,
        "kg CO2e / jour",
        2025,
        "consumption",
        "Médiane observée dans l'étude islandaise.",
      ),
      buildValue(
        "Régime omnivore médian",
        "empreinte alimentaire",
        5.3,
        "kg CO2e / jour",
        2025,
        "consumption",
        "Médiane observée dans l'étude islandaise.",
      ),
      buildValue(
        "Long-courrier",
        "transport aérien",
        147.87,
        "g CO2e / passager-km",
        2022,
        "usage-only",
        "Facteur par passager-kilomètre; le total dépend de la distance aller-retour.",
      ),
    ],
    "Le total exact du vol dépend du trajet, du remplissage et du type de vol.",
  ),
  evLifecycle: buildReference(
    "ev-vs-thermal-lifecycle",
    "Voiture électrique vs thermique sur le cycle de vie",
    "2024",
    "cycle-of-life",
    "environ moitié des émissions d'une thermique",
    "de l'ordre de 19 % à 69 % de moins selon la région, le modèle et le mix électrique",
    "moyenne",
    [
      buildSource(
        "IEA - Global EV Outlook 2024, outlook for emissions reductions",
        "https://www.iea.org/reports/global-ev-outlook-2024/outlook-for-emissions-reductions",
        2024,
        2023,
        "Une batterie électrique vendue en 2023 émet environ moitié moins qu'une thermique équivalente sur sa durée de vie.",
      ),
      buildSource(
        "ICCT - A global comparison of the life-cycle greenhouse gas emissions of combustion engine and electric passenger cars",
        "https://theicct.org/publication/a-global-comparison-of-the-life-cycle-greenhouse-gas-emissions-of-combustion-engine-and-electric-passenger-cars/",
        2020,
        2020,
        "L'avantage varie selon les régions, avec une réduction plus forte là où l'électricité est moins carbonée.",
      ),
    ],
    [
      buildValue(
        "Voiture électrique",
        "cycle de vie",
        50,
        "% de moins qu'une thermique",
        2024,
        "cycle-of-life",
        "Ordre de grandeur de l'IEA.",
      ),
      buildValue(
        "Voiture thermique",
        "cycle de vie",
        100,
        "% de référence",
        2024,
        "cycle-of-life",
        "Référence relative pour la comparaison.",
      ),
    ],
    "La fabrication pèse souvent plus lourd au départ pour l'électrique, mais le cycle complet lui est généralement favorable.",
  ),
  territorialPerCapita: buildReference(
    "territorial-co2-per-capita",
    "Émissions territoriales annuelles par habitant",
    "2024",
    "territorial",
    "de 10^0 à 10^1 tonnes CO2e / habitant / an, avec un extrême autour de 40",
    "France 3,97; Chine 8,66; États-Unis 14,20; Qatar 41,27; Inde 2,20 tonnes CO2e / habitant / an",
    "faible",
    [
      buildSource(
        "Our World in Data - CO₂ emissions per capita",
        "https://ourworldindata.org/grapher/co-emissions-per-capita",
        2025,
        2024,
        "Cette série mesure les émissions territoriales, produites à l'intérieur des frontières nationales.",
      ),
    ],
    [
      buildValue("France", "émissions territoriales", 3.969368, "t CO2e / habitant / an", 2024, "territorial"),
      buildValue("Chine", "émissions territoriales", 8.65839, "t CO2e / habitant / an", 2024, "territorial"),
      buildValue("États-Unis", "émissions territoriales", 14.197287, "t CO2e / habitant / an", 2024, "territorial"),
      buildValue("Qatar", "émissions territoriales", 41.27118, "t CO2e / habitant / an", 2024, "territorial"),
      buildValue("Inde", "émissions territoriales", 2.2009783, "t CO2e / habitant / an", 2024, "territorial"),
    ],
    "Les émissions territoriales ne doivent pas être confondues avec une empreinte de consommation.",
  ),
  aiEquivalence: buildReference(
    "ai-equivalence",
    "Impact IA et équivalences variables",
    "2025",
    "usage-only",
    "de quelques dixièmes à quelques dizaines de Wh par requête, selon le modèle et le nombre de tokens",
    "0,43 Wh pour une requête courte sur GPT-4o; plus de 33 Wh pour un long prompt sur des modèles plus gourmands",
    "très élevée",
    [
      buildSource(
        "Jegham et al. - How Hungry is AI? Benchmarking Energy, Water, and Carbon Footprint of LLM Inference",
        "https://arxiv.org/html/2505.09598v2",
        2025,
        2025,
        "Les résultats varient fortement selon le modèle, la longueur du prompt et le volume d'usage.",
      ),
      buildSource(
        "IEA - Energy and AI, executive summary",
        "https://www.iea.org/reports/energy-and-ai/executive-summary",
        2025,
        2025,
        "Le mix électrique et la vitesse de déploiement des data centers déterminent l'empreinte finale.",
      ),
      buildSource(
        "Jin et al. - The Energy Cost of Reasoning",
        "https://arxiv.org/html/2505.14733v2",
        2025,
        2025,
        "Le papier détaille le rôle du prefill, du decode, des output tokens et du KV-cache.",
      ),
    ],
    [
      buildValue(
        "Requête courte GPT-4o",
        "inférence",
        0.43,
        "Wh / requête",
        2025,
        "usage-only",
        "Repère bas tiré du benchmark de 2025.",
      ),
      buildValue(
        "Long prompt sur un modèle gourmand",
        "inférence",
        33,
        "Wh / requête",
        2025,
        "usage-only",
        "Repère haut observé dans le benchmark de 2025.",
      ),
    ],
    "L'équivalence en voiture, avion ou alimentation dépend aussi du mix électrique, du cache et du nombre de tokens générés.",
  ),
  hdiVsEmissions: buildReference(
    "hdi-vs-emissions",
    "IDH et émissions par habitant",
    "2023 / 2024",
    "comparaison développement humain + territorial",
    "IDH proche de 0,7 à 0,94 alors que les émissions territoriales vont d'environ 2 à 41 t CO2e / habitant / an",
    "IDH 0,685 à 0,938; émissions 2,20 à 41,27 t CO2e / habitant / an",
    "faible",
    [
      buildSource(
        "Our World in Data - Human Development Index",
        "https://ourworldindata.org/grapher/human-development-index",
        2025,
        2023,
        "Source UNDP 2025 avec une série de données jusqu'en 2023.",
      ),
      buildSource(
        "Our World in Data - CO₂ emissions per capita",
        "https://ourworldindata.org/grapher/co-emissions-per-capita",
        2025,
        2024,
        "La série mesure les émissions territoriales produites dans les frontières nationales.",
      ),
    ],
    [
      buildValue("France", "IDH", 0.92, "indice", 2023, "human-development"),
      buildValue("Chine", "IDH", 0.797, "indice", 2023, "human-development"),
      buildValue("États-Unis", "IDH", 0.938, "indice", 2023, "human-development"),
      buildValue("Qatar", "IDH", 0.886, "indice", 2023, "human-development"),
      buildValue("Inde", "IDH", 0.685, "indice", 2023, "human-development"),
      buildValue("France", "émissions territoriales", 3.969368, "t CO2e / habitant / an", 2024, "territorial"),
      buildValue("Chine", "émissions territoriales", 8.65839, "t CO2e / habitant / an", 2024, "territorial"),
      buildValue("États-Unis", "émissions territoriales", 14.197287, "t CO2e / habitant / an", 2024, "territorial"),
      buildValue("Qatar", "émissions territoriales", 41.27118, "t CO2e / habitant / an", 2024, "territorial"),
      buildValue("Inde", "émissions territoriales", 2.2009783, "t CO2e / habitant / an", 2024, "territorial"),
    ],
    "Un IDH élevé n'entraîne pas mécaniquement des émissions élevées ou faibles.",
  ),
} as const;

function primarySource(reference: ImpactReferenceMetadata): ImpactReferenceSource {
  return reference.sources[0];
}

function baseQuizSource(reference: ImpactReferenceMetadata) {
  const source = primarySource(reference);

  return {
    sourceUrl: source.url,
    sourceLabel: source.label,
    sourceType: reference.referenceId === "ai-equivalence" || reference.referenceId === "food-vs-flight" ? "scientifique" : "institutionnelle",
    confidenceLevel: reference.uncertainty === "très élevée" || reference.uncertainty === "élevée" ? "élevé" : "moyen",
    isLocalRule: false,
    localScope: "national" as const,
    lastCheckedAt: LAST_CHECKED_AT,
    needsReview: false,
  } satisfies Pick<
    QuizQuestion,
    "sourceUrl" | "sourceLabel" | "sourceType" | "confidenceLevel" | "isLocalRule" | "localScope" | "lastCheckedAt" | "needsReview"
  >;
}

export const IMPACT_REFERENCE_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "im18",
    type: "multiple-choice",
    category: "impact-methodologie",
    question:
      "Dans un repère d'ordre de grandeur, quel poste domine généralement le plus : une journée d'alimentation végétale ou un aller-retour en avion long-courrier ?",
    answer: "L'aller-retour en avion long-courrier",
    options: [
      "L'aller-retour en avion long-courrier",
      "Une journée d'alimentation végétale",
      "Les deux sont du même ordre de grandeur",
      "Impossible à comparer même à grands traits",
    ],
    explanation:
      "Une journée d'alimentation végétale reste en général à quelques kg CO2e, alors qu'un vol long-courrier aller-retour se situe plutôt en centaines de kg, voire au-delà d'une tonne selon la distance et le taux de remplissage.",
    reasoningType: "estimation",
    format: "estimations",
    reference: IMPACT_REFERENCE_CATALOG.foodVsFlight,
    ...baseQuizSource(IMPACT_REFERENCE_CATALOG.foodVsFlight),
  },
  {
    id: "im19",
    type: "multiple-choice",
    category: "impact-methodologie",
    question: "Sur un cycle de vie complet, quelle formulation est la plus juste pour une voiture électrique face à une thermique ?",
    answer: "La voiture électrique a souvent plus d'impact à fabriquer, mais peut être meilleure sur le cycle complet.",
    options: [
      "La voiture électrique a souvent plus d'impact à fabriquer, mais peut être meilleure sur le cycle complet.",
      "La voiture thermique est toujours meilleure car sa fabrication est plus simple.",
      "La voiture électrique est toujours meilleure dès l'usine, quel que soit le contexte.",
      "Les deux ont exactement le même impact sur toute leur vie.",
    ],
    explanation:
      "La voiture électrique concentre davantage d'impact à la fabrication, surtout à cause de la batterie, mais elle compense souvent à l'usage si l'électricité est suffisamment décarbonée et si le kilométrage est adapté.",
    reasoningType: "comparaison",
    format: "comparaisons",
    reference: IMPACT_REFERENCE_CATALOG.evLifecycle,
    ...baseQuizSource(IMPACT_REFERENCE_CATALOG.evLifecycle),
  },
  {
    id: "im20",
    type: "multiple-choice",
    category: "impact-methodologie",
    question:
      "Dans un classement simple des émissions de CO2 par habitant, quel ordre est le plus cohérent parmi le Qatar, les États-Unis, la Chine, la France et l'Inde ?",
    answer: "Qatar > États-Unis > Chine > France > Inde",
    options: [
      "Qatar > États-Unis > Chine > France > Inde",
      "États-Unis > Qatar > Chine > France > Inde",
      "Qatar > Chine > États-Unis > France > Inde",
      "Chine > États-Unis > Qatar > France > Inde",
    ],
    explanation:
      "Le Qatar et les États-Unis se situent très au-dessus, la Chine vient ensuite, puis la France, et l'Inde reste plus bas. Ici, on compare des émissions territoriales par habitant, pas un bilan de consommation complet.",
    reasoningType: "estimation",
    format: "estimations",
    reference: IMPACT_REFERENCE_CATALOG.territorialPerCapita,
    ...baseQuizSource(IMPACT_REFERENCE_CATALOG.territorialPerCapita),
  },
  {
    id: "im21",
    type: "multiple-choice",
    category: "impact-methodologie",
    question: "Quand CleanMyMap compare l'impact d'une requête IA à une voiture, un avion ou un repas, quelle lecture est la plus juste ?",
    answer: "Un repère d'ordre de grandeur, utile seulement si le périmètre est précisé",
    options: [
      "Un repère d'ordre de grandeur, utile seulement si le périmètre est précisé",
      "Une conversion exacte valable pour tous les modèles",
      "Une preuve que l'IA est toujours plus lourde qu'un vol",
      "Un chiffre décoratif sans intérêt pédagogique",
    ],
    explanation:
      "Les équivalences IA servent à situer un usage rapidement. Sans préciser le modèle, la taille de la requête, le volume d'usage et le mix électrique, la comparaison peut faire croire à une conversion fixe alors qu'il s'agit d'un repère pédagogique.",
    reasoningType: "comparaison",
    format: "comparaisons",
    reference: IMPACT_REFERENCE_CATALOG.aiEquivalence,
    ...baseQuizSource(IMPACT_REFERENCE_CATALOG.aiEquivalence),
  },
  {
    id: "im22",
    type: "multiple-choice",
    category: "impact-methodologie",
    question:
      "Quand on compare l'IDH et les émissions de CO2 par habitant chez la France, la Chine, les États-Unis, le Qatar et l'Inde, quelle lecture est la plus juste ?",
    answer: "Un IDH élevé ne suffit pas à prédire des émissions par habitant élevées ou faibles",
    options: [
      "Un IDH élevé ne suffit pas à prédire des émissions par habitant élevées ou faibles",
      "Plus l'IDH monte, plus les émissions par habitant montent automatiquement",
      "Les émissions par habitant ne disent rien sur le niveau de développement",
      "Le Qatar a un faible IDH mais seulement des émissions modestes",
    ],
    explanation:
      "Le développement humain, le mix énergétique, l'urbanisation et les modes de vie ne bougent pas toujours au même rythme. Deux pays à IDH proche peuvent donc avoir des émissions par habitant très différentes.",
    reasoningType: "comparaison",
    format: "comparaisons",
    reference: IMPACT_REFERENCE_CATALOG.hdiVsEmissions,
    ...baseQuizSource(IMPACT_REFERENCE_CATALOG.hdiVsEmissions),
  },
];

export function getImpactReferenceCatalog() {
  return IMPACT_REFERENCE_CATALOG;
}

export function getImpactReferenceQuestionSet() {
  return IMPACT_REFERENCE_QUIZ_QUESTIONS;
}
