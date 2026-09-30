"use client";

import { useState } from "react";

import { DEFAULT_QUIZ_SCHOOL_FORMAT, type QuizSchoolFormat, type QuizSchoolLevel } from "@/lib/learning/quiz/school/quiz-school-types";
import type { QuizAccessTypeId } from "@/lib/learning/quiz/quiz-access-types";
import type { QuizReasoningType } from "@/lib/learning/quiz/quiz-reasoning-types";
import type { QuizTrapLevelId } from "@/lib/learning/quiz/quiz-trap-levels";
import type { QuizQuestion } from "@/lib/learning/quiz/quiz-question-contract";
import type { QuizSessionSummary } from "@/lib/learning/quiz/quiz-session-types";

type QuizModeOptions = {
  initialAccessType: QuizAccessTypeId | null;
  initialDemoMode: boolean;
  initialSchoolLevel: QuizSchoolLevel | null;
  initialSchoolFormat: QuizSchoolFormat | null;
  initialCollectiveMode: boolean;
};

export function useEnvironmentalQuizMode({
  initialAccessType,
  initialDemoMode,
  initialSchoolLevel,
  initialSchoolFormat,
  initialCollectiveMode,
}: QuizModeOptions) {
  const [isDemoMode, setIsDemoMode] = useState(initialDemoMode);
  const [selectedAccessType, setSelectedAccessType] = useState<QuizAccessTypeId | null>(initialAccessType);
  const [selectedTrapLevel, setSelectedTrapLevel] = useState<QuizTrapLevelId | null>(null);
  const [selectedReasoningType, setSelectedReasoningType] = useState<QuizReasoningType | null>(null);
  const [selectedSchoolLevel, setSelectedSchoolLevel] = useState<QuizSchoolLevel | null>(initialSchoolLevel);
  const [selectedSchoolFormat, setSelectedSchoolFormat] = useState<QuizSchoolFormat>(
    initialSchoolFormat ?? DEFAULT_QUIZ_SCHOOL_FORMAT,
  );
  const [isSchoolCollectiveMode, setIsSchoolCollectiveMode] = useState(initialCollectiveMode);
  const [sessionQuestions, setSessionQuestions] = useState<QuizQuestion[]>([]);

  const resetMode = (resetSessionState: () => void) => {
    resetSessionState();
    setIsDemoMode(false);
    setSelectedAccessType(null);
    setSelectedTrapLevel(null);
    setSelectedReasoningType(null);
    setSelectedSchoolLevel(null);
    setSelectedSchoolFormat(DEFAULT_QUIZ_SCHOOL_FORMAT);
    setIsSchoolCollectiveMode(true);
  };

  const handleSelectAccessType = (accessType: QuizAccessTypeId, resetSessionState: () => void) => {
    resetSessionState();
    setIsDemoMode(false);
    setSelectedAccessType(accessType);
    setSelectedTrapLevel(null);
    setSelectedReasoningType(null);
    setSelectedSchoolLevel(null);
    setSelectedSchoolFormat(DEFAULT_QUIZ_SCHOOL_FORMAT);
    setIsSchoolCollectiveMode(true);
  };

  const handleSelectTrapLevel = (trapLevel: QuizTrapLevelId | null, resetSessionState: () => void) => {
    resetSessionState();
    setIsDemoMode(false);
    setSelectedTrapLevel(trapLevel);
    setSelectedReasoningType(null);
    setSelectedSchoolLevel(null);
    setSelectedSchoolFormat(DEFAULT_QUIZ_SCHOOL_FORMAT);
    setIsSchoolCollectiveMode(true);
  };

  const startDemoSession = (resetSessionState: () => void) => {
    resetSessionState();
    setIsDemoMode(true);
    setSelectedAccessType("mixte");
    setSelectedTrapLevel(null);
    setSelectedReasoningType(null);
    setSelectedSchoolLevel(null);
    setSelectedSchoolFormat(DEFAULT_QUIZ_SCHOOL_FORMAT);
    setIsSchoolCollectiveMode(true);
  };

  const handleLaunchSchoolSession = (level: QuizSchoolLevel, format: QuizSchoolFormat, resetSessionState: () => void) => {
    resetSessionState();
    setIsDemoMode(false);
    setSelectedAccessType("ecole");
    setSelectedTrapLevel(null);
    setSelectedSchoolLevel(level);
    setSelectedSchoolFormat(format);
    setSelectedReasoningType(null);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("mode", "ecole");
      params.set("level", level);
      params.set("format", format);
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    }
  };

  const chooseSchoolFormat = (resetSessionState: () => void) => {
    resetSessionState();
    setSelectedSchoolLevel(null);
    setSelectedSchoolFormat(DEFAULT_QUIZ_SCHOOL_FORMAT);
  };

  const startMiniChallenge = (nextReasoningType: QuizReasoningType | null, resetQuestionSequence: () => void) => {
    if (!nextReasoningType || selectedAccessType === "mixte") return;
    setSelectedReasoningType(nextReasoningType);
    resetQuestionSequence();
  };

  return {
    isDemoMode,
    selectedAccessType,
    selectedTrapLevel,
    selectedReasoningType,
    selectedSchoolLevel,
    selectedSchoolFormat,
    isSchoolCollectiveMode,
    sessionQuestions,
    setSelectedReasoningType,
    setSelectedSchoolFormat,
    setIsSchoolCollectiveMode,
    setSessionQuestions,
    resetMode,
    handleSelectAccessType,
    handleSelectTrapLevel,
    startDemoSession,
    handleLaunchSchoolSession,
    chooseSchoolFormat,
    startMiniChallenge,
    restartSchoolWorkshop: () => setSelectedSchoolFormat("atelier-60"),
    toggleCollectiveMode: () => setIsSchoolCollectiveMode((current) => !current),
    replayRecommendedMode: (sessionSummary: QuizSessionSummary | null, resetSessionState: () => void) => {
      if (!sessionSummary?.recommendedMode) return;
      resetSessionState();
      setIsDemoMode(false);
      setSelectedAccessType(sessionSummary.recommendedMode.id);
      setSelectedTrapLevel(null);
      setSelectedReasoningType(null);
      setSelectedSchoolLevel(null);
      setSelectedSchoolFormat(DEFAULT_QUIZ_SCHOOL_FORMAT);
      setIsSchoolCollectiveMode(true);
    },
  };
}
