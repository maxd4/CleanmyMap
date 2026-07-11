export type GestesPropresBarometerLocalizedText = {
  fr: string;
  en: string;
};

export type GestesPropresBarometerCategory =
  | "perception"
  | "declared_practices"
  | "false_beliefs"
  | "social_influence"
  | "positive_engagement";

export type GestesPropresBarometerMetric = {
  id: string;
  category: GestesPropresBarometerCategory;
  value: number;
  label: GestesPropresBarometerLocalizedText;
  context: GestesPropresBarometerLocalizedText;
  interpretationLimit: GestesPropresBarometerLocalizedText;
  sourcePage: number;
};

export type GestesPropresBarometerMyth = {
  id: string;
  metricId: string;
  question: GestesPropresBarometerLocalizedText;
  answer: GestesPropresBarometerLocalizedText;
  goodGesture: GestesPropresBarometerLocalizedText;
  ctaLabel: GestesPropresBarometerLocalizedText;
  ctaHref: string;
  sourcePage: number;
};

export type GestesPropresBarometerStudy = {
  title: GestesPropresBarometerLocalizedText;
  subtitle: GestesPropresBarometerLocalizedText;
  organization: GestesPropresBarometerLocalizedText;
  fieldworkPeriod: GestesPropresBarometerLocalizedText;
  pdfPath: string;
  pageCount: number;
  sampleSize: number;
  methodology: GestesPropresBarometerLocalizedText;
  interpretationNote: GestesPropresBarometerLocalizedText;
  featuredKpiIds: string[];
  categories: Record<GestesPropresBarometerCategory, GestesPropresBarometerMetric[]>;
};

const GESTES_PROPRES_BAROMETER_SOURCE = "documentation/pages_site/routes/05-apprendre/learn-bonnes-pratiques/gestespropres-Barometre_2025.pdf";

function createMetric(metric: GestesPropresBarometerMetric): GestesPropresBarometerMetric {
  return metric;
}

const perception = [
  createMetric({
    id: "perception-environnement-cadre-vie",
    category: "perception",
    value: 93,
    label: {
      fr: "Impact sur l’environnement et le cadre de vie",
      en: "Impact on the environment and everyday surroundings",
    },
    context: {
      fr: "Une très grande majorité des Français jugent important l’impact des déchets abandonnés sur l’environnement et le cadre de vie.",
      en: "A very large majority of French respondents consider the impact of litter on the environment and everyday surroundings important.",
    },
    interpretationLimit: {
      fr: "Mesure une perception d’impact, pas un effet causal direct.",
      en: "This measures perceived impact, not a direct causal effect.",
    },
    sourcePage: 3,
  }),
];

const declaredPractices = [
  createMetric({
    id: "declared-practices-jeter-correctement",
    category: "declared_practices",
    value: 98,
    label: {
      fr: "Déclarent jeter correctement leurs déchets",
      en: "Declare that they dispose of their waste correctly",
    },
    context: {
      fr: "98 % déclarent jeter correctement leurs déchets.",
      en: "98% say they dispose of their waste correctly.",
    },
    interpretationLimit: {
      fr: "Résultat déclaratif, sans observation terrain.",
      en: "Declared result, without direct field observation.",
    },
    sourcePage: 5,
  }),
  createMetric({
    id: "declared-practices-megots-vertueux",
    category: "declared_practices",
    value: 94,
    label: {
      fr: "Des pratiques vertueuses pour gérer leurs mégots",
      en: "Declare virtuous habits for handling cigarette butts",
    },
    context: {
      fr: "94 % des fumeurs déclarent des pratiques vertueuses pour gérer leurs mégots.",
      en: "94% of smokers declare virtuous habits for handling cigarette butts.",
    },
    interpretationLimit: {
      fr: "La donnée décrit une déclaration, pas un contrôle du geste réel.",
      en: "The figure describes a declaration, not a check of the real gesture.",
    },
    sourcePage: 5,
  }),
  createMetric({
    id: "declared-practices-abandon-12-mois",
    category: "declared_practices",
    value: 35,
    label: {
      fr: "Reconnaissent au moins un abandon",
      en: "Acknowledge at least one littering act",
    },
    context: {
      fr: "Lorsqu’on leur présente une liste de déchets, 35 % avouent avoir abandonné un déchet dans les 12 derniers mois.",
      en: "When shown a list of waste items, 35% admit having littered at least once in the last 12 months.",
    },
    interpretationLimit: {
      fr: "Déclaratif: l’aveu dépend de la liste proposée.",
      en: "Declared data: the admission depends on the list shown.",
    },
    sourcePage: 5,
  }),
  createMetric({
    id: "declared-practices-megot-annee",
    category: "declared_practices",
    value: 30,
    label: {
      fr: "Reconnaissent avoir abandonné un mégot",
      en: "Acknowledge having littered a cigarette butt",
    },
    context: {
      fr: "30 % des fumeurs avouent avoir abandonné un mégot au cours de l’année écoulée.",
      en: "30% of smokers admit having littered a cigarette butt in the past year.",
    },
    interpretationLimit: {
      fr: "Le résultat repose sur le déclaratif et ne mesure pas tous les dépôts réels.",
      en: "The result is based on declarations and does not measure every real littering act.",
    },
    sourcePage: 5,
  }),
];

const falseBeliefs = [
  createMetric({
    id: "false-belief-biodegradable-nature",
    category: "false_beliefs",
    value: 54,
    label: {
      fr: "Pensent qu’un déchet alimentaire biodégradable peut être jeté dans la nature",
      en: "Think a biodegradable food waste item can be thrown into nature",
    },
    context: {
      fr: "54 % pensent, à tort, que les déchets alimentaires peuvent être jetés dans la nature car ils sont biodégradables.",
      en: "54% wrongly think food waste can be thrown into nature because it is biodegradable.",
    },
    interpretationLimit: {
      fr: "Mesure une croyance, pas une pratique observée.",
      en: "This measures a belief, not an observed practice.",
    },
    sourcePage: 7,
  }),
  createMetric({
    id: "false-belief-plage-ramasse",
    category: "false_beliefs",
    value: 47,
    label: {
      fr: "Pensent qu’un déchet abandonné sur une plage a des chances d’être ramassé",
      en: "Think litter left on a beach has a chance of being picked up",
    },
    context: {
      fr: "Sur la plage, 47 % des Français pensent que les déchets abandonnés ont des chances d’être ramassés.",
      en: "On the beach, 47% of French respondents think abandoned waste has a chance of being picked up.",
    },
    interpretationLimit: {
      fr: "Le résultat décrit une perception du ramassage, pas le ramassage réel.",
      en: "The result describes a perception of pickup, not actual pickup.",
    },
    sourcePage: 7,
  }),
  createMetric({
    id: "false-belief-megots-ramasses",
    category: "false_beliefs",
    value: 30,
    label: {
      fr: "Pensent que les mégots ont des chances d’être ramassés",
      en: "Think cigarette butts have a chance of being picked up",
    },
    context: {
      fr: "30 % des Français pensent que les mégots ont des chances d’être ramassés.",
      en: "30% of French respondents think cigarette butts have a chance of being picked up.",
    },
    interpretationLimit: {
      fr: "C’est une croyance déclarée, pas une probabilité mesurée.",
      en: "This is a declared belief, not a measured probability.",
    },
    sourcePage: 7,
  }),
  createMetric({
    id: "false-belief-chewing-gum-plastique",
    category: "false_beliefs",
    value: 31,
    label: {
      fr: "Savent qu’un chewing-gum est principalement composé de plastique",
      en: "Know that chewing gum is mainly made of plastic",
    },
    context: {
      fr: "Seulement 31 % ont conscience qu’un chewing-gum est composé principalement de plastique.",
      en: "Only 31% know that chewing gum is mainly made of plastic.",
    },
    interpretationLimit: {
      fr: "Ce résultat mesure une connaissance déclarée, pas un niveau de compréhension complet.",
      en: "This measures declared knowledge, not complete understanding.",
    },
    sourcePage: 7,
  }),
];

const socialInfluence = [
  createMetric({
    id: "social-influence-observe",
    category: "social_influence",
    value: 61,
    label: {
      fr: "Renonceraient s’ils se savaient observés",
      en: "Would refrain if they knew they were being watched",
    },
    context: {
      fr: "61 % déclarent renoncer à abandonner un déchet lorsqu’ils se savent observés.",
      en: "61% say they would refrain from littering when they know they are being watched.",
    },
    interpretationLimit: {
      fr: "Réponse déclarative à un scénario social, pas preuve d’un changement durable.",
      en: "Declared response to a social scenario, not proof of a lasting change.",
    },
    sourcePage: 8,
  }),
  createMetric({
    id: "social-influence-proche",
    category: "social_influence",
    value: 68,
    label: {
      fr: "Renonceraient en présence d’un proche",
      en: "Would refrain in the presence of a loved one",
    },
    context: {
      fr: "68 % renonceraient en présence d’un membre de leur entourage.",
      en: "68% would refrain in the presence of a person close to them.",
    },
    interpretationLimit: {
      fr: "Le levier décrit une intention, pas une observation en situation réelle.",
      en: "The lever describes an intention, not a real-life observation.",
    },
    sourcePage: 8,
  }),
  createMetric({
    id: "social-influence-enfant",
    category: "social_influence",
    value: 76,
    label: {
      fr: "Renonceraient face à un enfant",
      en: "Would refrain in front of a child",
    },
    context: {
      fr: "76 % renonceraient face à un enfant.",
      en: "76% would refrain in front of a child.",
    },
    interpretationLimit: {
      fr: "L’effet relève d’une intention déclarée, pas d’une mesure comportementale suivie.",
      en: "The effect comes from a declared intention, not a tracked behavioral measure.",
    },
    sourcePage: 8,
  }),
];

const positiveEngagement = [
  createMetric({
    id: "positive-engagement-ramassage-autrui",
    category: "positive_engagement",
    value: 58,
    label: {
      fr: "Ramassent des déchets abandonnés par d’autres",
      en: "Pick up litter abandoned by others",
    },
    context: {
      fr: "58 % ramassent des déchets abandonnés par d’autres.",
      en: "58% pick up litter abandoned by others.",
    },
    interpretationLimit: {
      fr: "Le résultat ne dit rien du volume ramassé ni de la régularité exacte.",
      en: "The result says nothing about the amount picked up or the exact frequency.",
    },
    sourcePage: 9,
  }),
];

export const GESTES_PROPRES_BAROMETER_2025: GestesPropresBarometerStudy = {
  title: {
    fr: "Baromètre 1ère édition IFOP pour Gestes Propres 2025",
    en: "First edition IFOP for Gestes Propres 2025 barometer",
  },
  subtitle: {
    fr: "Les Français et les déchets abandonnés",
    en: "French people and litter",
  },
  organization: {
    fr: "IFOP × Gestes Propres",
    en: "IFOP × Gestes Propres",
  },
  fieldworkPeriod: {
    fr: "Septembre 2025",
    en: "September 2025",
  },
  pdfPath: GESTES_PROPRES_BAROMETER_SOURCE,
  pageCount: 10,
  sampleSize: 2001,
  methodology: {
    fr: "Enquête déclarative menée en septembre 2025 auprès de 2 001 personnes représentatives de la population française. Les résultats décrivent des perceptions, des croyances et des pratiques déclarées, pas des comportements observés.",
    en: "Declared survey conducted in September 2025 among 2,001 people representative of the French population. The results describe perceptions, beliefs and declared practices, not observed behaviors.",
  },
  interpretationNote: {
    fr: "Le baromètre reste déclaratif: il ne doit pas être lu comme une mesure directe des gestes réels.",
    en: "The barometer remains declarative: it should not be read as a direct measure of real-world gestures.",
  },
  featuredKpiIds: [
    "declared-practices-abandon-12-mois",
    "false-belief-biodegradable-nature",
    "social-influence-observe",
    "positive-engagement-ramassage-autrui",
  ],
  categories: {
    perception,
    declared_practices: declaredPractices,
    false_beliefs: falseBeliefs,
    social_influence: socialInfluence,
    positive_engagement: positiveEngagement,
  },
};

export const GESTES_PROPRES_BAROMETER_MYTHS: GestesPropresBarometerMyth[] = [
  {
    id: "bio-degradables-nature",
    metricId: "false-belief-biodegradable-nature",
    question: {
      fr: "Les déchets alimentaires biodégradables vont-ils dans la nature ?",
      en: "Do biodegradable food wastes belong in nature?",
    },
    answer: {
      fr: "Non. Biodégradable ne veut pas dire abandonnable.",
      en: "No. Biodegradable does not mean litterable.",
    },
    goodGesture: {
      fr: "Vérifier la filière locale de compost ou de collecte.",
      en: "Check the local compost or collection stream.",
    },
    ctaLabel: {
      fr: "Voir le compost",
      en: "Open compost",
    },
    ctaHref: "/sections/compost",
    sourcePage: 7,
  },
  {
    id: "plage-ramassee",
    metricId: "false-belief-plage-ramasse",
    question: {
      fr: "Un déchet abandonné sur une plage a-t-il des chances d’être ramassé ?",
      en: "Does litter left on a beach have a chance of being picked up?",
    },
    answer: {
      fr: "Non. Il vaut mieux éviter l’abandon et signaler le point si besoin.",
      en: "No. It is better to avoid leaving it behind and report the spot if needed.",
    },
    goodGesture: {
      fr: "Garder le déchet sur soi ou le signaler si une collecte existe.",
      en: "Keep the waste with you or report it if a collection exists.",
    },
    ctaLabel: {
      fr: "Voir le signalement",
      en: "Open reporting",
    },
    ctaHref: "/sections/trash-spotter",
    sourcePage: 7,
  },
  {
    id: "megots-ramasses",
    metricId: "false-belief-megots-ramasses",
    question: {
      fr: "Les mégots ont-ils des chances d’être ramassés ?",
      en: "Do cigarette butts have a chance of being picked up?",
    },
    answer: {
      fr: "Non. Un mégot se garde jusqu’au cendrier ou à la poubelle.",
      en: "No. A cigarette butt stays with you until an ashtray or bin.",
    },
    goodGesture: {
      fr: "Utiliser un cendrier de poche ou une poubelle adaptée.",
      en: "Use a pocket ashtray or a suitable bin.",
    },
    ctaLabel: {
      fr: "Voir le signalement",
      en: "Open reporting",
    },
    ctaHref: "/sections/trash-spotter",
    sourcePage: 7,
  },
  {
    id: "chewing-gum-plastique",
    metricId: "false-belief-chewing-gum-plastique",
    question: {
      fr: "Le chewing-gum est-il principalement composé de plastique ?",
      en: "Is chewing gum mainly made of plastic?",
    },
    answer: {
      fr: "Oui. Il contient surtout des polymères et ne disparaît pas vite.",
      en: "Yes. It contains mostly polymers and does not disappear quickly.",
    },
    goodGesture: {
      fr: "Le jeter dans la bonne filière résiduelle, jamais au sol.",
      en: "Dispose of it in the right residual stream, never on the ground.",
    },
    ctaLabel: {
      fr: "Voir le tri",
      en: "Open sorting",
    },
    ctaHref: "/sections/recycling",
    sourcePage: 7,
  },
];
