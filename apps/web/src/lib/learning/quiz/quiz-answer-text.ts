import type { QuizQuestion } from "./quiz-question-contract";

/** Returns the canonical searchable representation of a quiz answer. */
export function getQuizAnswerText(question: QuizQuestion): string {
  return Array.isArray(question.answer)
    ? question.answer.join(" / ")
    : question.answer;
}
