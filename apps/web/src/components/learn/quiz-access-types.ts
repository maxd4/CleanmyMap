import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import type { QuizReasoningType } from "@/components/learn/quiz-reasoning-types";
import type { QuizQuestionCategory } from "@/components/learn/quiz-review-targets";
import type { QuizUiCopyKey } from "@/lib/learning/quiz-i18n";

export type QuizAccessTypeId =
  | "mixte"
  | "ecole"
  | "terrain"
  | "donnees-scientifiques"
  | "sensibilisation"
  | "habitudes-de-vie"
  | "ordres-de-grandeur"
  | "tri-securite";

export type QuizAccessTypeDefinition = {
  id: QuizAccessTypeId;
  label: string;
  labelKey: QuizUiCopyKey;
  description: Record<SupportedLocale, string>;
  focus: Record<SupportedLocale, string[]>;
  learningLabel: Record<SupportedLocale, string>;
  categories: readonly QuizQuestionCategory[];
  reasoningTypes: readonly QuizReasoningType[];
};

export type QuizAccessQuestion = {
  category: QuizQuestionCategory;
  reasoningType: QuizReasoningType;
  skill?: QuizReasoningType;
};

export const QUIZ_ACCESS_TYPES: readonly QuizAccessTypeDefinition[] = [
  {
    id: "mixte",
    label: "Mixte",
    labelKey: "access.mixte.label",
    description: {
      fr: "Toutes les questions mélangées pour alterner les contextes, les mécanismes et les formats.",
      en: "All questions mixed together to alternate contexts, mechanisms and formats.",
    },
    focus: {
      fr: ["Mélange de toute la banque", "Aucun filtre de thème ni de contexte"],
      en: ["Full bank mixing", "No theme or context filter"],
    },
    learningLabel: {
      fr: "Parcours équilibré",
      en: "Balanced path",
    },
    categories: ["tri-recyclage", "action-terrain", "climat-biodiversite", "impact-methodologie"],
    reasoningTypes: ["idée reçue", "terrain", "estimation", "comparaison", "conséquences indirectes", "questions contre-intuitives", "cas-limites", "mini-enquetes"],
  },
  {
    id: "ecole",
    label: "École",
    labelKey: "access.ecole.label",
    description: {
      fr: "Atelier de classe pour 4e et 3e, pensé pour voter, discuter et révéler la réponse ensemble.",
      en: "Classroom workshop for middle school, designed to vote, discuss and reveal the answer together.",
    },
    focus: {
      fr: ["Atelier collectif sans compte", "Séances courtes de 15 questions"],
      en: ["Collective workshop without account", "Short 10 to 15 question sessions"],
    },
    learningLabel: {
      fr: "Atelier en classe",
      en: "Class workshop",
    },
    categories: ["tri-recyclage", "action-terrain", "climat-biodiversite", "impact-methodologie"],
    reasoningTypes: ["idée reçue", "terrain", "estimation", "comparaison", "conséquences indirectes", "questions contre-intuitives", "cas-limites", "mini-enquetes"],
  },
  {
    id: "terrain",
    label: "Terrain",
    labelKey: "access.terrain.label",
    description: {
      fr: "Décisions réelles pendant une cleanwalk, sécurité, gestes pratiques, cas limites et organisation.",
      en: "Real decisions during a cleanwalk, safety, practical gestures, edge cases and organization.",
    },
    focus: {
      fr: ["Sécurité, gestes pratiques et organisation", "Cas limites et arbitrages de terrain"],
      en: ["Safety, practical gestures and organization", "Edge cases and field trade-offs"],
    },
    learningLabel: {
      fr: "Décision de terrain",
      en: "Field decisions",
    },
    categories: ["tri-recyclage", "action-terrain"],
    reasoningTypes: ["terrain", "cas-limites", "mini-enquetes"],
  },
  {
    id: "donnees-scientifiques",
    label: "Données scientifiques",
    labelKey: "access.donnees-scientifiques.label",
    description: {
      fr: "Mécanismes environnementaux, pollution, recyclage, dégradation, biodiversité et impacts mesurables.",
      en: "Environmental mechanisms, pollution, recycling, degradation, biodiversity and measurable impacts.",
    },
    focus: {
      fr: ["Mécanismes et conséquences indirectes", "Ordres de grandeur et impacts mesurables"],
      en: ["Mechanisms and indirect consequences", "Orders of magnitude and measurable impacts"],
    },
    learningLabel: {
      fr: "Compréhension scientifique",
      en: "Scientific understanding",
    },
    categories: ["climat-biodiversite", "impact-methodologie"],
    reasoningTypes: ["estimation", "comparaison", "conséquences indirectes", "mini-enquetes"],
  },
  {
    id: "sensibilisation",
    label: "Sensibilisation",
    labelKey: "access.sensibilisation.label",
    description: {
      fr: "Idées reçues, mythes et questions contre-intuitives pour provoquer une prise de conscience rapide.",
      en: "Misconceptions, myths and counter-intuitive questions to create quick awareness.",
    },
    focus: {
      fr: ["Idées reçues et prise de conscience", "Questions qui bousculent l'intuition"],
      en: ["Misconceptions and awareness building", "Questions that challenge intuition"],
    },
    learningLabel: {
      fr: "Doute utile",
      en: "Productive doubt",
    },
    categories: ["tri-recyclage", "action-terrain", "climat-biodiversite", "impact-methodologie"],
    reasoningTypes: ["idée reçue", "questions contre-intuitives", "cas-limites", "mini-enquetes"],
  },
  {
    id: "habitudes-de-vie",
    label: "Habitudes de vie",
    labelKey: "access.habitudes-de-vie.label",
    description: {
      fr: "Gestes quotidiens, consommation et réduction des déchets avec lien entre impact individuel et collectif.",
      en: "Daily habits, consumption and waste reduction, linking individual and collective impact.",
    },
    focus: {
      fr: ["Gestes quotidiens et réduction des déchets", "Impact du comportement individuel sur le collectif"],
      en: ["Daily gestures and waste reduction", "How individual behavior scales to collective impact"],
    },
    learningLabel: {
      fr: "Habitudes et impact",
      en: "Habits and impact",
    },
    categories: ["tri-recyclage", "action-terrain", "climat-biodiversite", "impact-methodologie"],
    reasoningTypes: ["terrain", "comparaison", "estimation", "conséquences indirectes", "mini-enquetes"],
  },
  {
    id: "ordres-de-grandeur",
    label: "Ordres de grandeur",
    labelKey: "access.ordres-de-grandeur.label",
    description: {
      fr: "Estimations, durées, masses, volumes, proportions et comparaisons pour raisonner avec justesse.",
      en: "Estimates, durations, masses, volumes, proportions and comparisons to reason with scale.",
    },
    focus: {
      fr: ["Raisonner avec des échelles utiles", "Comparer sans tomber dans le chiffre brut"],
      en: ["Reason with useful scales", "Compare without relying on bare numbers"],
    },
    learningLabel: {
      fr: "Raisonnement par échelle",
      en: "Scaling up reasoning",
    },
    categories: ["tri-recyclage", "action-terrain", "climat-biodiversite", "impact-methodologie"],
    reasoningTypes: ["estimation", "comparaison", "conséquences indirectes", "mini-enquetes"],
  },
  {
    id: "tri-securite",
    label: "Tri & sécurité",
    labelKey: "access.tri-securite.label",
    description: {
      fr: "Filières de traitement, erreurs de tri et déchets dangereux pour éviter les mauvais gestes sur le terrain.",
      en: "Treatment streams, sorting mistakes and hazardous waste to avoid bad field practices.",
    },
    focus: {
      fr: ["Erreurs de tri et déchets dangereux", "Sécurité opérationnelle et gestes fiables"],
      en: ["Sorting mistakes and hazardous waste", "Operational safety and reliable gestures"],
    },
    learningLabel: {
      fr: "Tri fiable et sécurité",
      en: "Safe sorting",
    },
    categories: ["tri-recyclage", "action-terrain"],
    reasoningTypes: ["terrain", "cas-limites", "idée reçue", "mini-enquetes"],
  },
] as const;

const QUIZ_ACCESS_TYPE_BY_ID: Record<QuizAccessTypeId, QuizAccessTypeDefinition> = Object.fromEntries(
  QUIZ_ACCESS_TYPES.map((accessType) => [accessType.id, accessType]),
) as Record<QuizAccessTypeId, QuizAccessTypeDefinition>;

export function getQuizAccessType(accessTypeId: QuizAccessTypeId): QuizAccessTypeDefinition {
  return QUIZ_ACCESS_TYPE_BY_ID[accessTypeId];
}

export function listQuizAccessTypeIds(): QuizAccessTypeId[] {
  return QUIZ_ACCESS_TYPES.map((accessType) => accessType.id);
}

export function matchesQuizAccessType(
  accessTypeId: QuizAccessTypeId,
  question: QuizAccessQuestion,
): boolean {
  if (accessTypeId === "mixte") {
    return true;
  }

  const accessType = getQuizAccessType(accessTypeId);
  const questionSkill = question.skill ?? question.reasoningType;
  return (
    accessType.categories.includes(question.category) &&
    accessType.reasoningTypes.includes(questionSkill)
  );
}

export function getQuizAccessTypesForQuestion(question: QuizAccessQuestion): QuizAccessTypeId[] {
  return QUIZ_ACCESS_TYPES.filter((accessType) => matchesQuizAccessType(accessType.id, question)).map(
    (accessType) => accessType.id,
  );
}
