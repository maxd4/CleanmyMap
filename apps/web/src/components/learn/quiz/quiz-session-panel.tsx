"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  XCircle,
  Lightbulb,
  Trophy,
  Shuffle,
  Brain,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CognitiveSignalChip } from "@/components/learn/cognitive-signal-chip";
import type {
  CognitiveQuizStateId,
  SupportedLocale,
} from "@/lib/learning/cognitive-principles";
import type { SRSQuality } from "@/lib/gamification/quiz-srs";
import type { QuizQuestion } from "@/lib/learning/quiz/quiz-question-contract";
import type { QuizSessionSummary } from "@/lib/learning/quiz/quiz-session-types";
import type { QuizReasoningType } from "@/lib/learning/quiz/quiz-reasoning-types";
import type { QuizPersonalProgressSnapshot } from "@/lib/learning/quiz/quiz-personal-progress";
import {
  getQuizLocalizedTextFallback,
  getQuizUiCopy,
} from "@/lib/learning/quiz/quiz-i18n";
import { QuizSessionPanelSummary } from "./quiz-session-panel-summary";
import { QuizSessionQuestion } from "./quiz-session-question";
import {
  buildQuizSessionPanelModel,
} from "./quiz-session-panel.model";

const INTERACTIVE_FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

type QuizSessionPanelProps = {
  locale: SupportedLocale;
  isDemoMode?: boolean;
  isSchoolMode?: boolean;
  isCollectiveMode?: boolean;
  showChoices: boolean;
  schoolTrackLabel?: string;
  schoolKeyMessages?: string[];
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  currentQuestionState: CognitiveQuizStateId | null;
  currentQuestionReviewDate: string;
  currentQuestionStreak: number;
  currentQuestionMasteryLevel: number;
  selectedOption: string;
  selectedOptions: string[];
  showAnswer: boolean;
  lastCheckResult: boolean | null;
  score: number;
  shouldOfferMiniChallenge: boolean;
  nextReasoningType: QuizReasoningType | null;
  hasReviewedToday: boolean;
  sessionSummary?: QuizSessionSummary | null;
  personalProgress?: QuizPersonalProgressSnapshot | null;
  onSelectOption: (option: string) => void;
  onToggleOption: (option: string) => void;
  onCheckAnswer: () => void;
  onRevealChoices?: () => void;
  onRevealAnswer?: () => void;
  onPreviousQuestion: () => void;
  onNextQuestion: () => void;
  onResetQuiz: () => void;
  onStartMiniChallenge: () => void;
  onReplayRecommendedMode: () => void;
  onHandleSRSUpdate: (quality: SRSQuality) => void;
};

export function QuizSessionPanel({
  locale,
  isDemoMode = false,
  isSchoolMode = false,
  isCollectiveMode = false,
  showChoices,
  schoolTrackLabel,
  schoolKeyMessages,
  question,
  questionIndex,
  totalQuestions,
  currentQuestionState,
  currentQuestionReviewDate,
  currentQuestionStreak,
  currentQuestionMasteryLevel,
  selectedOption,
  selectedOptions,
  showAnswer,
  lastCheckResult,
  score,
  shouldOfferMiniChallenge,
  nextReasoningType,
  hasReviewedToday,
  sessionSummary,
  personalProgress,
  onSelectOption,
  onToggleOption,
  onCheckAnswer,
  onRevealChoices,
  onPreviousQuestion,
  onNextQuestion,
  onResetQuiz,
  onStartMiniChallenge,
  onReplayRecommendedMode,
  onHandleSRSUpdate,
  onRevealAnswer,
}: QuizSessionPanelProps) {
  const {
    nextReasoningTypeLabel,
    questionFormatLabel,
    reviewTargetFollowUp,
    resolvedErrorType,
    errorTargetFollowUp,
    progressValue,
    answerFeedbackTitle,
    answerFeedbackBody,
    selectedOptionsLabel,
    correctOptionsLabel,
    displayOptions,
    sourceIsExternal,
    collectiveRevealLabel,
    shouldHideChoices,
  } = buildQuizSessionPanelModel({
    locale,
    question,
    questionIndex,
    selectedOptions,
    showAnswer,
    showChoices,
    isSchoolMode,
    isCollectiveMode,
    lastCheckResult,
    nextReasoningType,
  });

  if (sessionSummary) {
    return (
      <QuizSessionPanelSummary
        locale={locale}
        isSchoolMode={isSchoolMode}
        isCollectiveMode={isCollectiveMode}
        schoolTrackLabel={schoolTrackLabel}
        schoolKeyMessages={schoolKeyMessages}
        sessionSummary={sessionSummary}
        personalProgress={personalProgress}
        onResetQuiz={onResetQuiz}
        onReplayRecommendedMode={onReplayRecommendedMode}
      />
    );
  }

  return (
    <div className="space-y-8">
      {isSchoolMode ? (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-left shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 md:text-xs">
              {getQuizUiCopy(locale, "session.school.bannerLabel")}
            </p>
            {isCollectiveMode ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-800">
                {getQuizUiCopy(locale, "session.school.collectiveBadge")}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm font-medium leading-relaxed text-amber-950/90">
            {schoolTrackLabel ? `Atelier de classe: ${schoolTrackLabel}. ` : ""}
            {isCollectiveMode
              ? getQuizUiCopy(locale, "session.school.promptCollective")
              : getQuizUiCopy(locale, "session.school.promptIndividual")}
          </p>
        </div>
      ) : null}

      {isDemoMode ? (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4 text-left shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 md:text-xs">
            {getQuizUiCopy(locale, "session.demo.bannerLabel")}
          </p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-amber-950/90">
            {getQuizUiCopy(locale, "session.demo.bannerText")}
          </p>
        </div>
      ) : null}

      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          {isSchoolMode ? (
            <GraduationCap className="text-amber-600" size={32} aria-hidden="true" />
          ) : (
            <Brain className="text-violet-600" size={32} aria-hidden="true" />
          )}
          <h2 className={isSchoolMode ? "text-4xl font-black cmm-text-primary tracking-tight md:text-5xl" : "text-3xl font-black cmm-text-primary tracking-tight"}>
            {isSchoolMode
              ? getQuizUiCopy(locale, "session.school.workshopTitle")
              : getQuizUiCopy(locale, "session.adaptiveTitle")}
          </h2>
        </div>
        <p className={isSchoolMode ? "mx-auto max-w-3xl text-xl font-medium cmm-text-secondary" : "text-lg cmm-text-secondary max-w-2xl mx-auto font-medium"}>
          {isSchoolMode
            ? "Une question, un vote, une discussion, puis une réponse courte à retenir."
            : "Ce quiz utilise la répétition espacée. Les questions reviennent selon votre maîtrise."}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {isSchoolMode ? (
            <>
              <CognitiveSignalChip
                label={getQuizUiCopy(locale, "session.school.workshopTitle")}
                tone="amber"
              />
              <CognitiveSignalChip
                label={isCollectiveMode
                  ? getQuizUiCopy(locale, "session.collectiveChip")
                  : getQuizUiCopy(locale, "session.individualChip")}
                tone="violet"
              />
              <CognitiveSignalChip
                label={getQuizUiCopy(locale, "school.questionsLabel")}
                tone="cyan"
              />
            </>
          ) : (
            <>
              <CognitiveSignalChip
                label={`${getQuizUiCopy(locale, "session.streakLabel")}: ${currentQuestionStreak}`}
                tone="emerald"
              />
              <CognitiveSignalChip
                label={`${getQuizUiCopy(locale, "session.masteryLabel")}: ${currentQuestionMasteryLevel}/5`}
                tone="violet"
              />
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        <span>
          {isSchoolMode
            ? getQuizUiCopy(locale, "session.progressSchoolLabel")
            : getQuizUiCopy(locale, "session.progressSessionLabel")}
        </span>
        <span>
          {progressValue} / {totalQuestions}
        </span>
      </div>
      <div
        className="w-full overflow-hidden rounded-full bg-slate-200/50 h-1.5"
        role="progressbar"
        aria-label={getQuizUiCopy(locale, "session.progressSessionLabel")}
        aria-valuemin={0}
        aria-valuemax={totalQuestions}
        aria-valuenow={progressValue}
      >
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${(progressValue / totalQuestions) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
          className={cn(
            "relative overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white/80 shadow-2xl shadow-slate-200/50 backdrop-blur-xl",
            isSchoolMode ? "p-10 md:p-16" : "p-8 md:p-12",
          )}
        >
          <div className="pointer-events-none absolute right-0 top-0 p-8 opacity-[0.03]">
            <Brain size={200} aria-hidden="true" />
          </div>

          <QuizSessionQuestion
            locale={locale}
            isSchoolMode={isSchoolMode}
            isCollectiveMode={isCollectiveMode}
            showChoices={showChoices}
            question={question}
            questionIndex={questionIndex}
            totalQuestions={totalQuestions}
            currentQuestionState={currentQuestionState}
            currentQuestionReviewDate={currentQuestionReviewDate}
            selectedOption={selectedOption}
            selectedOptions={selectedOptions}
            showAnswer={showAnswer}
            questionFormatLabel={questionFormatLabel}
            displayOptions={displayOptions}
            sourceIsExternal={sourceIsExternal}
            collectiveRevealLabel={collectiveRevealLabel}
            shouldHideChoices={shouldHideChoices}
            onSelectOption={onSelectOption}
            onToggleOption={onToggleOption}
            onCheckAnswer={onCheckAnswer}
            onRevealChoices={onRevealChoices}
            onRevealAnswer={onRevealAnswer}
          />

          {showAnswer ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 mt-10 space-y-6"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <div
                className={cn(
                  "flex items-start gap-4 rounded-3xl border p-6 shadow-sm",
                  lastCheckResult === true
                    ? "border-emerald-100 bg-emerald-50/50"
                    : lastCheckResult === false
                      ? "border-red-100 bg-red-50/50"
                      : "border-blue-100 bg-blue-50/50",
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl p-3 text-white shadow-md",
                    lastCheckResult === true
                      ? "bg-emerald-500"
                      : lastCheckResult === false
                        ? "bg-red-500"
                        : "bg-blue-500",
                  )}
                >
                  {lastCheckResult === true ? (
                    <CheckCircle size={24} aria-hidden="true" />
                  ) : lastCheckResult === false ? (
                    <XCircle size={24} aria-hidden="true" />
                  ) : (
                    <Lightbulb size={24} aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">
                    Feedback immédiat
                  </p>
                  <p className="text-xl font-bold leading-tight cmm-text-primary">
                    {answerFeedbackTitle}
                  </p>
                  <p className="mt-1 text-sm cmm-text-secondary">{answerFeedbackBody}</p>
                  {lastCheckResult === false && resolvedErrorType ? (
                    <div className="mt-4 rounded-2xl border border-red-100 bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-700">
                        Erreur pédagogique
                      </p>
                      <p className="mt-2 text-sm font-bold text-red-950">{resolvedErrorType}</p>
                      {question.misconception ? (
                        <p className="mt-1 text-sm text-red-900/80">{question.misconception}</p>
                      ) : null}
                      {question.severity ? (
                        <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-red-700/80">
                          Gravité: {question.severity}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {lastCheckResult === false && resolvedErrorType ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                        Suite utile
                      </p>
                      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white">{errorTargetFollowUp.label}</p>
                          <p className="mt-1 text-sm text-white">{errorTargetFollowUp.reason}</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white">
                          {getQuizUiCopy(locale, "session.school.recommendedModeLabel")} : {errorTargetFollowUp.modeLabel}
                        </span>
                      </div>
                      <Link
                        href={errorTargetFollowUp.href}
                        aria-label={`${errorTargetFollowUp.label} - ${errorTargetFollowUp.reason}`}
                        className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-white/15"
                      >
                        Revoir la rubrique liée à l&apos;erreur
                        <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  ) : null}
                  {lastCheckResult === false ? (
                    <p className="mt-2 text-sm font-medium italic text-red-600">
                      Votre réponse : {question.type === "multiple-select" ? selectedOptionsLabel : selectedOption}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-6 text-sm leading-relaxed text-white shadow-xl">
                <div className="absolute right-0 top-0 p-4 opacity-5">
                  <Lightbulb size={80} aria-hidden="true" />
                </div>
                  <div className="relative z-10 space-y-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">
                        {getQuizUiCopy(locale, "session.explanationLabel")}
                      </p>
                      <p className="mt-2">
                        {getQuizLocalizedTextFallback(locale, question.localized?.explanation, question.explanation)}
                      </p>
                    </div>
                  {(question.takeaway || question.localized?.takeaway) ? (
                    <div className="rounded-2xl border border-amber-200/30 bg-amber-500/10 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
                        {getQuizUiCopy(locale, "session.school.atRetenir")}
                      </p>
                      <p className="mt-2 text-sm text-white">
                        {getQuizLocalizedTextFallback(locale, question.localized?.takeaway, question.takeaway ?? "")}
                      </p>
                    </div>
                  ) : null}
                  {(question.feedbackCorrect || question.feedbackWrong || question.localized?.feedbackCorrect || question.localized?.feedbackWrong) ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                        {getQuizUiCopy(locale, "session.feedbackLabel")}
                      </p>
                      <p className="mt-2 text-sm text-white">
                        {lastCheckResult === true
                          ? getQuizLocalizedTextFallback(
                              locale,
                              question.localized?.feedbackCorrect,
                              question.feedbackCorrect ?? "Bonne réponse : tu as retenu le bon mécanisme.",
                            )
                          : getQuizLocalizedTextFallback(
                              locale,
                              question.localized?.feedbackWrong,
                              question.feedbackWrong ?? "Erreur pédagogique : ce point mérite d'être revu.",
                            )}
                      </p>
                    </div>
                  ) : null}
                  {question.type === "multiple-select" ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                        {getQuizUiCopy(locale, "session.expectedAnswersLabel")}
                      </p>
                      <p className="mt-2 text-sm text-white">{correctOptionsLabel}</p>
                    </div>
                  ) : null}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                      {getQuizUiCopy(locale, "session.reviewTargetLabel")}
                    </p>
                    <Link
                      href={reviewTargetFollowUp.href}
                      aria-label={`${reviewTargetFollowUp.label} - ${reviewTargetFollowUp.reason}`}
                      className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-white/15"
                    >
                      {reviewTargetFollowUp.label}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                    <p className="mt-3 text-xs text-white">{reviewTargetFollowUp.reason}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white">
                        {getQuizUiCopy(locale, "session.school.recommendedModeLabel")} : {reviewTargetFollowUp.modeLabel}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white">
                        {getQuizUiCopy(locale, "session.school.revisionLabel")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

                  {shouldOfferMiniChallenge && lastCheckResult === true && nextReasoningTypeLabel ? (
                <div className="rounded-3xl border border-violet-200 bg-violet-50/60 p-6 shadow-sm">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-violet-600 md:text-xs">
                    Mini-défi
                  </p>
                  <p className="cmm-text-small cmm-text-secondary">
                    Passe au type de raisonnement {nextReasoningTypeLabel} pour varier le défi et
                    garder l&apos;élan.
                  </p>
                  <button
                    type="button"
                    onClick={onStartMiniChallenge}
                    className={`${INTERACTIVE_FOCUS_RING} mt-4 inline-flex items-center justify-center rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-700`}
                  >
                    Lancer le mini-défi
                  </button>
                </div>
              ) : null}

              {lastCheckResult === true && !hasReviewedToday ? (
                <div className="rounded-3xl border border-violet-100 bg-violet-50/50 p-6">
                  <p className="mb-4 text-center text-[11px] font-black uppercase tracking-widest text-violet-600 md:text-xs">
                    Qualité du rappel ?
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => onHandleSRSUpdate(3)}
                      className="group flex flex-col items-center gap-2 rounded-2xl border border-violet-200 bg-white p-4 shadow-sm transition-all hover:border-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:ring-offset-violet-50"
                    >
                      <div className="text-2xl transition-transform group-hover:scale-110">😅</div>
                      <span className="text-xs font-bold text-violet-900">Pas évident</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onHandleSRSUpdate(5)}
                      className="group flex flex-col items-center gap-2 rounded-2xl border border-violet-200 bg-white p-4 shadow-sm transition-all hover:border-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:ring-offset-violet-50"
                    >
                      <div className="text-2xl transition-transform group-hover:scale-110">🚀</div>
                      <span className="text-xs font-bold text-violet-900">Réponse immédiate</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {isSchoolMode ? (
                <>
                  <div className="flex flex-col gap-3 pt-4 md:flex-row">
                    <button
                      type="button"
                      onClick={onPreviousQuestion}
                      disabled={questionIndex === 0}
                      className={`${INTERACTIVE_FOCUS_RING} inline-flex flex-1 items-center justify-center rounded-[1.5rem] border border-slate-200 bg-white py-4 font-black uppercase tracking-widest text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {getQuizUiCopy(locale, "session.school.previousQuestion")}
                    </button>
                    {questionIndex < totalQuestions - 1 ? (
                      <button
                        type="button"
                        onClick={onNextQuestion}
                        className={`${INTERACTIVE_FOCUS_RING} inline-flex flex-1 items-center justify-center rounded-[1.5rem] bg-emerald-600 py-4 font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95`}
                      >
                        {getQuizUiCopy(locale, "session.school.nextQuestion")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onNextQuestion}
                        className={`${INTERACTIVE_FOCUS_RING} inline-flex flex-1 items-center justify-center rounded-[1.5rem] bg-emerald-600 py-4 font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95`}
                      >
                        {getQuizUiCopy(locale, "session.school.finishWorkshop")}
                      </button>
                    )}
                  </div>
                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={onResetQuiz}
                      className={`${INTERACTIVE_FOCUS_RING} text-xs font-black uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-800`}
                    >
                      {getQuizUiCopy(locale, "session.school.restartWorkshop")}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex gap-4 pt-4">
                  {questionIndex < totalQuestions - 1 ? (
                    <button
                      type="button"
                      onClick={onNextQuestion}
                      className={`${INTERACTIVE_FOCUS_RING} flex-1 rounded-[1.5rem] bg-emerald-600 py-4 font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95`}
                    >
                      {getQuizUiCopy(locale, "session.school.nextQuestion")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onNextQuestion}
                      className={`${INTERACTIVE_FOCUS_RING} flex-1 rounded-[1.5rem] bg-emerald-600 py-4 font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95`}
                    >
                      {getQuizUiCopy(locale, "session.viewSummary")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onResetQuiz}
                    className={`${INTERACTIVE_FOCUS_RING} rounded-2xl border border-slate-200 bg-white p-4 text-slate-400 transition-all duration-500 active:rotate-180 hover:border-slate-400 hover:text-slate-900`}
                  >
                    <Shuffle size={24} aria-hidden="true" />
                  </button>
                </div>
              )}
            </motion.div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      {score > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 p-8 text-white shadow-2xl md:p-10"
        >
          <div className="absolute -bottom-10 -right-10 rotate-12 opacity-10">
            <Trophy size={250} aria-hidden="true" />
          </div>
          <div className="relative z-10 flex flex-col items-center gap-8 md:flex-row">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 shadow-inner backdrop-blur-md">
              <Trophy size={48} aria-hidden="true" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="mb-2 text-3xl font-black tracking-tight">Progression de Maîtrise</h3>
              <p className="text-lg font-medium text-indigo-100 opacity-90">
                Vous avez consolidé {score} concept{score > 1 ? "s" : ""} aujourd&apos;hui.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-4 md:justify-start">
                <div className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                  {Math.round((score / totalQuestions) * 100)}% de réussite
                </div>
                <div className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                  SRS Actif
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
