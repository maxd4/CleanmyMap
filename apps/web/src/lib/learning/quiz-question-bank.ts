import { QUIZ_QUESTION_BANK } from "../../../data/environmental-quiz-bank.ts";
import { buildQuizErrorGrid } from "../../components/learn/quiz-error-grid.ts";
import { buildQuizSourceMetadata } from "./quiz-source-metadata.ts";
import { getQuizDifficulty } from "./quiz-taxonomy.ts";
import { getQuizTrapLevel } from "../../components/learn/quiz-trap-levels.ts";
import { getQuizPedagogicalType } from "./quiz-taxonomy.ts";
import { stabilizeQuizQuestion, type ResolvedQuizQuestion } from "./quiz-question-contract.ts";

export const QUIZ_QUESTIONS: ResolvedQuizQuestion[] = QUIZ_QUESTION_BANK.map((question) => {
  const errorGrid = buildQuizErrorGrid(question);
  const sourceMetadata = buildQuizSourceMetadata(question);

  return stabilizeQuizQuestion({
    ...question,
    ...sourceMetadata,
    pedagogicalType: question.pedagogicalType ?? question.format ?? getQuizPedagogicalType(question),
    skill: question.skill ?? question.reasoningType,
    difficulty: question.difficulty ?? getQuizDifficulty(question),
    trapLevel: question.trapLevel ?? getQuizTrapLevel(question),
    reviewTarget: question.reviewTarget ?? errorGrid.reviewTarget,
    errorType: question.errorType ?? errorGrid.errorType,
    misconception: question.misconception ?? errorGrid.misconception,
    severity: question.severity ?? errorGrid.severity,
    feedbackCorrect: question.feedbackCorrect ?? errorGrid.feedbackCorrect,
    feedbackWrong: question.feedbackWrong ?? errorGrid.feedbackWrong,
  });
});
