import type { QuizDifficultyId, QuizSkillId } from "../quiz-taxonomy";
import {
  QUIZ_SCHOOL_TRACK_ORDER,
  type QuizSchoolLevel,
  type QuizSchoolTrackId,
} from "./quiz-school-types";

export type QuizSchoolLocalizedText = {
  fr: string;
  en: string;
};

export type QuizSchoolActivityType =
  | "qcm-raisonne"
  | "estimation"
  | "calcul"
  | "lecture-graphique"
  | "comparaison"
  | "critique-de-source"
  | "situation-probleme";

export type QuizSchoolActivityTheme =
  | "ecocitoyennete"
  | "habitudes-utiles"
  | "science-et-calcul"
  | "echelles-collectives";

export type QuizSchoolActivityValidationStatus = "validated" | "needsReview";

export type QuizSchoolActivitySource = {
  label: QuizSchoolLocalizedText;
  href: string;
  kind: "interne" | "institutionnelle" | "scientifique" | "donnees-exemple";
};

export type QuizSchoolActivityDataPoint = {
  label: QuizSchoolLocalizedText;
  value: number;
};

export type QuizSchoolActivityLevelProfile = {
  difficulty: QuizDifficultyId;
  skills: readonly QuizSkillId[];
  adaptation: QuizSchoolLocalizedText;
  instruction?: QuizSchoolLocalizedText;
  responseExplanation?: QuizSchoolLocalizedText;
};

export type QuizSchoolActivity = {
  id: string;
  title: QuizSchoolLocalizedText;
  theme: QuizSchoolActivityTheme;
  durationMinutes: number;
  type: QuizSchoolActivityType;
  trackId: QuizSchoolTrackId;
  instruction: QuizSchoolLocalizedText;
  responseExplanation: QuizSchoolLocalizedText;
  competencies: readonly QuizSkillId[];
  allowedLevels: readonly QuizSchoolLevel[];
  levelProfiles: Readonly<Record<QuizSchoolLevel, QuizSchoolActivityLevelProfile>>;
  source: QuizSchoolActivitySource;
  validationStatus: QuizSchoolActivityValidationStatus;
  needsReview?: boolean;
  dataPoints?: readonly QuizSchoolActivityDataPoint[];
};

export type ResolvedQuizSchoolActivity = Omit<QuizSchoolActivity, "instruction" | "responseExplanation" | "competencies"> & {
  instruction: QuizSchoolLocalizedText;
  responseExplanation: QuizSchoolLocalizedText;
  competencies: readonly QuizSkillId[];
  difficulty: QuizDifficultyId;
  adaptation: QuizSchoolLocalizedText;
};

export const QUIZ_SCHOOL_WORKSHOP_ACTIVITY_TARGET_MINUTES = 30;

export const QUIZ_SCHOOL_ACTIVITY_THEME_LABELS: Readonly<Record<QuizSchoolActivityTheme, QuizSchoolLocalizedText>> = {
  ecocitoyennete: { fr: "Éco-citoyenneté", en: "Eco-citizenship" },
  "habitudes-utiles": { fr: "Habitudes utiles", en: "Useful habits" },
  "science-et-calcul": { fr: "Science et calcul", en: "Science and calculation" },
  "echelles-collectives": { fr: "De l’individu au territoire", en: "From individual to territory" },
};

export const QUIZ_SCHOOL_ACTIVITY_TYPE_LABELS: Readonly<Record<QuizSchoolActivityType, QuizSchoolLocalizedText>> = {
  "qcm-raisonne": { fr: "QCM raisonné", en: "Reasoned multiple choice" },
  estimation: { fr: "Estimation", en: "Estimation" },
  calcul: { fr: "Calcul", en: "Calculation" },
  "lecture-graphique": { fr: "Lecture de graphique", en: "Reading a chart" },
  comparaison: { fr: "Comparaison", en: "Comparison" },
  "critique-de-source": { fr: "Critique de source", en: "Source critique" },
  "situation-probleme": { fr: "Situation-problème", en: "Problem situation" },
};

const ALL_LEVELS: readonly QuizSchoolLevel[] = ["6e", "5e", "4e", "3e"];
const INTERNAL_PEDAGOGY_SOURCE: QuizSchoolActivitySource = {
  label: { fr: "CleanMyMap — guide d’écriture pédagogique du Quiz", en: "CleanMyMap — Quiz authoring guide" },
  href: "/documentation/features/quiz-authoring-guide.md",
  kind: "interne",
};
const EXAMPLE_DATA_SOURCE: QuizSchoolActivitySource = {
  label: { fr: "CleanMyMap — données d’exemple pour l’activité", en: "CleanMyMap — example data for the activity" },
  href: "/documentation/features/quiz-authoring-guide.md",
  kind: "donnees-exemple",
};

function profile(
  difficulty: QuizDifficultyId,
  adaptation: QuizSchoolLocalizedText,
  skills: readonly QuizSkillId[],
): QuizSchoolActivityLevelProfile {
  return { difficulty, adaptation, skills };
}

const DEFINITION_PROFILES: Readonly<Record<QuizSchoolLevel, QuizSchoolActivityLevelProfile>> = {
  "6e": profile("low", { fr: "Observer des gestes simples et choisir ce qui aide le bien commun.", en: "Observe simple actions and choose what helps the common good." }, ["idée reçue"]),
  "5e": profile("low", { fr: "Relier un geste à une première conséquence pour les autres.", en: "Connect an action to a first consequence for others." }, ["idée reçue", "conséquences indirectes"]),
  "4e": profile("medium", { fr: "Justifier le choix en distinguant action utile et solution miracle.", en: "Justify the choice by distinguishing a useful action from a miracle solution." }, ["idée reçue", "conséquences indirectes"]),
  "3e": profile("medium", { fr: "Nuancer une affirmation et expliquer les limites d’un geste isolé.", en: "Qualify a claim and explain the limits of an isolated action." }, ["idée reçue", "conséquences indirectes"]),
};

const HABIT_PROFILES: Readonly<Record<QuizSchoolLevel, QuizSchoolActivityLevelProfile>> = {
  "6e": profile("low", { fr: "Classer deux habitudes selon ce qui évite d’abord le gaspillage.", en: "Sort two habits by which one first avoids waste." }, ["comparaison"]),
  "5e": profile("medium", { fr: "Comparer les causes et conséquences de deux habitudes quotidiennes.", en: "Compare the causes and consequences of two daily habits." }, ["comparaison", "conséquences indirectes"]),
  "4e": profile("medium", { fr: "Comparer un bénéfice, un coût et une contrainte avant de choisir.", en: "Compare a benefit, a cost and a constraint before choosing." }, ["comparaison", "conséquences indirectes"]),
  "3e": profile("high", { fr: "Comparer les effets directs et indirects sans conclure avec un seul indicateur.", en: "Compare direct and indirect effects without concluding from one indicator alone." }, ["comparaison", "conséquences indirectes"]),
};

const ESTIMATION_PROFILES: Readonly<Record<QuizSchoolLevel, QuizSchoolActivityLevelProfile>> = {
  "6e": profile("low", { fr: "Donner un ordre de grandeur et expliquer comment on l’a trouvé.", en: "Give an order of magnitude and explain how you found it." }, ["estimation"]),
  "5e": profile("medium", { fr: "Comparer une estimation à une valeur de référence simple.", en: "Compare an estimate with a simple reference value." }, ["estimation", "comparaison"]),
  "4e": profile("medium", { fr: "Encadrer l’estimation et repérer ce qui fait varier le résultat.", en: "Bound the estimate and identify what changes the result." }, ["estimation", "comparaison"]),
  "3e": profile("high", { fr: "Discuter les hypothèses et les limites d’une équivalence chiffrée.", en: "Discuss the assumptions and limits of a numerical equivalence." }, ["estimation", "cas-limites"]),
};

const CALCULATION_PROFILES: Readonly<Record<QuizSchoolLevel, QuizSchoolActivityLevelProfile>> = {
  "6e": profile("low", { fr: "Effectuer une multiplication ou une addition en gardant les unités.", en: "Perform a multiplication or addition while keeping the units." }, ["estimation"]),
  "5e": profile("medium", { fr: "Décrire la relation entre le nombre de jours et le résultat.", en: "Describe the relationship between the number of days and the result." }, ["estimation", "conséquences indirectes"]),
  "4e": profile("medium", { fr: "Vérifier le calcul, changer une hypothèse et comparer les résultats.", en: "Check the calculation, change one assumption and compare results." }, ["estimation", "comparaison"]),
  "3e": profile("high", { fr: "Discuter ce que le calcul mesure et ce qu’il ne mesure pas.", en: "Discuss what the calculation measures and what it does not." }, ["estimation", "cas-limites"]),
};

const GRAPH_PROFILES: Readonly<Record<QuizSchoolLevel, QuizSchoolActivityLevelProfile>> = {
  "6e": profile("low", { fr: "Repérer la valeur la plus haute et la plus basse.", en: "Identify the highest and lowest value." }, ["comparaison"]),
  "5e": profile("medium", { fr: "Décrire une évolution et comparer deux écarts.", en: "Describe a trend and compare two differences." }, ["comparaison"]),
  "4e": profile("medium", { fr: "Lire une variation en pourcentage simple et formuler une limite.", en: "Read a simple percentage change and state a limitation." }, ["comparaison", "estimation"]),
  "3e": profile("high", { fr: "Distinguer tendance, corrélation apparente et conclusion justifiée.", en: "Distinguish a trend, apparent correlation and justified conclusion." }, ["comparaison", "cas-limites"]),
};

const SOURCE_PROFILES: Readonly<Record<QuizSchoolLevel, QuizSchoolActivityLevelProfile>> = {
  "6e": profile("low", { fr: "Chercher qui parle, ce qui est affirmé et ce qui est proposé.", en: "Identify who speaks, what is claimed and what is proposed." }, ["idée reçue"]),
  "5e": profile("medium", { fr: "Comparer l’affirmation avec l’exemple et demander une preuve.", en: "Compare the claim with the example and ask for evidence." }, ["comparaison", "idée reçue"]),
  "4e": profile("medium", { fr: "Repérer une généralisation et demander une donnée vérifiable.", en: "Spot a generalization and ask for verifiable data." }, ["cas-limites", "comparaison"]),
  "3e": profile("high", { fr: "Examiner la source, l’indicateur choisi et ce que l’affirmation laisse de côté.", en: "Examine the source, the chosen indicator and what the claim leaves out." }, ["cas-limites", "comparaison"]),
};

const SCALE_PROFILES: Readonly<Record<QuizSchoolLevel, QuizSchoolActivityLevelProfile>> = {
  "6e": profile("low", { fr: "Proposer une action que l’on peut faire puis organiser à plusieurs.", en: "Suggest an action that can be done and organized together." }, ["conséquences indirectes"]),
  "5e": profile("medium", { fr: "Relier l’action à une cause, une conséquence et un acteur du collège.", en: "Connect the action to a cause, a consequence and a school actor." }, ["conséquences indirectes", "terrain"]),
  "4e": profile("medium", { fr: "Arbitrer entre efficacité, faisabilité et répartition des rôles.", en: "Balance effectiveness, feasibility and role sharing." }, ["conséquences indirectes", "comparaison"]),
  "3e": profile("high", { fr: "Analyser les leviers à chaque échelle et les limites de l’action individuelle.", en: "Analyze levers at each scale and the limits of individual action." }, ["conséquences indirectes", "cas-limites"]),
};

export const QUIZ_SCHOOL_WORKSHOP_ACTIVITIES: readonly QuizSchoolActivity[] = [
  {
    id: "atelier-ecocitoyen-definition",
    title: { fr: "Reconnaître un éco-citoyen", en: "Recognize an eco-citizen" },
    theme: "ecocitoyennete",
    durationMinutes: 4,
    type: "qcm-raisonne",
    trackId: "debat-classe",
    instruction: { fr: "Parmi plusieurs comportements, choisissez celui qui cherche à réduire un impact tout en tenant compte des autres et du contexte.", en: "Among several behaviors, choose the one that seeks to reduce an impact while considering others and the context." },
    responseExplanation: { fr: "Être éco-citoyen, ce n’est pas être parfait : c’est comprendre les effets de ses choix, agir à son échelle et participer aux décisions collectives.", en: "Being an eco-citizen does not mean being perfect: it means understanding the effects of choices, acting at one's scale and taking part in collective decisions." },
    competencies: ["idée reçue", "conséquences indirectes"],
    allowedLevels: ALL_LEVELS,
    levelProfiles: DEFINITION_PROFILES,
    source: INTERNAL_PEDAGOGY_SOURCE,
    validationStatus: "validated",
  },
  {
    id: "atelier-habitudes-comparaison",
    title: { fr: "Comparer des habitudes utiles", en: "Compare useful habits" },
    theme: "habitudes-utiles",
    durationMinutes: 4,
    type: "comparaison",
    trackId: "gestes-du-quotidien",
    instruction: { fr: "Comparez deux choix du quotidien — déchets, consommation, alimentation, mobilité, eau, énergie ou numérique — et expliquez lequel évite d’abord un gaspillage.", en: "Compare two daily choices — waste, consumption, food, mobility, water, energy or digital use — and explain which first avoids waste." },
    responseExplanation: { fr: "La comparaison dépend du contexte : réduire un besoin ou éviter un usage inutile est souvent un premier levier, puis viennent la réutilisation et le tri adapté.", en: "The comparison depends on context: reducing a need or avoiding unnecessary use is often a first lever, followed by reuse and appropriate sorting." },
    competencies: ["comparaison", "conséquences indirectes"],
    allowedLevels: ALL_LEVELS,
    levelProfiles: HABIT_PROFILES,
    source: INTERNAL_PEDAGOGY_SOURCE,
    validationStatus: "validated",
  },
  {
    id: "atelier-habitudes-estimation",
    title: { fr: "Estimer avant de décider", en: "Estimate before deciding" },
    theme: "habitudes-utiles",
    durationMinutes: 4,
    type: "estimation",
    trackId: "ordres-de-grandeur",
    instruction: { fr: "Estimez l’effet d’un petit changement répété par toute la classe pendant une semaine, puis dites quelle hypothèse vous avez choisie.", en: "Estimate the effect of a small change repeated by the whole class for a week, then state which assumption you chose." },
    responseExplanation: { fr: "Une estimation n’est pas une mesure réelle : elle rend visibles les hypothèses, l’unité et l’échelle du groupe. Il faut annoncer ce qui reste incertain.", en: "An estimate is not a real measurement: it makes assumptions, units and group scale visible. State what remains uncertain." },
    competencies: ["estimation", "comparaison"],
    allowedLevels: ALL_LEVELS,
    levelProfiles: ESTIMATION_PROFILES,
    source: INTERNAL_PEDAGOGY_SOURCE,
    validationStatus: "validated",
  },
  {
    id: "atelier-science-calcul",
    title: { fr: "Calculer un effet cumulé", en: "Calculate a cumulative effect" },
    theme: "science-et-calcul",
    durationMinutes: 5,
    type: "calcul",
    trackId: "ordres-de-grandeur",
    instruction: { fr: "Une classe évite 3 gobelets jetables par jour pendant 5 jours. Calculez le nombre évité et expliquez comment le résultat changerait avec deux classes.", en: "A class avoids 3 disposable cups per day for 5 days. Calculate the number avoided and explain how the result would change with two classes." },
    responseExplanation: { fr: "3 × 5 = 15 gobelets pour une classe et une semaine de 5 jours ; avec deux classes, le résultat double. Le calcul décrit cet exemple, pas tous les impacts d’un gobelet.", en: "3 × 5 = 15 cups for one class and a five-day week; with two classes, the result doubles. The calculation describes this example, not every impact of a cup." },
    competencies: ["estimation", "conséquences indirectes"],
    allowedLevels: ALL_LEVELS,
    levelProfiles: CALCULATION_PROFILES,
    source: INTERNAL_PEDAGOGY_SOURCE,
    validationStatus: "validated",
  },
  {
    id: "atelier-science-graphique",
    title: { fr: "Lire un graphique d’exemple", en: "Read an example chart" },
    theme: "science-et-calcul",
    durationMinutes: 4,
    type: "lecture-graphique",
    trackId: "mission-terrain",
    instruction: { fr: "Lisez ces données d’exemple sur des bouteilles évitées par une classe : lundi 2, mardi 4, mercredi 3, jeudi 5. Décrivez l’évolution sans inventer de cause.", en: "Read this example data about bottles avoided by a class: Monday 2, Tuesday 4, Wednesday 3, Thursday 5. Describe the trend without inventing a cause." },
    responseExplanation: { fr: "La valeur monte globalement de 2 à 5, avec un recul mercredi. Ces données montrent une évolution observée dans l’exemple ; elles ne prouvent pas pourquoi elle se produit.", en: "The value generally rises from 2 to 5, with a dip on Wednesday. This example shows an observed trend; it does not prove why it happens." },
    competencies: ["comparaison", "estimation"],
    allowedLevels: ALL_LEVELS,
    levelProfiles: GRAPH_PROFILES,
    source: EXAMPLE_DATA_SOURCE,
    validationStatus: "validated",
    dataPoints: [
      { label: { fr: "Lundi", en: "Monday" }, value: 2 },
      { label: { fr: "Mardi", en: "Tuesday" }, value: 4 },
      { label: { fr: "Mercredi", en: "Wednesday" }, value: 3 },
      { label: { fr: "Jeudi", en: "Thursday" }, value: 5 },
    ],
  },
  {
    id: "atelier-critique-source",
    title: { fr: "Résister à l’affirmation trop simple", en: "Resist the overly simple claim" },
    theme: "ecocitoyennete",
    durationMinutes: 4,
    type: "critique-de-source",
    trackId: "debat-classe",
    instruction: { fr: "Une affiche affirme : « Un seul geste suffit à régler le problème. » Identifiez la question à poser avant de la croire ou de la partager.", en: "A poster claims: “One single action is enough to solve the problem.” Identify the question to ask before believing or sharing it." },
    responseExplanation: { fr: "Il faut demander qui parle, sur quelles données, avec quel périmètre et quelles limites. Une action peut être utile sans suffire à elle seule.", en: "Ask who is speaking, based on which data, with what scope and which limits. An action can be useful without being sufficient on its own." },
    competencies: ["idée reçue", "cas-limites"],
    allowedLevels: ALL_LEVELS,
    levelProfiles: SOURCE_PROFILES,
    source: INTERNAL_PEDAGOGY_SOURCE,
    validationStatus: "validated",
  },
  {
    id: "atelier-echelles-action",
    title: { fr: "Passer du geste à l’action collective", en: "Move from a gesture to collective action" },
    theme: "echelles-collectives",
    durationMinutes: 5,
    type: "situation-probleme",
    trackId: "mission-terrain",
    instruction: { fr: "Choisissez une action sur les déchets, la consommation, l’alimentation, la mobilité, l’eau, l’énergie ou le numérique. Décrivez ce que peut faire une personne, puis la classe, le collège et le territoire.", en: "Choose an action about waste, consumption, food, mobility, water, energy or digital use. Describe what one person, then the class, the school and the local area can do." },
    responseExplanation: { fr: "Une action concrète gagne à préciser un responsable, une première étape et un indicateur simple. Le geste individuel compte, mais l’organisation du collège et les décisions du territoire peuvent changer l’échelle du résultat.", en: "A concrete action benefits from a responsible person, a first step and a simple indicator. Individual action matters, but school organization and local decisions can change the scale of the result." },
    competencies: ["conséquences indirectes", "terrain"],
    allowedLevels: ALL_LEVELS,
    levelProfiles: SCALE_PROFILES,
    source: INTERNAL_PEDAGOGY_SOURCE,
    validationStatus: "validated",
  },
];

export function resolveQuizSchoolActivity(
  activity: QuizSchoolActivity,
  level: QuizSchoolLevel,
): ResolvedQuizSchoolActivity | null {
  if (!activity.allowedLevels.includes(level)) {
    return null;
  }

  const levelProfile = activity.levelProfiles[level];
  if (!levelProfile) {
    return null;
  }

  return {
    ...activity,
    instruction: levelProfile.instruction ?? activity.instruction,
    responseExplanation: levelProfile.responseExplanation ?? activity.responseExplanation,
    competencies: levelProfile.skills.length > 0 ? levelProfile.skills : activity.competencies,
    difficulty: levelProfile.difficulty,
    adaptation: levelProfile.adaptation,
  };
}

function isPublicActivity(activity: QuizSchoolActivity, level: QuizSchoolLevel): boolean {
  return activity.validationStatus === "validated" && !activity.needsReview && Boolean(resolveQuizSchoolActivity(activity, level));
}

function uniqueActivities(activities: readonly QuizSchoolActivity[]): QuizSchoolActivity[] {
  const seenIds = new Set<string>();
  const seenInstructions = new Set<string>();

  return activities.filter((activity) => {
    const instructionKey = `${activity.instruction.fr}\u0000${activity.instruction.en}`;
    if (seenIds.has(activity.id) || seenInstructions.has(instructionKey)) {
      return false;
    }

    seenIds.add(activity.id);
    seenInstructions.add(instructionKey);
    return true;
  });
}

export function composeQuizSchoolWorkshopActivities(
  level: QuizSchoolLevel,
  activities: readonly QuizSchoolActivity[] = QUIZ_SCHOOL_WORKSHOP_ACTIVITIES,
): ResolvedQuizSchoolActivity[] {
  const candidates = uniqueActivities(activities).filter((activity) => isPublicActivity(activity, level));
  const selected: QuizSchoolActivity[] = [];
  const selectedIds = new Set<string>();
  let remainingMinutes = QUIZ_SCHOOL_WORKSHOP_ACTIVITY_TARGET_MINUTES;

  // Reserve the first slot for each internal track when the duration allows it.
  // The final list is returned in authoring order so the teaching progression remains stable.
  for (const trackId of QUIZ_SCHOOL_TRACK_ORDER) {
    const candidate = candidates.find((activity) => activity.trackId === trackId && !selectedIds.has(activity.id));
    if (!candidate || candidate.durationMinutes > remainingMinutes) {
      continue;
    }

    selected.push(candidate);
    selectedIds.add(candidate.id);
    remainingMinutes -= candidate.durationMinutes;
  }

  for (const candidate of candidates) {
    if (selectedIds.has(candidate.id) || candidate.durationMinutes > remainingMinutes) {
      continue;
    }

    selected.push(candidate);
    selectedIds.add(candidate.id);
    remainingMinutes -= candidate.durationMinutes;
  }

  return selected
    .sort((left, right) => candidates.indexOf(left) - candidates.indexOf(right))
    .map((activity) => resolveQuizSchoolActivity(activity, level))
    .filter((activity): activity is ResolvedQuizSchoolActivity => Boolean(activity));
}
