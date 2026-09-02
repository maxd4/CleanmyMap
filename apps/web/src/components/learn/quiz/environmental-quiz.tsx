"use client";

import { useEffect, useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";
import { buildClerkSupabaseAccessTokenProvider } from "@/lib/clerk-supabase-token";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { computeNextSRSState, createInitialSRSState, type SRSQuality, type SRSStats } from "@/lib/gamification/quiz-srs";
import { loadQuizSRSData, saveQuizSRSState } from "@/lib/services/quiz-srs-service";
import { recordQuizQuestionCorrectAnswer } from "@/lib/gamification/api";
import { recordQuizPedagogicalMetrics } from "@/lib/learning/quiz/quiz-pedagogical-metrics-client";
import {
  formatCognitiveDate,
  getQuizStateFromStats,
  summarizeQuizStates,
} from "@/lib/learning/cognitive-principles";
import {
  buildQuizDemoSessionDeck,
  buildQuizSchoolSessionDeck,
  buildQuizSessionDeck,
} from "@/lib/learning/quiz/quiz-selection-engine";
import { QuizAccessPicker } from "@/components/learn/quiz/quiz-access-picker";
import { QuizReasoningPicker } from "@/components/learn/quiz/quiz-reasoning-picker";
import { QuizSchoolPicker } from "@/components/learn/quiz/school/quiz-school-picker";
import { QuizSchoolWorkshopSession } from "@/components/learn/quiz/school/quiz-school-workshop-session";
import { QuizSessionPanel } from "@/components/learn/quiz/quiz-session-panel";
import { useQuizSessionController } from "@/components/learn/quiz/session/use-quiz-session-controller";
import { insertAdaptiveReinforcement } from "@/components/learn/quiz/quiz-adaptive";
import { getQuizReviewTarget } from "@/lib/learning/quiz/quiz-review-targets";
import { buildQuizErrorGrid } from "@/lib/learning/quiz/quiz-error-grid";
import {
  getNextReasoningType,
  type QuizReasoningType,
} from "@/lib/learning/quiz/quiz-reasoning-types";
import {
  matchesQuizAccessType,
  type QuizAccessTypeId,
} from "@/lib/learning/quiz/quiz-access-types";
import { matchesQuizTrapLevel, type QuizTrapLevelId } from "@/lib/learning/quiz/quiz-trap-levels";
import { DEFAULT_QUIZ_SCHOOL_FORMAT, type QuizSchoolFormat, type QuizSchoolLevel } from "@/lib/learning/quiz/school/quiz-school-types";
import {
  getQuizUiCopy,
} from "@/lib/learning/quiz/quiz-i18n";
import {
  buildQuizPersonalProgressSnapshot,
  mergeQuizPersonalProgress,
  readQuizPersonalProgress,
  saveQuizPersonalProgress,
  type QuizPersonalProgressState,
} from "@/lib/learning/quiz/quiz-personal-progress";
import { QUIZ_QUESTIONS } from "@/lib/learning/quiz/quiz-question-bank";
import type { QuizQuestion } from "@/lib/learning/quiz/quiz-question-contract";
import { buildQuizSessionSummary } from "@/lib/learning/quiz/quiz-session-summary";

export { QUIZ_QUESTIONS };
export type { QuizQuestion };
export type {
  QuizErrorTypeSummary,
  QuizModeRecommendation,
  QuizSessionSummary,
  QuizThemeSummary,
} from "@/lib/learning/quiz/quiz-session-types";

const QUIZ_QUESTION_IDS = QUIZ_QUESTIONS.map((question) => question.id);

export type EnvironmentalQuizProps = {
  initialAccessType?: QuizAccessTypeId | null;
  initialDemoMode?: boolean;
  initialSchoolLevel?: QuizSchoolLevel | null;
  initialSchoolFormat?: QuizSchoolFormat | null;
  /** @deprecated Kept so old callers remain type-compatible. */
  initialSchoolTrack?: string | null;
  initialCollectiveMode?: boolean;
};

export function EnvironmentalQuiz({
  initialAccessType = null,
  initialDemoMode = false,
  initialSchoolLevel = null,
  initialSchoolFormat = null,
  initialCollectiveMode = true,
}: EnvironmentalQuizProps = {}) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { locale } = useSitePreferences();
  const [srsData, setSrsData] = useState<Record<string, SRSStats>>({});
  const [personalProgress, setPersonalProgress] = useState<QuizPersonalProgressState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(initialDemoMode);
  const [selectedAccessType, setSelectedAccessType] = useState<QuizAccessTypeId | null>(initialAccessType);
  const [selectedTrapLevel, setSelectedTrapLevel] = useState<QuizTrapLevelId | null>(null);
  const [selectedReasoningType, setSelectedReasoningType] = useState<QuizReasoningType | null>(null);
  const [selectedSchoolLevel, setSelectedSchoolLevel] = useState<QuizSchoolLevel | null>(initialSchoolLevel);
  const [selectedSchoolFormat, setSelectedSchoolFormat] = useState<QuizSchoolFormat>(initialSchoolFormat ?? DEFAULT_QUIZ_SCHOOL_FORMAT);
  const [isSchoolCollectiveMode, setIsSchoolCollectiveMode] = useState(initialCollectiveMode);
  const [sessionQuestions, setSessionQuestions] = useState<QuizQuestion[]>([]);

  useEffect(() => {
    let cancelled = false;

    if (selectedAccessType === "ecole") {
      setSrsData({});
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    async function init() {
      try {
        const questionIds = QUIZ_QUESTIONS.map((q) => q.id);
        const data = await loadQuizSRSData(
          user?.id || null,
          questionIds,
          buildClerkSupabaseAccessTokenProvider(getToken),
        );
        if (cancelled) {
          return;
        }
        setSrsData(data);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [getToken, selectedAccessType, user?.id]);

  useEffect(() => {
    setPersonalProgress(readQuizPersonalProgress());
  }, []);

  const filteredQuestions = useMemo(() => {
    if (!selectedAccessType) return [];
    return buildQuizSessionDeck(QUIZ_QUESTIONS, srsData, {
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
    () =>
      selectedSchoolLevel
        ? buildQuizSchoolSessionDeck(QUIZ_QUESTIONS, selectedSchoolLevel)
        : [],
    [selectedSchoolLevel],
  );

  const eligibleQuestions = useMemo(() => {
    if (!selectedAccessType) {
      return [];
    }

    return QUIZ_QUESTIONS.filter((question) => {
      if (!matchesQuizAccessType(selectedAccessType, question)) {
        return false;
      }

      return matchesQuizTrapLevel(selectedTrapLevel, question);
    });
  }, [selectedAccessType, selectedTrapLevel]);

  const availableReasoningTypes = useMemo(() => {
    if (!selectedAccessType || selectedAccessType === "mixte") {
      return [];
    }

    return Array.from(new Set(eligibleQuestions.map((question) => question.reasoningType)));
  }, [eligibleQuestions, selectedAccessType]);

  const initialQuestions = useMemo(() => {
    if (isDemoMode) return demoQuestions;
    if (selectedAccessType === "ecole") return schoolQuestions;
    if (loading || filteredQuestions.length === 0) return [];
    return filteredQuestions;
  }, [demoQuestions, filteredQuestions, isDemoMode, loading, schoolQuestions, selectedAccessType]);

  const handleSRSUpdate = async (quality: SRSQuality, questionForUpdate?: QuizQuestion) => {
    if (isDemoMode || selectedAccessType === "ecole" || !questionForUpdate) return;

    const currentStats = srsData[questionForUpdate.id] ?? createInitialSRSState(questionForUpdate.id);
    const nextStats = computeNextSRSState(currentStats, quality);

    setSrsData((prev) => ({ ...prev, [questionForUpdate.id]: nextStats }));
    await saveQuizSRSState(
      user?.id || null,
      nextStats,
      buildClerkSupabaseAccessTokenProvider(getToken),
    );
  };

  const sessionController = useQuizSessionController({
    sessionQuestions,
    getErrorType: (item) => item.errorType ?? buildQuizErrorGrid(item).errorType,
    onResetSessionQuestions: () => setSessionQuestions([]),
    onCorrectAnswer: (answeredQuestion) => {
      if (!isDemoMode && selectedAccessType !== "ecole") {
        void recordQuizQuestionCorrectAnswer(
          answeredQuestion.pedagogicalType ?? answeredQuestion.format ?? answeredQuestion.type,
          answeredQuestion.id,
          user?.id ?? null,
        ).catch(() => undefined);
      }
    },
    onIncorrectAnswer: ({ question: answeredQuestion, questionIndex, errorCount }) => {
      setSessionQuestions((prev) =>
        insertAdaptiveReinforcement(
          prev,
          questionIndex,
          answeredQuestion,
          errorCount,
          (item) => item.reviewTarget?.href ?? getQuizReviewTarget(item.category, item.review, item.reasoningType).href,
        ),
      );
    },
    onSRSUpdate: handleSRSUpdate,
  });
  const {
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
    resetSessionState,
    resetQuestionSequence,
  } = sessionController;
  useEffect(() => {
    if (!selectedAccessType || (loading && selectedAccessType !== "ecole" && !isDemoMode) || sessionQuestions.length > 0) {
      return;
    }

    if (!isDemoMode && selectedAccessType === "ecole" && (!selectedSchoolLevel || selectedSchoolFormat === "atelier-60")) {
      return;
    }

    if (!isDemoMode && selectedAccessType !== "mixte" && selectedAccessType !== "ecole" && !selectedReasoningType) {
      return;
    }

    setSessionQuestions(initialQuestions);
    setCurrentQuestionIdx(0);
  }, [initialQuestions, isDemoMode, loading, selectedAccessType, selectedReasoningType, selectedSchoolFormat, selectedSchoolLevel, sessionQuestions.length, setCurrentQuestionIdx]);
  const quizSummary = useMemo(() => summarizeQuizStates(srsData, QUIZ_QUESTION_IDS), [srsData]);
  const currentQuestionStats = question ? srsData[question.id] : undefined;
  const currentQuestionState = useMemo(
    () => (question ? getQuizStateFromStats(currentQuestionStats) : null),
    [question, currentQuestionStats],
  );
  const nextReasoningType = useMemo(() => getNextReasoningType(selectedReasoningType), [selectedReasoningType]);
  const nextReasoningTypeQuestions = useMemo(() => {
    if (!selectedAccessType || selectedAccessType === "mixte" || !nextReasoningType) {
      return [];
    }

    return buildQuizSessionDeck(QUIZ_QUESTIONS, srsData, {
      mode: selectedAccessType,
      accessTypeId: selectedAccessType,
      trapLevel: selectedTrapLevel,
      reasoningType: nextReasoningType,
    });
  }, [nextReasoningType, selectedAccessType, selectedTrapLevel, srsData]);
  const shouldOfferMiniChallenge =
    correctStreak >= 2 && nextReasoningType !== null && nextReasoningTypeQuestions.length > 0;
  const currentQuestionReviewDate = useMemo(
    () => formatCognitiveDate(currentQuestionStats?.next_review_at ?? null, locale),
    [currentQuestionStats, locale],
  );
  const currentQuestionSeenToday = useMemo(() => {
    if (!currentQuestionStats?.last_seen_at) {
      return false;
    }
    return currentQuestionStats.last_seen_at.includes(new Date().toISOString().split("T")[0]);
  }, [currentQuestionStats]);
  const sessionSummary = useMemo(
    () =>
      buildQuizSessionSummary({
        score,
        selectedAccessType,
        sessionCompleted,
        sessionResults,
        sessionQuestions,
        questions: QUIZ_QUESTIONS,
      }),
    [score, selectedAccessType, sessionCompleted, sessionResults, sessionQuestions],
  );
  const personalProgressSnapshot = useMemo(
    () => buildQuizPersonalProgressSnapshot(personalProgress),
    [personalProgress],
  );

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
      questions: sessionQuestions,
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
      questions: Array.from(new Map(sessionQuestions.map((question) => [question.id, question])).values()).map((question) => ({
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
    personalProgress,
    isDemoMode,
    selectedAccessType,
    sessionCompleted,
    sessionErrorCounts,
    sessionQuestions,
    sessionResults,
    sessionSummary,
    persistedSessionRef,
  ]);

  const returnToAccessTypeSelection = () => {
    resetSessionState();
    setIsDemoMode(false);
    setSelectedAccessType(null);
    setSelectedTrapLevel(null);
    setSelectedReasoningType(null);
    setSelectedSchoolLevel(null);
    setSelectedSchoolFormat(DEFAULT_QUIZ_SCHOOL_FORMAT);
    setIsSchoolCollectiveMode(true);
  };

  const handleSelectAccessType = (accessType: QuizAccessTypeId) => {
    resetSessionState();
    setIsDemoMode(false);
    setSelectedAccessType(accessType);
    setSelectedTrapLevel(null);
    setSelectedReasoningType(null);
    setSelectedSchoolLevel(null);
    setSelectedSchoolFormat(DEFAULT_QUIZ_SCHOOL_FORMAT);
    setIsSchoolCollectiveMode(true);
  };

  const handleSelectTrapLevel = (trapLevel: QuizTrapLevelId | null) => {
    resetSessionState();
    setIsDemoMode(false);
    setSelectedTrapLevel(trapLevel);
    setSelectedReasoningType(null);
    setSelectedSchoolLevel(null);
    setSelectedSchoolFormat(DEFAULT_QUIZ_SCHOOL_FORMAT);
    setIsSchoolCollectiveMode(true);
  };

  const resetQuiz = () => {
    resetSessionState();
    setIsDemoMode(false);
    setSelectedAccessType(null);
    setSelectedTrapLevel(null);
    setSelectedReasoningType(null);
    setSelectedSchoolLevel(null);
    setSelectedSchoolFormat(DEFAULT_QUIZ_SCHOOL_FORMAT);
    setIsSchoolCollectiveMode(true);
  };

  const replayRecommendedMode = () => {
    if (!sessionSummary?.recommendedMode) {
      return;
    }

    resetSessionState();
    setIsDemoMode(false);
    setSelectedAccessType(sessionSummary.recommendedMode.id);
    setSelectedTrapLevel(null);
    setSelectedReasoningType(null);
    setSelectedSchoolLevel(null);
    setSelectedSchoolFormat(DEFAULT_QUIZ_SCHOOL_FORMAT);
    setIsSchoolCollectiveMode(true);
  };

  const startDemoSession = () => {
    resetSessionState();
    setIsDemoMode(true);
    setSelectedAccessType("mixte");
    setSelectedTrapLevel(null);
    setSelectedReasoningType(null);
    setSelectedSchoolLevel(null);
    setSelectedSchoolFormat(DEFAULT_QUIZ_SCHOOL_FORMAT);
    setIsSchoolCollectiveMode(true);
  };

  const handleLaunchSchoolSession = (level: QuizSchoolLevel, format: QuizSchoolFormat) => {
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

  const restartSchoolWorkshop = () => {
    setSelectedSchoolFormat("atelier-60");
  };

  const chooseSchoolFormat = () => {
    resetSessionState();
    setSelectedSchoolLevel(null);
    setSelectedSchoolFormat(DEFAULT_QUIZ_SCHOOL_FORMAT);
  };

  const handleToggleSchoolCollectiveMode = () => {
    setIsSchoolCollectiveMode((current) => !current);
  };

  const startMiniChallenge = () => {
    if (!nextReasoningType || selectedAccessType === "mixte") return;

    setSelectedReasoningType(nextReasoningType);
    resetQuestionSequence();
  };

  if (
    (selectedAccessType === "mixte" || selectedReasoningType || isDemoMode || selectedAccessType === "ecole") &&
    !question &&
    ((isDemoMode && demoQuestions.length > 0) ||
      (selectedAccessType === "ecole" && selectedSchoolFormat !== "atelier-60" && schoolQuestions.length > 0) ||
      (!isDemoMode && selectedAccessType !== "ecole" && !loading && filteredQuestions.length > 0))
  ) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <Zap className="animate-pulse text-emerald-500" size={48} />
        <p className="cmm-text-secondary font-medium italic">
          {isDemoMode
            ? getQuizUiCopy(locale, "session.loadingDemo")
            : selectedAccessType === "ecole"
              ? getQuizUiCopy(locale, "session.loadingSchool")
              : getQuizUiCopy(locale, "session.loadingAdaptive")}
        </p>
      </div>
    );
  }

  if (loading && selectedAccessType && selectedAccessType !== "ecole" && !isDemoMode) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <Zap className="animate-pulse text-emerald-500" size={48} />
        <p className="cmm-text-secondary font-medium italic">
          {getQuizUiCopy(locale, "session.loadingAdaptive")}
        </p>
      </div>
    );
  }

  if (!selectedAccessType) {
    return (
      <QuizAccessPicker
        locale={locale}
        selectedTrapLevel={selectedTrapLevel}
        personalProgress={isDemoMode ? null : personalProgressSnapshot}
        onSelectTrapLevel={handleSelectTrapLevel}
        onSelectAccessType={handleSelectAccessType}
        onStartDemoMode={startDemoSession}
      />
    );
  }

  if (selectedAccessType === "ecole" && !selectedSchoolLevel) {
    return (
      <QuizSchoolPicker
        locale={locale}
        collectiveMode={isSchoolCollectiveMode}
        onToggleCollectiveMode={handleToggleSchoolCollectiveMode}
        onLaunchSchoolSession={handleLaunchSchoolSession}
        onBackToAccessType={returnToAccessTypeSelection}
      />
    );
  }

  if (selectedAccessType === "ecole" && selectedSchoolLevel && selectedSchoolFormat === "atelier-60") {
    return (
      <QuizSchoolWorkshopSession
        locale={locale}
        level={selectedSchoolLevel}
        questions={schoolQuestions}
        onRestart={restartSchoolWorkshop}
        onChooseFormat={chooseSchoolFormat}
      />
    );
  }

  if (selectedAccessType !== "mixte" && !selectedReasoningType) {
    return (
      <QuizReasoningPicker
        locale={locale}
        quizSummary={quizSummary}
        onSelectReasoningType={setSelectedReasoningType}
        onBackToAccessType={returnToAccessTypeSelection}
        availableReasoningTypes={availableReasoningTypes}
      />
    );
  }

  if (!question) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Zap className="animate-pulse text-emerald-500" size={48} />
        <p className="font-medium italic cmm-text-secondary">
          {getQuizUiCopy(locale, "session.noQuestion")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setSelectedReasoningType(null)}
            className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-muted)] px-4 py-2 font-semibold cmm-text-primary"
          >
          {getQuizUiCopy(locale, "session.changeReasoning")}
          </button>
          <button
            onClick={returnToAccessTypeSelection}
            className="rounded-xl border border-[color:var(--border-default)] bg-white px-4 py-2 font-semibold cmm-text-primary"
          >
            {getQuizUiCopy(locale, "session.changeType")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <QuizSessionPanel
      locale={locale}
      isSchoolMode={selectedAccessType === "ecole"}
      isCollectiveMode={isSchoolCollectiveMode}
      showChoices={selectedAccessType === "ecole" ? (isSchoolCollectiveMode ? showQuestionChoices : true) : true}
      schoolTrackLabel={selectedSchoolLevel ? `${getQuizUiCopy(locale, "school.levelChip")} ${selectedSchoolLevel}` : undefined}
      question={question}
      questionIndex={currentQuestionIdx}
      totalQuestions={sessionQuestions.length}
      currentQuestionState={currentQuestionState}
      currentQuestionReviewDate={currentQuestionReviewDate}
      currentQuestionStreak={currentQuestionStats?.streak ?? 0}
      currentQuestionMasteryLevel={currentQuestionStats?.mastery_level ?? 0}
      selectedOption={selectedOption}
      selectedOptions={selectedOptions}
      showAnswer={showAnswer}
      lastCheckResult={lastCheckResult}
      score={score}
      shouldOfferMiniChallenge={shouldOfferMiniChallenge}
      nextReasoningType={nextReasoningType}
      hasReviewedToday={isDemoMode || selectedAccessType === "ecole" || currentQuestionSeenToday}
      sessionSummary={sessionSummary}
      personalProgress={isDemoMode ? null : personalProgressSnapshot}
      onSelectOption={setSelectedOption}
      onToggleOption={toggleSelectedOption}
      onCheckAnswer={checkAnswer}
      onRevealChoices={selectedAccessType === "ecole" ? revealChoices : undefined}
      onRevealAnswer={selectedAccessType === "ecole" ? revealAnswer : undefined}
      onPreviousQuestion={previousQuestion}
      onNextQuestion={nextQuestion}
      onResetQuiz={resetQuiz}
      onStartMiniChallenge={startMiniChallenge}
      onReplayRecommendedMode={replayRecommendedMode}
      onHandleSRSUpdate={handleSRSUpdate}
      isDemoMode={isDemoMode}
    />
  );
}

