"use client";

import { useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { useEnvironmentalQuizSession } from "@/components/learn/quiz/use-environmental-quiz-session";
import { EnvironmentalQuizView } from "@/components/learn/quiz/environmental-quiz-view";
import { useEnvironmentalQuizData } from "@/components/learn/quiz/use-environmental-quiz-data";
import { useEnvironmentalQuizMode } from "@/components/learn/quiz/use-environmental-quiz-mode";
import { useEnvironmentalQuizProgress } from "@/components/learn/quiz/use-environmental-quiz-progress";
import { getQuizStateFromStats, summarizeQuizStates, formatCognitiveDate } from "@/lib/learning/cognitive-principles";
import { getNextReasoningType } from "@/lib/learning/quiz/quiz-reasoning-types";
import type { QuizAccessTypeId } from "@/lib/learning/quiz/quiz-access-types";
import type { QuizSchoolFormat, QuizSchoolLevel } from "@/lib/learning/quiz/school/quiz-school-types";
import { readQuizPersonalProgress, type QuizPersonalProgressState } from "@/lib/learning/quiz/quiz-personal-progress";
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
  const [personalProgress, setPersonalProgress] = useState<QuizPersonalProgressState | null>(() => readQuizPersonalProgress());
  const mode = useEnvironmentalQuizMode({
    initialAccessType,
    initialDemoMode,
    initialSchoolLevel,
    initialSchoolFormat,
    initialCollectiveMode,
  });
  const data = useEnvironmentalQuizData({
    getToken,
    userId: user?.id ?? null,
    selectedAccessType: mode.selectedAccessType,
    selectedTrapLevel: mode.selectedTrapLevel,
    selectedReasoningType: mode.selectedReasoningType,
    selectedSchoolLevel: mode.selectedSchoolLevel,
    isDemoMode: mode.isDemoMode,
  });
  const sessionController = useEnvironmentalQuizSession({
    initialQuestions: data.initialQuestions,
    initialSessionQuestions: mode.sessionQuestions,
    isDemoMode: mode.isDemoMode,
    selectedAccessType: mode.selectedAccessType,
    userId: user?.id ?? null,
    setSessionQuestions: mode.setSessionQuestions,
    onSRSUpdate: data.handleSRSUpdate,
  });
  const {
    currentQuestionIdx, question, selectedOption, selectedOptions, showAnswer, showQuestionChoices,
    score, correctStreak, lastCheckResult, sessionResults, sessionErrorCounts, sessionCompleted,
    persistedSessionRef, setSelectedOption, toggleSelectedOption, checkAnswer, revealAnswer,
    revealChoices, nextQuestion, previousQuestion, resetSessionState, resetQuestionSequence,
  } = sessionController;
  const activeSessionQuestions = mode.sessionQuestions.length > 0 ? mode.sessionQuestions : data.initialQuestions;
  const effectiveSrsData = useMemo(() => mode.selectedAccessType === "ecole" ? {} : data.srsData, [data.srsData, mode.selectedAccessType]);
  const quizSummary = useMemo(() => summarizeQuizStates(effectiveSrsData, QUIZ_QUESTIONS.map((item) => item.id)), [effectiveSrsData]);
  const currentQuestionStats = question ? effectiveSrsData[question.id] : undefined;
  const currentQuestionState = useMemo(() => question ? getQuizStateFromStats(currentQuestionStats) : null, [currentQuestionStats, question]);
  const nextReasoningType = useMemo(() => {
    const current = mode.selectedReasoningType;
    return current ? getNextReasoningType(current) : null;
  }, [mode.selectedReasoningType]);
  const nextReasoningTypeQuestions = useMemo(() => {
    if (!mode.selectedAccessType || mode.selectedAccessType === "mixte" || !nextReasoningType) return [];
    return data.filteredQuestions.filter((item) => item.reasoningType === nextReasoningType);
  }, [data.filteredQuestions, mode.selectedAccessType, nextReasoningType]);
  const shouldOfferMiniChallenge = correctStreak >= 2 && nextReasoningType !== null && nextReasoningTypeQuestions.length > 0;
  const currentQuestionReviewDate = useMemo(() => formatCognitiveDate(currentQuestionStats?.next_review_at ?? null, locale), [currentQuestionStats, locale]);
  const currentQuestionSeenToday = useMemo(() => Boolean(currentQuestionStats?.last_seen_at?.includes(new Date().toISOString().split("T")[0])), [currentQuestionStats]);
  const sessionSummary = useMemo(() => buildQuizSessionSummary({
    score,
    selectedAccessType: mode.selectedAccessType,
    sessionCompleted,
    sessionResults,
    sessionQuestions: activeSessionQuestions,
    questions: QUIZ_QUESTIONS,
  }), [activeSessionQuestions, mode.selectedAccessType, score, sessionCompleted, sessionResults]);
  const personalProgressSnapshot = useEnvironmentalQuizProgress({
    personalProgress,
    setPersonalProgress,
    isDemoMode: mode.isDemoMode,
    selectedAccessType: mode.selectedAccessType,
    sessionCompleted,
    sessionSummary,
    activeSessionQuestions,
    sessionResults,
    sessionErrorCounts,
    persistedSessionRef,
  });
  const resetMode = () => mode.resetMode(resetSessionState);
  const handleSelectAccessType = (type: QuizAccessTypeId) => mode.handleSelectAccessType(type, resetSessionState);
  const handleSelectTrapLevel = (level: Parameters<typeof mode.handleSelectTrapLevel>[0]) => mode.handleSelectTrapLevel(level, resetSessionState);
  const handleLaunchSchoolSession = (level: QuizSchoolLevel, format: QuizSchoolFormat) => mode.handleLaunchSchoolSession(level, format, resetSessionState);
  const chooseSchoolFormat = () => mode.chooseSchoolFormat(resetSessionState);
  const startMiniChallenge = () => mode.startMiniChallenge(nextReasoningType, resetQuestionSequence);
  const replayRecommendedMode = () => mode.replayRecommendedMode(sessionSummary, resetSessionState);

  return (
    <EnvironmentalQuizView
      locale={locale}
      isDemoMode={mode.isDemoMode}
      selectedAccessType={mode.selectedAccessType}
      selectedTrapLevel={mode.selectedTrapLevel}
      selectedReasoningType={mode.selectedReasoningType}
      selectedSchoolLevel={mode.selectedSchoolLevel}
      selectedSchoolFormat={mode.selectedSchoolFormat}
      isSchoolCollectiveMode={mode.isSchoolCollectiveMode}
      loading={data.loading}
      demoQuestions={data.demoQuestions}
      schoolQuestions={data.schoolQuestions}
      filteredQuestions={data.filteredQuestions}
      availableReasoningTypes={data.availableReasoningTypes}
      quizSummary={quizSummary}
      personalProgress={personalProgressSnapshot}
      activeSessionQuestions={activeSessionQuestions}
      question={question}
      currentQuestionIdx={currentQuestionIdx}
      currentQuestionState={currentQuestionState}
      currentQuestionReviewDate={currentQuestionReviewDate}
      currentQuestionStreak={currentQuestionStats?.streak ?? 0}
      currentQuestionMasteryLevel={currentQuestionStats?.mastery_level ?? 0}
      selectedOption={selectedOption}
      selectedOptions={selectedOptions}
      showAnswer={showAnswer}
      showQuestionChoices={showQuestionChoices}
      lastCheckResult={lastCheckResult}
      score={score}
      shouldOfferMiniChallenge={shouldOfferMiniChallenge}
      nextReasoningType={nextReasoningType}
      currentQuestionSeenToday={currentQuestionSeenToday}
      sessionSummary={sessionSummary}
      onSelectOption={setSelectedOption}
      onToggleOption={toggleSelectedOption}
      onCheckAnswer={checkAnswer}
      onRevealChoices={revealChoices}
      onRevealAnswer={revealAnswer}
      onPreviousQuestion={previousQuestion}
      onNextQuestion={nextQuestion}
      onResetQuiz={resetMode}
      onStartMiniChallenge={startMiniChallenge}
      onReplayRecommendedMode={replayRecommendedMode}
      onHandleSRSUpdate={data.handleSRSUpdate}
      onSelectTrapLevel={handleSelectTrapLevel}
      onSelectAccessType={handleSelectAccessType}
      onStartDemoMode={() => mode.startDemoSession(resetSessionState)}
      onSelectReasoningType={mode.setSelectedReasoningType}
      onBackToAccessType={resetMode}
      onToggleCollectiveMode={mode.toggleCollectiveMode}
      onLaunchSchoolSession={handleLaunchSchoolSession}
      onRestartSchoolWorkshop={mode.restartSchoolWorkshop}
      onChooseSchoolFormat={chooseSchoolFormat}
    />
  );
}
