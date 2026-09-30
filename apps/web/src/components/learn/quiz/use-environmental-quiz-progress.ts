"use client";

import { useEffect, type MutableRefObject } from "react";

import { recordQuizPedagogicalMetrics } from "@/lib/learning/quiz/quiz-pedagogical-metrics-client";
import { buildQuizErrorGrid } from "@/lib/learning/quiz/quiz-error-grid";
import {
  buildQuizPersonalProgressSnapshot,
  mergeQuizPersonalProgress,
  saveQuizPersonalProgress,
  type QuizPersonalProgressState,
} from "@/lib/learning/quiz/quiz-personal-progress";
import type { QuizQuestion } from "@/lib/learning/quiz/quiz-question-contract";
import type { QuizSessionSummary } from "@/lib/learning/quiz/quiz-session-types";
import type { QuizAccessTypeId } from "@/lib/learning/quiz/quiz-access-types";

type QuizProgressOptions = {
  personalProgress: QuizPersonalProgressState | null;
  setPersonalProgress: (progress: QuizPersonalProgressState) => void;
  isDemoMode: boolean;
  selectedAccessType: QuizAccessTypeId | null;
  sessionCompleted: boolean;
  sessionSummary: QuizSessionSummary | null;
  activeSessionQuestions: readonly QuizQuestion[];
  sessionResults: Record<string, boolean>;
  sessionErrorCounts: Record<string, number>;
  persistedSessionRef: MutableRefObject<boolean>;
};

export function useEnvironmentalQuizProgress({
  personalProgress,
  setPersonalProgress,
  isDemoMode,
  selectedAccessType,
  sessionCompleted,
  sessionSummary,
  activeSessionQuestions,
  sessionResults,
  sessionErrorCounts,
  persistedSessionRef,
}: QuizProgressOptions) {
  useEffect(() => {
    if (
      isDemoMode ||
      selectedAccessType === "ecole" ||
      !sessionCompleted ||
      !sessionSummary ||
      !selectedAccessType ||
      persistedSessionRef.current
    ) {
      return;
    }

    const nextProgress = mergeQuizPersonalProgress(personalProgress, {
      mode: selectedAccessType,
      score: sessionSummary.score,
      totalQuestions: sessionSummary.totalQuestions,
      questions: activeSessionQuestions,
      results: sessionResults,
      errorCounts: sessionErrorCounts,
    });

    persistedSessionRef.current = true;
    setPersonalProgress(nextProgress);
    saveQuizPersonalProgress(nextProgress);
    void recordQuizPedagogicalMetrics({
      mode: selectedAccessType,
      playedAt: new Date().toISOString(),
      totalQuestions: sessionSummary.totalQuestions,
      score: sessionSummary.score,
      questions: Array.from(new Map(activeSessionQuestions.map((question) => [question.id, question])).values()).map((question) => ({
        questionId: question.id,
        correct: Boolean(sessionResults[question.id]),
        skill: question.skill ?? question.reasoningType,
        pedagogicalType: question.pedagogicalType ?? question.format ?? question.type,
        errorType: question.errorType ?? buildQuizErrorGrid(question).errorType,
        category: question.category,
        difficulty: question.difficulty,
        trapLevel: question.trapLevel,
      })),
    }).catch(() => undefined);
  }, [
    activeSessionQuestions,
    isDemoMode,
    personalProgress,
    persistedSessionRef,
    selectedAccessType,
    sessionCompleted,
    sessionErrorCounts,
    sessionResults,
    sessionSummary,
    setPersonalProgress,
  ]);

  return buildQuizPersonalProgressSnapshot(personalProgress);
}
