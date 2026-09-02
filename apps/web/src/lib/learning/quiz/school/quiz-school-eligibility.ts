import type { QuizQuestion } from "../quiz-question-contract";
import {
  QUIZ_SCHOOL_LEVEL_ORDER,
  type QuizSchoolLevel,
  type QuizSchoolQuestionEligibility,
} from "./quiz-school-types";
import { getQuizDifficulty, type QuizDifficultyId, type QuizSkillId } from "../quiz-taxonomy";

const LEVELS_BY_DIFFICULTY: Record<QuizDifficultyId, readonly QuizSchoolLevel[]> = {
  low: QUIZ_SCHOOL_LEVEL_ORDER,
  medium: ["5e", "4e", "3e"],
  high: ["3e"],
};

const CONCRETE_TERRAIN_QUESTION_IDS = new Set(["at12", "at13", "at15", "at16", "at17"]);

function buildProfile(difficulty: QuizDifficultyId, skill: QuizSkillId): { difficulty: QuizDifficultyId; skills: readonly QuizSkillId[] } {
  return { difficulty, skills: [skill] };
}
export function buildQuizSchoolQuestionEligibility(
  question: Pick<QuizQuestion, "id" | "reasoningType" | "skill" | "difficulty" | "pedagogicalType" | "format" | "type">,
): QuizSchoolQuestionEligibility {
  const skill = question.skill ?? question.reasoningType;
  const difficulty = getQuizDifficulty(question);

  if (CONCRETE_TERRAIN_QUESTION_IDS.has(question.id)) {
    return {
      "6e": buildProfile("low", skill),
      "5e": buildProfile("medium", skill),
      "4e": buildProfile("medium", skill),
      "3e": buildProfile("medium", skill),
    };
  }

  return Object.fromEntries(
    LEVELS_BY_DIFFICULTY[difficulty].map((level) => [level, buildProfile(difficulty, skill)]),
  ) as QuizSchoolQuestionEligibility;
}
