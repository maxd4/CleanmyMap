import type { QuizQuestion } from "./quiz-question-contract";

export type QuizUserAnswer = string | readonly string[];

export function normalizeQuizAnswer(answer: QuizUserAnswer): string | string[] {
  return typeof answer === "string" ? answer.trim() : answer.map((value) => value.trim());
}

export function isQuizAnswerCorrect(
  question: Pick<QuizQuestion, "type" | "answer">,
  submittedAnswer: QuizUserAnswer,
): boolean {
  const expectedAnswer = normalizeQuizAnswer(question.answer);
  const actualAnswer = normalizeQuizAnswer(submittedAnswer);

  if (question.type === "multiple-select") {
    if (!Array.isArray(expectedAnswer) || !Array.isArray(actualAnswer)) {
      return false;
    }

    const compareAnswers = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
    const sortedExpectedAnswer = [...expectedAnswer].sort(compareAnswers);
    const sortedActualAnswer = [...actualAnswer].sort(compareAnswers);

    return (
      sortedExpectedAnswer.length === sortedActualAnswer.length &&
      sortedExpectedAnswer.every((value, index) => value === sortedActualAnswer[index])
    );
  }

  return (
    typeof expectedAnswer === "string" &&
    typeof actualAnswer === "string" &&
    expectedAnswer === actualAnswer
  );
}
