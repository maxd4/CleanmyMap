"use client";

import { useEffect, useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";
import { buildClerkSupabaseAccessTokenProvider } from "@/lib/clerk-supabase-token";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { computeNextSRSState, createInitialSRSState, type SRSQuality, type SRSStats } from "@/lib/gamification/quiz-srs";
import { loadQuizSRSData, saveQuizSRSState } from "@/lib/services/quiz-srs-service";
import { recordQuizQuestionCorrectAnswer } from "@/lib/gamification/api";
import {
  formatCognitiveDate,
  getQuizStateFromStats,
  summarizeQuizStates,
} from "@/lib/learning/cognitive-principles";
import { buildQuizSessionDeck } from "@/lib/learning/quiz-selection-engine";
import {
  type QuizDifficultyId,
  type QuizPedagogicalTypeId,
  type QuizSkillId,
} from "@/lib/learning/quiz-taxonomy";
import { QuizAccessPicker } from "@/components/learn/quiz-access-picker";
import { QuizReasoningPicker } from "@/components/learn/quiz-reasoning-picker";
import { QuizSessionPanel } from "@/components/learn/quiz-session-panel";
import { insertAdaptiveReinforcement } from "@/components/learn/quiz-adaptive";
import {
  getQuizReviewTarget,
  type QuizReviewTarget,
  type QuizQuestionCategory,
} from "@/components/learn/quiz-review-targets";
import { buildQuizErrorGrid, type QuizErrorSeverityId, type QuizErrorTypeId } from "@/components/learn/quiz-error-grid";
import {
  getNextReasoningType,
  type QuizReasoningType,
} from "@/components/learn/quiz-reasoning-types";
import {
  QUIZ_ACCESS_TYPES,
  matchesQuizAccessType,
  getQuizAccessType,
  type QuizAccessTypeId,
} from "@/components/learn/quiz-access-types";
import { matchesQuizTrapLevel, type QuizTrapLevelId } from "@/components/learn/quiz-trap-levels";
import type { QuizQuestionFormatId } from "@/components/learn/quiz-question-formats";
import type {
  QuizConfidenceLevel,
  QuizLocalScope,
  QuizSourceType,
} from "@/lib/learning/quiz-source-metadata";
import { QUIZ_QUESTIONS } from "@/lib/learning/quiz-question-bank";

export { QUIZ_QUESTIONS };

export interface QuizQuestion {
  id: string;
  type: "multiple-choice" | "multiple-select" | "true-false" | "flashcard";
  category: QuizQuestionCategory;
  question: string;
  answer: string | string[];
  options?: string[];
  explanation: string;
  review?: QuizReviewTarget;
  reviewTarget?: QuizReviewTarget;
  format?: QuizQuestionFormatId;
  pedagogicalType?: QuizPedagogicalTypeId;
  reasoningType: QuizReasoningType;
  skill?: QuizSkillId;
  difficulty?: QuizDifficultyId;
  trapLevel?: QuizTrapLevelId;
  errorType?: QuizErrorTypeId;
  misconception?: string;
  severity?: QuizErrorSeverityId;
  feedbackCorrect?: string;
  feedbackWrong?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  sourceType?: QuizSourceType;
  confidenceLevel?: QuizConfidenceLevel;
  isLocalRule?: boolean;
  localScope?: QuizLocalScope;
  lastCheckedAt?: string;
  needsReview?: boolean;
}

export type QuizThemeSummary = {
  label: string;
  href: string;
  total: number;
  correct: number;
  accuracy: number;
};

export type QuizErrorTypeSummary = {
  label: string;
  count: number;
};

export type QuizModeRecommendation = {
  id: QuizAccessTypeId;
  label: string;
  reason: string;
};

export type QuizSessionSummary = {
  score: number;
  totalQuestions: number;
  totalAnswered: number;
  themesSucceeded: QuizThemeSummary[];
  themesToReview: QuizThemeSummary[];
  frequentErrorTypes: QuizErrorTypeSummary[];
  recommendedMode: QuizModeRecommendation | null;
  recommendedLearningTarget: QuizReviewTarget | null;
  nextReviewTarget: QuizReviewTarget | null;
};

const QUIZ_QUESTION_IDS = QUIZ_QUESTIONS.map((question) => question.id);

export function EnvironmentalQuiz() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { locale } = useSitePreferences();
  const [srsData, setSrsData] = useState<Record<string, SRSStats>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAccessType, setSelectedAccessType] = useState<QuizAccessTypeId | null>(null);
  const [selectedTrapLevel, setSelectedTrapLevel] = useState<QuizTrapLevelId | null>(null);
  const [selectedReasoningType, setSelectedReasoningType] = useState<QuizReasoningType | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [sessionQuestions, setSessionQuestions] = useState<QuizQuestion[]>([]);
  const [selectedOption, setSelectedOption] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [lastCheckResult, setLastCheckResult] = useState<boolean | null>(null);
  const [sessionResults, setSessionResults] = useState<Record<string, boolean>>({});
  const [sessionErrorCounts, setSessionErrorCounts] = useState<Record<string, number>>({});
  const [sessionCompleted, setSessionCompleted] = useState(false);

  useEffect(() => {
    let cancelled = false;

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
  }, [getToken, user?.id]);

  const filteredQuestions = useMemo(() => {
    if (!selectedAccessType) return [];
    return buildQuizSessionDeck(QUIZ_QUESTIONS, srsData, {
      mode: selectedAccessType,
      accessTypeId: selectedAccessType,
      trapLevel: selectedTrapLevel,
      reasoningType: selectedReasoningType,
    });
  }, [selectedAccessType, selectedReasoningType, selectedTrapLevel, srsData]);

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
    if (loading || filteredQuestions.length === 0) return [];
    return filteredQuestions;
  }, [loading, filteredQuestions]);

  useEffect(() => {
    if (!selectedAccessType || loading || sessionQuestions.length > 0) {
      return;
    }

    if (selectedAccessType !== "mixte" && !selectedReasoningType) {
      return;
    }

    setSessionQuestions(initialQuestions);
    setCurrentQuestionIdx(0);
  }, [initialQuestions, loading, selectedAccessType, selectedReasoningType, sessionQuestions.length]);

  const question = sessionQuestions[currentQuestionIdx];
  const quizSummary = useMemo(() => summarizeQuizStates(srsData, QUIZ_QUESTION_IDS), [srsData]);
  const currentQuestionStats = question ? srsData[question.id] : undefined;
  const currentQuestionState = useMemo(
    () => (question ? getQuizStateFromStats(currentQuestionStats) : null),
    [question, currentQuestionStats],
  );
  const isMultipleSelectQuestion = question?.type === "multiple-select";
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
  const sessionSummary = useMemo<QuizSessionSummary | null>(() => {
    if (!sessionCompleted) {
      return null;
    }

    const answeredEntries = Object.entries(sessionResults);
    if (answeredEntries.length === 0) {
      return null;
    }

    const questionsById = new Map(QUIZ_QUESTIONS.map((item) => [item.id, item] as const));
    const groupedThemes = new Map<string, QuizThemeSummary>();
    const errorTypeCounts = new Map<QuizErrorTypeId, number>();
    const reasoningTypeCounts = new Map<QuizReasoningType, number>();

    for (const [questionId, isCorrect] of answeredEntries) {
      const answeredQuestion = questionsById.get(questionId);
      if (!answeredQuestion) {
        continue;
      }

      const reviewTarget =
        answeredQuestion.reviewTarget ??
        getQuizReviewTarget(answeredQuestion.category, answeredQuestion.review, answeredQuestion.reasoningType);
      const resolvedErrorType =
        answeredQuestion.errorType ?? buildQuizErrorGrid(answeredQuestion).errorType;
      if (!isCorrect) {
        errorTypeCounts.set(resolvedErrorType, (errorTypeCounts.get(resolvedErrorType) ?? 0) + 1);
        reasoningTypeCounts.set(
          answeredQuestion.reasoningType,
          (reasoningTypeCounts.get(answeredQuestion.reasoningType) ?? 0) + 1,
        );
      }
      const currentTheme =
        groupedThemes.get(reviewTarget.href) ??
        ({
          label: reviewTarget.label,
          href: reviewTarget.href,
          total: 0,
          correct: 0,
          accuracy: 0,
        } satisfies QuizThemeSummary);

      currentTheme.total += 1;
      if (isCorrect) {
        currentTheme.correct += 1;
      }
      currentTheme.accuracy = currentTheme.total > 0 ? currentTheme.correct / currentTheme.total : 0;
      groupedThemes.set(reviewTarget.href, currentTheme);
    }

    const themes = Array.from(groupedThemes.values());
    const themesSucceeded = themes.filter((theme) => theme.total > 0 && theme.correct === theme.total);
    const themesToReview = themes
      .filter((theme) => theme.total > 0 && theme.correct < theme.total)
      .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
    const nextReviewTarget = themesToReview[0]
      ? { label: themesToReview[0].label, href: themesToReview[0].href }
      : themesSucceeded[0]
      ? { label: themesSucceeded[0].label, href: themesSucceeded[0].href }
      : null;
    const errorTypeEntries = Array.from(errorTypeCounts.entries()).sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "fr"),
    );
    const frequentErrorTypes = errorTypeEntries
      .slice(0, 3)
      .map(([errorType, count]) => ({
        label: errorType,
        count,
      }));

    const reasoningTypeEntries = Array.from(reasoningTypeCounts.entries()).sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "fr"),
    );
    const modeScores: Array<{ accessType: (typeof QUIZ_ACCESS_TYPES)[number]; score: number }> = QUIZ_ACCESS_TYPES.filter(
      (accessType) => accessType.id !== "mixte",
    ).map((accessType) => {
      const matchedErrorCount = reasoningTypeEntries.reduce(
        (sum, [reasoningType, count]) => sum + (accessType.reasoningTypes.includes(reasoningType) ? count : 0),
        0,
      );
      return {
        accessType,
        score: matchedErrorCount,
      };
    });
    const bestMode = modeScores.sort((left, right) => right.score - left.score || left.accessType.label.localeCompare(right.accessType.label, "fr"))[0];
    const recommendedMode: QuizModeRecommendation =
      bestMode && bestMode.score > 0
        ? {
            id: bestMode.accessType.id,
            label: bestMode.accessType.label,
            reason: `Ce mode couvre le mieux tes erreurs récentes (${bestMode.score} correspondance${bestMode.score > 1 ? "s" : ""}).`,
          }
        : selectedAccessType
          ? {
              id: selectedAccessType,
              label: getQuizAccessType(selectedAccessType).label,
              reason: "Poursuis sur ce mode pour consolider la session sans changer de cadre.",
            }
          : {
            id: "mixte",
            label: getQuizAccessType("mixte").label,
            reason: "Le mode mixte reste le plus utile pour repartir sur un parcours équilibré.",
          };
    const recommendedLearningTarget = nextReviewTarget;

    return {
      score,
      totalQuestions: sessionQuestions.length,
      totalAnswered: answeredEntries.length,
      themesSucceeded,
      themesToReview,
      frequentErrorTypes,
      recommendedMode,
      recommendedLearningTarget,
      nextReviewTarget,
    };
  }, [score, selectedAccessType, sessionCompleted, sessionResults, sessionQuestions.length]);

  const handleSRSUpdate = async (quality: SRSQuality) => {
    if (!question) return;

    const currentStats = srsData[question.id] ?? createInitialSRSState(question.id);
    const nextStats = computeNextSRSState(currentStats, quality);

    setSrsData((prev) => ({ ...prev, [question.id]: nextStats }));
    await saveQuizSRSState(
      user?.id || null,
      nextStats,
      buildClerkSupabaseAccessTokenProvider(getToken),
    );
  };

  const toggleSelectedOption = (option: string) => {
    if (showAnswer || !isMultipleSelectQuestion) {
      return;
    }

    setSelectedOptions((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
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
      void recordQuizQuestionCorrectAnswer(
        question.pedagogicalType ?? question.format ?? question.type,
        question.id,
        user?.id ?? null,
      ).catch(() => undefined);
    } else {
      setCorrectStreak(0);
      const resolvedErrorType = question.errorType ?? buildQuizErrorGrid(question).errorType;
      const nextErrorCount = (sessionErrorCounts[resolvedErrorType] ?? 0) + 1;
      setSessionErrorCounts((prev) => ({
        ...prev,
        [resolvedErrorType]: nextErrorCount,
      }));
      setSessionQuestions((prev) =>
        insertAdaptiveReinforcement(
          prev,
          currentQuestionIdx,
          question,
          nextErrorCount,
          (item) => item.reviewTarget?.href ?? getQuizReviewTarget(item.category, item.review, item.reasoningType).href,
        ),
      );
      handleSRSUpdate(0);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIdx < sessionQuestions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
      setSelectedOption("");
      setSelectedOptions([]);
      setShowAnswer(false);
      setLastCheckResult(null);
      return;
    }

    setSessionCompleted(true);
  };

  const resetSessionState = () => {
    setCurrentQuestionIdx(0);
    setSelectedOption("");
    setSelectedOptions([]);
    setShowAnswer(false);
    setScore(0);
    setCorrectStreak(0);
    setLastCheckResult(null);
    setSessionResults({});
    setSessionErrorCounts({});
    setSessionQuestions([]);
    setSessionCompleted(false);
  };

  const returnToAccessTypeSelection = () => {
    resetSessionState();
    setSelectedAccessType(null);
    setSelectedTrapLevel(null);
    setSelectedReasoningType(null);
  };

  const handleSelectAccessType = (accessType: QuizAccessTypeId) => {
    resetSessionState();
    setSelectedAccessType(accessType);
    setSelectedReasoningType(null);
  };

  const handleSelectTrapLevel = (trapLevel: QuizTrapLevelId | null) => {
    resetSessionState();
    setSelectedTrapLevel(trapLevel);
    setSelectedReasoningType(null);
  };

  const resetQuiz = () => {
    resetSessionState();
    setSelectedAccessType(null);
    setSelectedTrapLevel(null);
    setSelectedReasoningType(null);
  };

  const replayRecommendedMode = () => {
    if (!sessionSummary?.recommendedMode) {
      return;
    }

    resetSessionState();
    setSelectedAccessType(sessionSummary.recommendedMode.id);
    setSelectedTrapLevel(null);
    setSelectedReasoningType(null);
  };

  const startMiniChallenge = () => {
    if (!nextReasoningType || selectedAccessType === "mixte") return;

    setSelectedReasoningType(nextReasoningType);
    setCurrentQuestionIdx(0);
    setSelectedOption("");
    setSelectedOptions([]);
    setShowAnswer(false);
    setScore(0);
    setCorrectStreak(0);
    setLastCheckResult(null);
    setSessionResults({});
    setSessionErrorCounts({});
    setSessionQuestions([]);
    setSessionCompleted(false);
  };

  if ((selectedAccessType === "mixte" || selectedReasoningType) && !question && !loading && filteredQuestions.length > 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <Zap className="animate-pulse text-emerald-500" size={48} />
        <p className="cmm-text-secondary font-medium italic">
          {locale === "fr"
            ? "Préparation de la session de raisonnement..."
            : "Preparing the reasoning session..."}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <Zap className="animate-pulse text-emerald-500" size={48} />
        <p className="cmm-text-secondary font-medium italic">
          Chargement de votre parcours adaptatif...
        </p>
      </div>
    );
  }

  if (!selectedAccessType) {
    return (
      <QuizAccessPicker
        locale={locale}
        selectedTrapLevel={selectedTrapLevel}
        onSelectTrapLevel={handleSelectTrapLevel}
        onSelectAccessType={handleSelectAccessType}
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
          {locale === "fr"
            ? "Aucune question disponible pour ce type de quiz et ce type de raisonnement."
            : "No question available for this quiz type and reasoning type."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setSelectedReasoningType(null)}
            className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-muted)] px-4 py-2 font-semibold cmm-text-primary"
          >
            {locale === "fr" ? "Changer de raisonnement" : "Change reasoning"}
          </button>
          <button
            onClick={returnToAccessTypeSelection}
            className="rounded-xl border border-[color:var(--border-default)] bg-white px-4 py-2 font-semibold cmm-text-primary"
          >
            {locale === "fr" ? "Changer de type" : "Change type"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <QuizSessionPanel
      locale={locale}
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
      hasReviewedToday={currentQuestionSeenToday}
      sessionSummary={sessionSummary}
      onSelectOption={setSelectedOption}
      onToggleOption={toggleSelectedOption}
      onCheckAnswer={checkAnswer}
      onNextQuestion={nextQuestion}
      onResetQuiz={resetQuiz}
      onStartMiniChallenge={startMiniChallenge}
      onReplayRecommendedMode={replayRecommendedMode}
      onHandleSRSUpdate={handleSRSUpdate}
    />
  );
}

