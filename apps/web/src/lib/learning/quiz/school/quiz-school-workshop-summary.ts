import type { QuizSchoolAssessmentLocalizedText, ResolvedQuizSchoolWorkshopAssessmentItem } from "./quiz-school-workshop-assessment";
import type { ResolvedQuizSchoolActivity } from "./quiz-school-workshop-activities";
import { getQuizSchoolTerritorialResources, type QuizSchoolTerritorialResource } from "./quiz-school-territorial-resources";
import type { QuizSchoolLevel } from "./quiz-school-types";

export type QuizSchoolWorkshopSummary = {
  level: QuizSchoolLevel;
  preCorrect: number;
  preTotal: number;
  preRate: number;
  postCorrect: number;
  postTotal: number;
  postRate: number;
  progress: number;
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

function uniqueNotions(items: QuizSchoolAssessmentLocalizedText[]): QuizSchoolAssessmentLocalizedText[] {
  const seen = new Set<string>();
  return items.filter((notion) => {
    const key = `${notion.fr}\u0000${notion.en}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
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
  const preByPair = new Map(preAssessment.map((item) => [item.pairId, item]));
  const postPairs = postAssessment.filter((item) => preByPair.has(item.pairId));
  const acquiredNotions = postPairs
    .filter((item) => postAnswers[item.id] === true && preAnswers[preByPair.get(item.pairId)?.id ?? ""] !== true)
    .map((item) => item.notion);
  const fragileNotions = postPairs
    .filter((item) => postAnswers[item.id] !== true)
    .map((item) => item.notion);
  const retainedNotions = postAssessment
    .filter((item) => postAnswers[item.id] === true)
    .map((item) => item.notion);

  // A partially completed local session still has a useful, non-personal recap.
  // Fill the three takeaway slots from the assessed concepts when no answer was recorded.
  const fallbackNotions = postAssessment.map((item) => item.notion);
  const threeTakeaways = uniqueNotions([...retainedNotions, ...fallbackNotions]).slice(0, 3);
  const activityThemes = new Set(activities.map((activity) => activity.theme));
  const selectedResources = getQuizSchoolTerritorialResources("ile-de-france", territorialResources ? [...territorialResources] : undefined)
    .sort((left, right) => resourceRelevance(left, activityThemes) - resourceRelevance(right, activityThemes))
    .slice(0, 3);
  const preCorrect = preAssessment.filter((item) => preAnswers[item.id] === true).length;
  const postCorrect = postAssessment.filter((item) => postAnswers[item.id] === true).length;
  const preRate = rate(preCorrect, preAssessment.length);
  const postRate = rate(postCorrect, postAssessment.length);

  return {
    level,
    preCorrect,
    preTotal: preAssessment.length,
    preRate,
    postCorrect,
    postTotal: postAssessment.length,
    postRate,
    progress: postRate - preRate,
    acquiredNotions: uniqueNotions(acquiredNotions),
    fragileNotions: uniqueNotions(fragileNotions),
    retainedNotions: threeTakeaways,
    collegeActions: [...COLLEGE_ACTIONS],
    territorialResources: selectedResources,
  };
}

export function getQuizSchoolWorkshopActivityThemes(activities: readonly ResolvedQuizSchoolActivity[]): string[] {
  return [...new Set(activities.map((activity) => activity.theme))];
}
