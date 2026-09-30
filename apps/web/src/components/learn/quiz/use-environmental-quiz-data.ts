"use client";

import { useEffect, useMemo, useState } from "react";

import { buildClerkSupabaseAccessTokenProvider } from "@/lib/clerk-supabase-token";
import { computeNextSRSState, createInitialSRSState, type SRSQuality, type SRSStats } from "@/lib/gamification/quiz-srs";
import { loadQuizSRSData, saveQuizSRSState } from "@/lib/services/quiz-srs-service";
import {
  buildQuizDemoSessionDeck,
  buildQuizSchoolSessionDeck,
  buildQuizSessionDeck,
} from "@/lib/learning/quiz/quiz-selection-engine";
import { matchesQuizAccessType, type QuizAccessTypeId } from "@/lib/learning/quiz/quiz-access-types";
import { matchesQuizTrapLevel, type QuizTrapLevelId } from "@/lib/learning/quiz/quiz-trap-levels";
import type { QuizReasoningType } from "@/lib/learning/quiz/quiz-reasoning-types";
import type { QuizSchoolLevel } from "@/lib/learning/quiz/school/quiz-school-types";
import { QUIZ_QUESTIONS } from "@/lib/learning/quiz/quiz-question-bank";
import type { QuizQuestion } from "@/lib/learning/quiz/quiz-question-contract";

type QuizTokenGetter = Parameters<typeof buildClerkSupabaseAccessTokenProvider>[0];

type QuizDataOptions = {
  getToken: QuizTokenGetter;
  userId: string | null;
  selectedAccessType: QuizAccessTypeId | null;
  selectedTrapLevel: QuizTrapLevelId | null;
  selectedReasoningType: QuizReasoningType | null;
  selectedSchoolLevel: QuizSchoolLevel | null;
  isDemoMode: boolean;
};

export function useEnvironmentalQuizData({
  getToken,
  userId,
  selectedAccessType,
  selectedTrapLevel,
  selectedReasoningType,
  selectedSchoolLevel,
  isDemoMode,
}: QuizDataOptions) {
  const [srsData, setSrsData] = useState<Record<string, SRSStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (selectedAccessType === "ecole") return () => { cancelled = true; };

    const init = async () => {
      try {
        const data = await loadQuizSRSData(
          userId,
          QUIZ_QUESTIONS.map((question) => question.id),
          buildClerkSupabaseAccessTokenProvider(getToken),
        );
        if (!cancelled) setSrsData(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void init();
    return () => { cancelled = true; };
  }, [getToken, selectedAccessType, userId]);

  const filteredQuestions = useMemo(() => {
    if (!selectedAccessType) return [];
    return buildQuizSessionDeck(QUIZ_QUESTIONS, selectedAccessType === "ecole" ? {} : srsData, {
      mode: selectedAccessType,
      accessTypeId: selectedAccessType,
      trapLevel: selectedTrapLevel,
      reasoningType: selectedReasoningType,
      schoolLevel: selectedSchoolLevel,
      shuffleSession: selectedAccessType === "mixte",
    });
  }, [selectedAccessType, selectedReasoningType, selectedSchoolLevel, selectedTrapLevel, srsData]);

  const demoQuestions = useMemo(() => buildQuizDemoSessionDeck(QUIZ_QUESTIONS), []);
  const schoolQuestions = useMemo(
    () => selectedSchoolLevel ? buildQuizSchoolSessionDeck(QUIZ_QUESTIONS, selectedSchoolLevel) : [],
    [selectedSchoolLevel],
  );
  const eligibleQuestions = useMemo(
    () => selectedAccessType
      ? QUIZ_QUESTIONS.filter((question) => matchesQuizAccessType(selectedAccessType, question) && matchesQuizTrapLevel(selectedTrapLevel, question))
      : [],
    [selectedAccessType, selectedTrapLevel],
  );
  const availableReasoningTypes = useMemo(
    () => !selectedAccessType || selectedAccessType === "mixte"
      ? []
      : Array.from(new Set(eligibleQuestions.map((question) => question.reasoningType))),
    [eligibleQuestions, selectedAccessType],
  );
  const initialQuestions = useMemo(() => {
    if (isDemoMode) return demoQuestions;
    if (selectedAccessType === "ecole") return schoolQuestions;
    return loading || filteredQuestions.length === 0 ? [] : filteredQuestions;
  }, [demoQuestions, filteredQuestions, isDemoMode, loading, schoolQuestions, selectedAccessType]);

  const handleSRSUpdate = async (quality: SRSQuality, questionForUpdate?: QuizQuestion) => {
    if (isDemoMode || selectedAccessType === "ecole" || !questionForUpdate) return;
    const currentStats = srsData[questionForUpdate.id] ?? createInitialSRSState(questionForUpdate.id);
    const nextStats = computeNextSRSState(currentStats, quality);
    setSrsData((prev) => ({ ...prev, [questionForUpdate.id]: nextStats }));
    await saveQuizSRSState(userId, nextStats, buildClerkSupabaseAccessTokenProvider(getToken));
  };

  return { srsData, loading, filteredQuestions, demoQuestions, schoolQuestions, availableReasoningTypes, initialQuestions, handleSRSUpdate };
}
