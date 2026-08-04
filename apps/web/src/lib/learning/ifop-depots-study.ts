import type { ContentValidationRecord } from "@/lib/content/content-validation";
import { claim, createPublishedLearningValidation } from "@/lib/learning/gestes-propres-validation";

export type IfopDepotsLocalizedText = {
  fr: string;
  en: string;
};

export type IfopDepotsMetric = {
  id: string;
  value: number;
  unit: "percent";
  label: IfopDepotsLocalizedText;
  context: IfopDepotsLocalizedText;
  interpretationLimit: IfopDepotsLocalizedText;
  sourcePage: number;
  claimType: "fact";
};

export type IfopDepotsStudy = {
  title: IfopDepotsLocalizedText;
  subtitle: IfopDepotsLocalizedText;
  organization: IfopDepotsLocalizedText;
  fieldworkPeriod: IfopDepotsLocalizedText;
  scope: IfopDepotsLocalizedText;
  methodology: IfopDepotsLocalizedText;
  pdfPath: string;
  pageCount: number;
  featuredMetricIds: string[];
  metrics: IfopDepotsMetric[];
  recommendations: IfopDepotsLocalizedText[];
  validation: ContentValidationRecord;
};

const SOURCE_PDF = "/learn/bonnes-pratiques/gestesprorpe-ifop-depots.pdf";

const metrics: IfopDepotsMetric[] = [
  {
    id: "authors-of-illegal-dumping",
    value: 25,
    unit: "percent",
    label: { fr: "Répondants identifiés comme auteurs de dépôts sauvages", en: "Respondents identified as illegal dumping authors" },
    context: { fr: "Ils déclarent au moins un mauvais geste pour se débarrasser d’un encombrant.", en: "They report at least one bad gesture when getting rid of bulky waste." },
    interpretationLimit: { fr: "Résultat déclaratif sur le périmètre de l’étude, pas un comptage des dépôts réels.", en: "Self-reported result for the study scope, not a count of actual dumps." },
    sourcePage: 4,
    claimType: "fact",
  },
  {
    id: "authors-expect-pickup",
    value: 46,
    unit: "percent",
    label: { fr: "Auteurs espérant que quelqu’un récupère le déchet", en: "Authors hoping someone will pick up the waste" },
    context: { fr: "Parmi les auteurs de dépôts sauvages, 46 % imaginent que le déchet intéressera quelqu’un et sera ramassé.", en: "Among illegal dumping authors, 46% imagine that someone will be interested and pick it up." },
    interpretationLimit: { fr: "La formulation décrit une justification déclarée, pas une intention vérifiée ni un résultat de collecte.", en: "The wording describes a declared justification, not a verified intent or collection result." },
    sourcePage: 4,
    claimType: "fact",
  },
  {
    id: "unknown-collection-options",
    value: 44,
    unit: "percent",
    label: { fr: "Répondants ne connaissant pas les options de collecte", en: "Respondents unaware of collection options" },
    context: { fr: "Ils déclarent ne pas connaître les options proposées par leur collectivité pour les encombrants.", en: "They report not knowing the options offered by their local authority for bulky waste." },
    interpretationLimit: { fr: "La connaissance déclarée peut différer de la connaissance effective des dispositifs locaux.", en: "Declared knowledge may differ from actual knowledge of local services." },
    sourcePage: 7,
    claimType: "fact",
  },
  {
    id: "know-environmental-risks",
    value: 92,
    unit: "percent",
    label: { fr: "Connaissent les risques pour l’environnement", en: "Know the environmental risks" },
    context: { fr: "La connaissance des risques environnementaux est élevée malgré la méconnaissance des filières.", en: "Awareness of environmental risks is high despite limited knowledge of collection channels." },
    interpretationLimit: { fr: "Connaître un risque ne prouve pas que le geste adapté sera réalisé.", en: "Knowing a risk does not prove that the appropriate action will be taken." },
    sourcePage: 7,
    claimType: "fact",
  },
  {
    id: "official-information-channels",
    value: 89,
    unit: "percent",
    label: { fr: "De ceux qui se renseignent privilégiant les canaux officiels", en: "Of those who seek information, choosing official channels" },
    context: { fr: "Les répondants qui cherchent une information privilégient le site ou l’appel de leur collectivité.", en: "Respondents who seek information favor their local authority’s website or phone line." },
    interpretationLimit: { fr: "Le pourcentage porte uniquement sur les personnes qui déclarent se renseigner.", en: "The percentage only covers people who say they seek information." },
    sourcePage: 7,
    claimType: "fact",
  },
  {
    id: "effective-solution-collection-help",
    value: 74,
    unit: "percent",
    label: { fr: "Jugerait efficace une mobilisation pour un ramassage", en: "Would consider a waste collection mobilization effective" },
    context: { fr: "La mobilisation pour un ramassage arrive en tête des solutions testées.", en: "A waste collection mobilization ranks first among the tested solutions." },
    interpretationLimit: { fr: "Il s’agit d’une efficacité perçue, pas d’une expérimentation évaluée.", en: "This is perceived effectiveness, not evaluated experimental impact." },
    sourcePage: 8,
    claimType: "fact",
  },
  {
    id: "effective-solution-awareness-session",
    value: 53,
    unit: "percent",
    label: { fr: "Jugerait efficace une séance de sensibilisation", en: "Would consider an awareness session effective" },
    context: { fr: "Une séance de sensibilisation fait partie des alternatives à l’amende jugées efficaces.", en: "An awareness session is among the alternatives to a fine considered effective." },
    interpretationLimit: { fr: "Une perception d’efficacité ne mesure pas un changement de comportement.", en: "Perceived effectiveness does not measure behavior change." },
    sourcePage: 8,
    claimType: "fact",
  },
  {
    id: "effective-solution-cleaning-team-help",
    value: 69,
    unit: "percent",
    label: { fr: "Jugerait efficace une aide aux équipes propreté", en: "Would consider helping cleaning teams effective" },
    context: { fr: "L’aide aux équipes propreté est également citée comme alternative jugée efficace.", en: "Helping cleaning teams is also cited as an effective alternative." },
    interpretationLimit: { fr: "Le résultat mesure une opinion sur une solution, pas sa performance réelle.", en: "The result measures an opinion about a solution, not its actual performance." },
    sourcePage: 8,
    claimType: "fact",
  },
];

const IFOP_DEPOTS_RECOMMENDATIONS: IfopDepotsLocalizedText[] = [
  {
    fr: "Contrer l’idée qu’un dépôt dans la rue constitue un don et rappeler les filières adaptées.",
    en: "Counter the idea that leaving an item in the street is a donation and point to suitable channels.",
  },
  {
    fr: "Faciliter l’accès aux informations officielles sur les conditions d’accès, les déchets acceptés et leur devenir.",
    en: "Make official information easier to access, including access rules, accepted waste and what happens next.",
  },
  {
    fr: "Montrer les impacts d’un déchet abandonné sur l’environnement, la collectivité et le voisinage.",
    en: "Show the impacts of abandoned waste on the environment, the local authority and neighbors.",
  },
];

const IFOP_DEPOTS_STUDY_RECOMMENDATION_CLAIMS = [
  claim("recommendation-myths", "recommendation", IFOP_DEPOTS_RECOMMENDATIONS[0], [10]),
  claim("recommendation-information", "recommendation", IFOP_DEPOTS_RECOMMENDATIONS[1], [10]),
  claim("recommendation-impacts", "recommendation", IFOP_DEPOTS_RECOMMENDATIONS[2], [10]),
];

export const IFOP_DEPOTS_STUDY: IfopDepotsStudy = {
  title: {
    fr: "La pratique du dépôt sauvage en milieu urbain et péri-urbain",
    en: "Illegal dumping in urban and peri-urban areas",
  },
  subtitle: {
    fr: "Étude IFOP × Gestes Propres",
    en: "IFOP × Gestes Propres study",
  },
  organization: { fr: "IFOP × Gestes Propres", en: "IFOP × Gestes Propres" },
  fieldworkPeriod: { fr: "Enquête menée en 2024", en: "Survey conducted in 2024" },
  scope: {
    fr: "Agglomérations de plus de 20 000 habitants, grand public, déchets encombrants.",
    en: "Agglomerations of more than 20,000 inhabitants, general public, bulky waste.",
  },
  methodology: {
    fr: "Volet quantitatif en ligne auprès de 2 003 personnes représentatives, complété par des entretiens qualitatifs de 2 h 30 avec 3 personnes dans quatre villes : Paris, Dijon, Bordeaux et Rouen.",
    en: "Online quantitative survey among 2,003 representative people, complemented by 2.5-hour qualitative interviews with 3 people in four cities: Paris, Dijon, Bordeaux and Rouen.",
  },
  pdfPath: SOURCE_PDF,
  pageCount: 11,
  featuredMetricIds: ["authors-of-illegal-dumping", "authors-expect-pickup", "unknown-collection-options", "know-environmental-risks"],
  metrics,
  recommendations: IFOP_DEPOTS_RECOMMENDATIONS,
  validation: createPublishedLearningValidation({
    id: "learn.gestes-propres.ifop-depots-2024",
    sourceName: "IFOP × Gestes Propres — La pratique du dépôt sauvage",
    sourceUrl: SOURCE_PDF,
    sourceDate: "2025-05",
    sourceDatePrecision: "month",
    sourceDateBasis: "document",
    evidenceLevel: "strong",
    facts: metrics.map((metric) =>
      claim(
        metric.id,
        "fact",
        metric.context,
        [metric.sourcePage],
        metric.interpretationLimit,
      ),
    ),
    recommendations: IFOP_DEPOTS_STUDY_RECOMMENDATION_CLAIMS,
  }),
};
