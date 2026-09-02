import type { QuizSchoolAssessmentLocalizedText, ResolvedQuizSchoolWorkshopAssessmentItem } from "./quiz-school-workshop-assessment";
import type { ResolvedQuizSchoolActivity } from "./quiz-school-workshop-activities";
import { getQuizSchoolTerritorialResources, type QuizSchoolTerritorialResource } from "./quiz-school-territorial-resources";
import type { QuizSchoolLevel } from "./quiz-school-types";

export type QuizSchoolWorkshopSummary = {
  level: QuizSchoolLevel;
  preConceptCorrect: number;
  preConceptTotal: number;
  preConceptRate: number;
  postConceptCorrect: number;
  postConceptTotal: number;
  postConceptRate: number;
  conceptProgress: number;
  transferCorrect: number;
  transferTotal: number;
  transferRate: number;
  acquiredNotions: QuizSchoolAssessmentLocalizedText[];
  fragileNotions: QuizSchoolAssessmentLocalizedText[];
  retainedNotions: QuizSchoolAssessmentLocalizedText[];
  collegeActions: QuizSchoolAssessmentLocalizedText[];
  territorialResources: QuizSchoolTerritorialResource[];
};

const COLLEGE_ACTIONS: readonly QuizSchoolAssessmentLocalizedText[] = [
  { fr: "Mesurer pendant une semaine un flux choisi par la classe (déchets, énergie, eau ou numérique).", en: "Measure one flow chosen by the class for a week (waste, energy, water or digital use)." },
  { fr: "Tester une action simple avec un responsable et un indicateur compréhensible.", en: "Test one simple action with an owner and an understandable indicator." },
  { fr: "Présenter le résultat au collège, discuter ses limites et décider de la suite.", en: "Present the result to the school, discuss its limits and decide what comes next." },
];

function rate(correct: number, total: number): number {
  return total > 0 ? correct / total : 0;
}

function uniqueNotions(items: readonly QuizSchoolAssessmentLocalizedText[]): QuizSchoolAssessmentLocalizedText[] {
  const seen = new Set<string>();
  return items.filter((notion) => {
    const key = `${notion.fr}\u0000${notion.en}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type ComparableAssessmentPair = {
  pre: ResolvedQuizSchoolWorkshopAssessmentItem;
  post: ResolvedQuizSchoolWorkshopAssessmentItem;
};

function buildComparableAssessmentPairs(
  preAssessment: readonly ResolvedQuizSchoolWorkshopAssessmentItem[],
  postAssessment: readonly ResolvedQuizSchoolWorkshopAssessmentItem[],
): ComparableAssessmentPair[] {
  const preByPair = new Map(
    preAssessment.filter((item) => !item.isTransfer).map((item) => [item.pairId, item]),
  );
  const postByPair = new Map(
    postAssessment.filter((item) => !item.isTransfer).map((item) => [item.pairId, item]),
  );

  return [...preByPair].flatMap(([pairId, pre]) => {
    const post = postByPair.get(pairId);
    return post ? [{ pre, post }] : [];
  });
}

function resourceRelevance(resource: QuizSchoolTerritorialResource, themes: ReadonlySet<string>): number {
  const text = `${resource.theme.fr} ${resource.description.fr}`.toLocaleLowerCase("fr");
  const keywordsByTheme: Record<string, readonly string[]> = {
    ecocitoyennete: ["climat", "action", "territoire"],
    "habitudes-utiles": ["climat", "action"],
    "science-et-calcul": ["biodiversité", "observer"],
    "echelles-collectives": ["territoire", "ville", "nature"],
  };
  return [...themes].some((theme) => (keywordsByTheme[theme] ?? []).some((keyword) => text.includes(keyword))) ? 0 : 1;
}

export function buildQuizSchoolWorkshopSummary({
  level,
  preAssessment,
  postAssessment,
  preAnswers,
  postAnswers,
  activities,
  territorialResources,
}: {
  level: QuizSchoolLevel;
  preAssessment: readonly ResolvedQuizSchoolWorkshopAssessmentItem[];
  postAssessment: readonly ResolvedQuizSchoolWorkshopAssessmentItem[];
  preAnswers: Readonly<Record<string, boolean>>;
  postAnswers: Readonly<Record<string, boolean>>;
  activities: readonly ResolvedQuizSchoolActivity[];
  territorialResources?: readonly QuizSchoolTerritorialResource[];
}): QuizSchoolWorkshopSummary {
  const comparablePairs = buildComparableAssessmentPairs(preAssessment, postAssessment);
  const transferItems = postAssessment.filter((item) => item.isTransfer === true);
  const acquiredNotions = comparablePairs
    .filter(({ pre, post }) => postAnswers[post.id] === true && preAnswers[pre.id] !== true)
    .map(({ post }) => post.notion);
  const fragileNotions = comparablePairs
    .filter(({ post }) => postAnswers[post.id] !== true)
    .map(({ post }) => post.notion);
  const retainedNotions = uniqueNotions(
    comparablePairs.filter(({ post }) => postAnswers[post.id] === true).map(({ post }) => post.notion),
  ).slice(0, 3);
  const activityThemes = new Set(activities.map((activity) => activity.theme));
  const selectedResources = getQuizSchoolTerritorialResources("ile-de-france", territorialResources ? [...territorialResources] : undefined)
    .sort((left, right) => resourceRelevance(left, activityThemes) - resourceRelevance(right, activityThemes))
    .slice(0, 3);
  const preConceptCorrect = comparablePairs.filter(({ pre }) => preAnswers[pre.id] === true).length;
  const postConceptCorrect = comparablePairs.filter(({ post }) => postAnswers[post.id] === true).length;
  const preConceptTotal = comparablePairs.length;
  const postConceptTotal = comparablePairs.length;
  const preConceptRate = rate(preConceptCorrect, preConceptTotal);
  const postConceptRate = rate(postConceptCorrect, postConceptTotal);
  const transferCorrect = transferItems.filter((item) => postAnswers[item.id] === true).length;
  const transferTotal = transferItems.length;

  return {
    level,
    preConceptCorrect,
    preConceptTotal,
    preConceptRate,
    postConceptCorrect,
    postConceptTotal,
    postConceptRate,
    conceptProgress: postConceptRate - preConceptRate,
    transferCorrect,
    transferTotal,
    transferRate: rate(transferCorrect, transferTotal),
    acquiredNotions: uniqueNotions(acquiredNotions),
    fragileNotions: uniqueNotions(fragileNotions),
    retainedNotions,
    collegeActions: [...COLLEGE_ACTIONS],
    territorialResources: selectedResources,
  };
}

export function getQuizSchoolWorkshopActivityThemes(activities: readonly ResolvedQuizSchoolActivity[]): string[] {
  return [...new Set(activities.map((activity) => activity.theme))];
}
