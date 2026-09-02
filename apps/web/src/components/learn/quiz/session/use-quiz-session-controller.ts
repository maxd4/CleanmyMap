"use client";

import { useRef, useState } from "react";
import type { SRSQuality } from "@/lib/gamification/quiz-srs";
import type { QuizErrorTypeId } from "@/lib/learning/quiz/quiz-error-grid";
import type { QuizQuestion } from "@/lib/learning/quiz/quiz-question-contract";

type IncorrectAnswerContext = {
  question: QuizQuestion;
  questionIndex: number;
  errorType: QuizErrorTypeId;
  errorCount: number;
};

export type UseQuizSessionControllerOptions = {
  sessionQuestions: readonly QuizQuestion[];
  getErrorType: (question: QuizQuestion) => QuizErrorTypeId;
  onResetSessionQuestions: () => void;
  onCorrectAnswer?: (question: QuizQuestion) => void;
  onIncorrectAnswer?: (context: IncorrectAnswerContext) => void;
  onSRSUpdate: (quality: SRSQuality, question: QuizQuestion) => void | Promise<void>;
};

export function useQuizSessionController({
  sessionQuestions,
  getErrorType,
  onResetSessionQuestions,
  onCorrectAnswer,
  onIncorrectAnswer,
  onSRSUpdate,
}: UseQuizSessionControllerOptions) {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showQuestionChoices, setShowQuestionChoices] = useState(false);
  const [score, setScore] = useState(0);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [lastCheckResult, setLastCheckResult] = useState<boolean | null>(null);
  const [sessionResults, setSessionResults] = useState<Record<string, boolean>>({});
  const [sessionErrorCounts, setSessionErrorCounts] = useState<Record<string, number>>({});
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const persistedSessionRef = useRef(false);
  const question = sessionQuestions[currentQuestionIdx];
  const isMultipleSelectQuestion = question?.type === "multiple-select";

  const toggleSelectedOption = (option: string) => {
    if (showAnswer || !isMultipleSelectQuestion) {
      return;
    }

    setSelectedOptions((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    );
  };

  const checkAnswer = () => {
    if (!question) return;

    const isCorrect = isMultipleSelectQuestion
      ? Array.isArray(question.answer) &&
        selectedOptions.length === question.answer.length &&
        question.answer.every((item) => selectedOptions.includes(item))
      : selectedOption === question.answer;
    setLastCheckResult(isCorrect);
    setShowAnswer(true);
    setSessionResults((prev) =>
      prev[question.id] === undefined ? { ...prev, [question.id]: isCorrect } : prev,
    );

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setCorrectStreak((prev) => prev + 1);
      onCorrectAnswer?.(question);
      return;
    }

    setCorrectStreak(0);
    const errorType = getErrorType(question);
    const errorCount = (sessionErrorCounts[errorType] ?? 0) + 1;
    setSessionErrorCounts((prev) => ({ ...prev, [errorType]: errorCount }));
    onIncorrectAnswer?.({ question, questionIndex: currentQuestionIdx, errorType, errorCount });
    void onSRSUpdate(0, question);
  };

  const revealAnswer = () => {
    if (!question) return;

    const hasSelection = isMultipleSelectQuestion ? selectedOptions.length > 0 : Boolean(selectedOption);
    if (hasSelection) {
      checkAnswer();
      return;
    }

    setLastCheckResult(null);
    setShowAnswer(true);
  };

  const revealChoices = () => {
    setShowQuestionChoices(true);
  };

  const nextQuestion = () => {
    if (currentQuestionIdx < sessionQuestions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
      setSelectedOption("");
      setSelectedOptions([]);
      setShowAnswer(false);
      setLastCheckResult(null);
      setShowQuestionChoices(false);
      return;
    }

    setSessionCompleted(true);
  };

  const previousQuestion = () => {
    if (currentQuestionIdx === 0) {
      return;
    }

    setCurrentQuestionIdx((prev) => prev - 1);
    setSelectedOption("");
    setSelectedOptions([]);
    setShowAnswer(false);
    setShowQuestionChoices(false);
    setLastCheckResult(null);
  };

  const resetQuestionSequence = () => {
    setCurrentQuestionIdx(0);
    setSelectedOption("");
    setSelectedOptions([]);
    setShowAnswer(false);
    setShowQuestionChoices(false);
    setScore(0);
    setCorrectStreak(0);
    setLastCheckResult(null);
    setSessionResults({});
    setSessionErrorCounts({});
    onResetSessionQuestions();
    setSessionCompleted(false);
  };

  const resetSessionState = () => {
    persistedSessionRef.current = false;
    resetQuestionSequence();
  };

  return {
    currentQuestionIdx,
    question,
    selectedOption,
    selectedOptions,
    showAnswer,
    showQuestionChoices,
    score,
    correctStreak,
    lastCheckResult,
    sessionResults,
    sessionErrorCounts,
    sessionCompleted,
    persistedSessionRef,
    setCurrentQuestionIdx,
    setSelectedOption,
    toggleSelectedOption,
    checkAnswer,
    revealAnswer,
    revealChoices,
    nextQuestion,
    previousQuestion,
    resetQuestionSequence,
    resetSessionState,
  };
}
