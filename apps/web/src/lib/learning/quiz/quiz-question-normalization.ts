import { buildQuizErrorGrid, getQuizErrorFollowUp } from "./quiz-error-grid.ts";
import type { QuizQuestion, ResolvedQuizQuestion } from "./quiz-question-contract.ts";
import { buildQuizSourceMetadata } from "./quiz-source-metadata.ts";
import { getQuizDifficulty, getQuizPedagogicalType } from "./quiz-taxonomy.ts";
import { getQuizTrapLevel } from "./quiz-trap-levels.ts";
import { buildQuizSchoolQuestionEligibility } from "./school/quiz-school-eligibility.ts";
import { getQuizSchoolTrackId } from "./school/quiz-school-types";

export function stabilizeQuizQuestion(question: QuizQuestion): ResolvedQuizQuestion {
  const errorGrid = buildQuizErrorGrid(question);
  const sourceMetadata = buildQuizSourceMetadata(question);
  const reviewTarget = question.reviewTarget ?? question.review ?? errorGrid.reviewTarget;
  const followUp = getQuizErrorFollowUp(errorGrid.errorType);
  const pedagogicalType = question.pedagogicalType ?? question.format ?? getQuizPedagogicalType(question);
  const skill = question.skill ?? question.reasoningType;
  const difficulty = question.difficulty ?? getQuizDifficulty(question);
  const schoolEligibility =
    question.schoolEligibility ??
    buildQuizSchoolQuestionEligibility({ ...question, skill, difficulty, pedagogicalType });

  return {
    ...question,
    trackId: question.trackId ?? getQuizSchoolTrackId(question.id),
    schoolEligibility,
    structure: {
      content: {
        prompt: question.question,
        answer: question.answer,
        options: question.options,
        explanation: question.explanation,
        takeaway: question.takeaway,
        localized: question.localized,
      },
      taxonomy: {
        category: question.category,
        type: question.type,
        reasoningType: question.reasoningType,
        format: question.format,
        pedagogicalType,
        skill,
        difficulty,
        trapLevel: question.trapLevel ?? getQuizTrapLevel(question),
      },
      source: {
        sourceUrl: sourceMetadata.sourceUrl,
        sourceLabel: sourceMetadata.sourceLabel,
        sourceType: sourceMetadata.sourceType,
        confidenceLevel: sourceMetadata.confidenceLevel,
        isLocalRule: sourceMetadata.isLocalRule,
        localScope: sourceMetadata.localScope,
        lastCheckedAt: sourceMetadata.lastCheckedAt,
        needsReview: sourceMetadata.needsReview,
      },
      reference: question.reference,
      review: {
        target: reviewTarget,
        errorType: errorGrid.errorType,
        misconception: question.misconception ?? errorGrid.misconception,
        severity: question.severity ?? errorGrid.severity,
        feedbackCorrect: question.feedbackCorrect ?? errorGrid.feedbackCorrect,
        feedbackWrong: question.feedbackWrong ?? errorGrid.feedbackWrong,
        followUp,
      },
    },
  };
}
