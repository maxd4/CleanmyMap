"use client";

import { useMemo } from "react";
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
import { getQuizStateLabel } from "@/lib/learning/cognitive-principles";
import type { SRSQuality } from "@/lib/gamification/quiz-srs";
import type { QuizQuestion, QuizSessionSummary } from "@/components/learn/environmental-quiz";
import { buildQuizErrorGrid, type QuizErrorTypeId } from "@/components/learn/quiz-error-grid";
import { getQuizReviewFollowUp, getQuizReviewTarget } from "@/components/learn/quiz-review-targets";
import { getQuizErrorFollowUp } from "@/components/learn/quiz-error-grid";
import type { QuizReasoningType } from "@/components/learn/quiz-reasoning-types";
import {
  QuizPersonalProgressOverview,
} from "@/components/learn/quiz-personal-progress-overview";
import type { QuizPersonalProgressSnapshot } from "@/lib/learning/quiz-personal-progress";
import {
  getQuizLocalizedTextFallback,
  getQuizLocalizedTextListFallback,
  getQuizUiCopy,
} from "@/lib/learning/quiz-i18n";

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

const STATE_TONES: Record<CognitiveQuizStateId, "cyan" | "amber" | "violet" | "emerald"> = {
  new: "cyan",
  failed: "amber",
  due: "violet",
  mastered: "emerald",
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
  const nextReasoningTypeLabel = useMemo(() => nextReasoningType, [nextReasoningType]);
  const questionFormatLabel = useMemo(() => {
    if (question.type === "flashcard") {
      return "Flashcard";
    }
    if (question.type === "true-false") {
      return "Vrai / Faux";
    }
    if (question.type === "multiple-select") {
      return "Cases à cocher";
    }
    return "Choix Multiple";
  }, [question.type]);
  const reviewTarget = useMemo(
    () => question.reviewTarget ?? getQuizReviewTarget(question.category, question.review, question.reasoningType),
    [question.category, question.reasoningType, question.review, question.reviewTarget],
  );
  const reviewTargetFollowUp = useMemo(() => getQuizReviewFollowUp(reviewTarget), [reviewTarget]);
  const resolvedErrorType = useMemo(
    () => question.errorType ?? buildQuizErrorGrid(question).errorType,
    [question],
  );
  const sessionAccuracy = useMemo(() => {
    if (!sessionSummary || sessionSummary.totalAnswered === 0) {
      return 0;
    }
    return Math.round((sessionSummary.score / sessionSummary.totalAnswered) * 100);
  }, [sessionSummary]);
  const progressValue = questionIndex + 1;

  if (sessionSummary) {
    const nextReviewTarget = sessionSummary.recommendedLearningTarget ?? sessionSummary.nextReviewTarget;
    const recommendedMode = sessionSummary.recommendedMode;
    const schoolNotionLabels = Array.from(
      new Map([...sessionSummary.themesSucceeded, ...sessionSummary.themesToReview].map((theme) => [theme.href, theme] as const)).values(),
    ).map((theme) => theme.label);
    const fallbackSchoolMessages = [
      "On vote d'abord, puis on explique.",
      "La réponse se discute avant d'être révélée.",
      "Le bon réflexe dépend souvent du contexte.",
    ];
    const resolvedSchoolMessages = schoolKeyMessages && schoolKeyMessages.length > 0 ? schoolKeyMessages : fallbackSchoolMessages;

    if (isSchoolMode) {
      return (
        <div className="space-y-8">
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
              {schoolTrackLabel
                ? `Atelier de classe: ${schoolTrackLabel}.`
                : getQuizUiCopy(locale, "session.school.progressText")}
            </p>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <div className="rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 text-sm font-semibold text-amber-950">
                {getQuizUiCopy(locale, "session.school.animationStepReflection")}
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 text-sm font-semibold text-amber-950">
                {getQuizUiCopy(locale, "session.school.animationStepVote")}
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 text-sm font-semibold text-amber-950">
                {getQuizUiCopy(locale, "session.school.animationStepReveal")}
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <GraduationCap className="text-amber-600" size={32} />
              <h2 className="text-3xl font-black cmm-text-primary tracking-tight">
                {getQuizUiCopy(locale, "session.schoolTitle")}
              </h2>
            </div>
            <p className="mx-auto max-w-2xl text-lg font-medium cmm-text-secondary">
              {getQuizUiCopy(locale, "session.schoolSubtitle")}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700 md:text-xs">
                {getQuizUiCopy(locale, "session.school.scoreLabel")}
              </p>
              <p className="mt-3 text-4xl font-black text-emerald-950">
                {sessionSummary.score}/{sessionSummary.totalQuestions}
              </p>
              <p className="mt-2 text-sm font-medium text-emerald-900/80">{sessionAccuracy}% de réussite</p>
            </div>

            <div className="rounded-[2rem] border border-sky-100 bg-sky-50 p-6 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700 md:text-xs">
                {getQuizUiCopy(locale, "session.school.notionsLabel")}
              </p>
              {schoolNotionLabels.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm font-medium text-sky-950">
                  {schoolNotionLabels.map((label) => (
                    <li key={label} className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden="true" />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-sky-900/70">Aucune notion à afficher pour l’instant.</p>
              )}
            </div>

            <div className="rounded-[2rem] border border-violet-100 bg-violet-50 p-6 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-700 md:text-xs">
                {getQuizUiCopy(locale, "session.school.errorsLabel")}
              </p>
              {sessionSummary.frequentErrorTypes.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm font-medium text-violet-950">
                  {sessionSummary.frequentErrorTypes.map((item) => (
                    <li key={item.label} className="flex items-start gap-2">
                      <XCircle className="mt-0.5 h-4 w-4 text-violet-600" aria-hidden="true" />
                      <span>
                        {item.label}
                        <span className="ml-2 text-xs text-violet-900/70">x{item.count}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-violet-900/70">Aucune erreur fréquente à signaler.</p>
              )}
            </div>

            <div className="rounded-[2rem] border border-amber-100 bg-amber-50 p-6 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 md:text-xs">
                {getQuizUiCopy(locale, "session.school.messagesLabel")}
              </p>
              <ul className="mt-3 space-y-2 text-sm font-medium text-amber-950">
                {resolvedSchoolMessages.slice(0, 3).map((message) => (
                  <li key={message} className="flex items-start gap-2">
                    <Lightbulb className="mt-0.5 h-4 w-4 text-amber-600" aria-hidden="true" />
                    <span>{message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onResetQuiz}
              className="inline-flex items-center justify-center rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50"
            >
              {getQuizUiCopy(locale, "session.school.restartWorkshop")}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
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
            <Trophy className="text-violet-600" size={32} />
            <h2 className="text-3xl font-black cmm-text-primary tracking-tight">
              {getQuizUiCopy(locale, "session.sessionTitle")}
            </h2>
          </div>
          <p className="text-lg cmm-text-secondary max-w-2xl mx-auto font-medium">
            Le bilan relie vos erreurs à la bonne rubrique pour fermer la boucle d&apos;apprentissage.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700 md:text-xs">
              {getQuizUiCopy(locale, "session.school.scoreLabel")}
            </p>
            <p className="mt-3 text-4xl font-black text-emerald-950">
              {sessionSummary.score}/{sessionSummary.totalQuestions}
            </p>
            <p className="mt-2 text-sm font-medium text-emerald-900/80">{sessionAccuracy}% de réussite</p>
          </div>

          <div className="rounded-[2rem] border border-sky-100 bg-sky-50 p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700 md:text-xs">
              {getQuizUiCopy(locale, "session.modeToReplayLabel")}
            </p>
            {sessionSummary.themesSucceeded.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm font-medium text-sky-950">
                {sessionSummary.themesSucceeded.map((theme) => (
                  <li key={theme.href} className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden="true" />
                    <span>{theme.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-sky-900/70">Aucune compétence totalement maîtrisée pour l’instant.</p>
            )}
          </div>

            <div className="rounded-[2rem] border border-amber-100 bg-amber-50 p-6 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 md:text-xs">
                {getQuizUiCopy(locale, "session.school.skillsToReviewLabel")}
              </p>
            {sessionSummary.themesToReview.length > 0 ? (
              <div className="mt-3 space-y-3">
                {sessionSummary.themesToReview.map((theme) => {
                  const followUp = getQuizReviewFollowUp(theme);

                  return (
                    <div key={theme.href} className="rounded-2xl border border-amber-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-amber-950">{theme.label}</p>
                          <p className="mt-1 text-xs text-amber-900/70">
                            {theme.correct}/{theme.total} réponses justes
                          </p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                          {getQuizUiCopy(locale, "session.school.revisionLabel")}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-700">{followUp.reason}</p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">
                          {getQuizUiCopy(locale, "session.school.recommendedModeLabel")} : {followUp.modeLabel}
                        </span>
                        <Link
                          href={theme.href}
                          className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-amber-900 transition hover:border-amber-300 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50"
                        >
                          {getQuizUiCopy(locale, "session.school.revisionLabel")}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-amber-900/70">
                {getQuizUiCopy(locale, "session.school.revisionLabel")}
              </p>
            )}
          </div>
        </div>

        {personalProgress ? (
          <QuizPersonalProgressOverview locale={locale} snapshot={personalProgress} />
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-violet-100 bg-violet-50 p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-700 md:text-xs">
              {getQuizUiCopy(locale, "session.errorTypesLabel")}
            </p>
            {sessionSummary.frequentErrorTypes.length > 0 ? (
              <div className="mt-4 space-y-3">
                {sessionSummary.frequentErrorTypes.map((item) => {
                  const followUp = getQuizErrorFollowUp(item.label as QuizErrorTypeId);

                  return (
                    <div key={item.label} className="rounded-2xl border border-violet-100 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-violet-950">{item.label}</p>
                          <p className="mt-1 text-xs text-violet-900/70">
                            {item.count} occurrence{item.count > 1 ? "s" : ""}
                          </p>
                        </div>
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-700">
                          {getQuizUiCopy(locale, "session.school.revisionLabel")}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-700">{followUp.reason}</p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">
                          {getQuizUiCopy(locale, "session.school.recommendedModeLabel")} : {followUp.modeLabel}
                        </span>
                        <Link
                          href={followUp.href}
                          className="inline-flex items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-violet-900 transition hover:border-violet-300 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:ring-offset-violet-50"
                        >
                          {getQuizUiCopy(locale, "session.school.revisionLabel")}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-violet-900/70">
                {getQuizUiCopy(locale, "session.errorTypesLabel")}
              </p>
            )}
          </div>

          <div className="rounded-[2rem] border border-sky-100 bg-sky-50 p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700 md:text-xs">
              {getQuizUiCopy(locale, "session.school.masteredSkillsLabel")}
            </p>
            {recommendedMode ? (
              <div className="mt-3 space-y-4">
                <div>
                  <p className="text-2xl font-black text-sky-950">{recommendedMode.label}</p>
                  <p className="mt-2 text-sm text-sky-900/80">{recommendedMode.reason}</p>
                </div>
                <button
                  type="button"
                  onClick={onReplayRecommendedMode}
                  className={`${INTERACTIVE_FOCUS_RING} inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700`}
                >
                  {getQuizUiCopy(locale, "session.replaySession")}
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-sky-900/70">Aucun mode recommandé pour l’instant.</p>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 md:text-xs">Reprise ciblée</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight cmm-text-primary">
                {nextReviewTarget ? nextReviewTarget.label : "Reprendre la session"}
              </h3>
              <p className="mt-2 text-sm cmm-text-secondary">
                {nextReviewTarget
                  ? "Repars sur la rubrique la plus fragile pour consolider la notion là où l’erreur est apparue."
                  : "Recommence la session pour refaire un cycle complet."}
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              {nextReviewTarget ? (
                <Link
                  href={nextReviewTarget.href}
                  className={`${INTERACTIVE_FOCUS_RING} inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700`}
                >
                  Revoir la rubrique d&apos;apprentissage
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : null}
              <button
                type="button"
                onClick={onResetQuiz}
                className={`${INTERACTIVE_FOCUS_RING} inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black uppercase tracking-widest text-slate-700 transition hover:border-slate-300 hover:bg-slate-100`}
              >
                Recommencer
              </button>
            </div>
          </div>
        </div>

        {nextReviewTarget ? (
          <p className="text-center text-sm cmm-text-secondary">
            La reprise ciblée t&apos;envoie directement vers <span className="font-bold">{nextReviewTarget.label}</span>.
          </p>
        ) : null}
      </div>
    );
  }

  const answerFeedbackTitle =
    question.type === "flashcard"
      ? Array.isArray(question.answer)
        ? question.answer.join(", ")
        : question.answer
      : lastCheckResult === true
        ? question.type === "multiple-select"
          ? "Bonne combinaison"
          : "Réponse correcte"
        : lastCheckResult === false
          ? "Réponse incorrecte"
          : "Réponse attendue";

  const answerFeedbackBody =
    question.type === "flashcard"
      ? "La réponse attendue et la piste de révision sont affichées immédiatement."
      : lastCheckResult === true
        ? question.feedbackCorrect ?? "Bonne réponse : tu as appliqué le bon mécanisme."
        : question.type === "multiple-select"
          ? question.feedbackWrong ?? "Erreur pédagogique : le corrigé montre les cases attendues et les exclusions utiles."
          : question.feedbackWrong ?? "Erreur pédagogique : le corrigé explique pourquoi la réponse attendue est la bonne.";

  const selectedOptionsLabel = selectedOptions.join(", ");
  const correctOptionsLabel = Array.isArray(question.answer) ? question.answer.join(", ") : question.answer;
  const displayOptions = getQuizLocalizedTextListFallback(locale, question.localized?.options, question.options ?? []);
  const sourceIsExternal = Boolean(question.sourceUrl?.startsWith("http"));
  const collectiveRevealLabel =
    isSchoolMode && isCollectiveMode
      ? getQuizUiCopy(locale, "session.school.revealAnswer")
      : getQuizUiCopy(locale, "session.checkAnswer");
  const shouldHideChoices = isSchoolMode && isCollectiveMode && !showChoices && !showAnswer;

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
            <GraduationCap className="text-amber-600" size={32} />
          ) : (
            <Brain className="text-violet-600" size={32} />
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
            <Brain size={200} />
          </div>

          <div className="relative z-10 mb-8 flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <CognitiveSignalChip
                label={questionFormatLabel}
                tone={question.type === "flashcard" ? "emerald" : "violet"}
              />
              <CognitiveSignalChip label={question.category} tone="default" />
              {isSchoolMode ? (
                <CognitiveSignalChip
                  label={isCollectiveMode
                    ? getQuizUiCopy(locale, "session.collectiveChip")
                    : getQuizUiCopy(locale, "session.individualChip")}
                  tone="amber"
                />
              ) : currentQuestionState ? (
                <CognitiveSignalChip
                  label={getQuizStateLabel(currentQuestionState, locale)}
                  tone={STATE_TONES[currentQuestionState]}
                />
              ) : null}
            </div>

            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
              <span className="font-black text-slate-900">{questionIndex + 1}</span>
              <span className="opacity-30">/</span>
              <span>{totalQuestions}</span>
            </div>
          </div>

          {isSchoolMode ? (
            <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-muted)] px-4 py-3">
              <CognitiveSignalChip label={isCollectiveMode ? "Vote collectif" : "Travail individuel"} tone="amber" />
              <span className="cmm-text-small cmm-text-secondary">
                {isCollectiveMode
                  ? shouldHideChoices
                    ? "Les réponses restent masquées jusqu’à l’affichage collectif."
                    : "Votez puis révélez la bonne réponse après discussion."
                  : "Répondez puis révélez la correction immédiatement."}
              </span>
            </div>
          ) : (
            <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-muted)] px-4 py-3">
              <CognitiveSignalChip label="Prochaine révision" tone="default" />
              <span className="cmm-text-small cmm-text-secondary">{currentQuestionReviewDate}</span>
              <span className="ml-auto">
                <CognitiveSignalChip label="Questions mélangées" tone="cyan" />
              </span>
            </div>
          )}

          <p className={cn("mb-6 font-bold leading-relaxed text-slate-950", isSchoolMode ? "text-2xl md:text-3xl" : "text-xl")}>
            {getQuizLocalizedTextFallback(locale, question.localized?.question, question.question)}
          </p>

          {(question.sourceLabel || question.localized?.sourceLabel) ? (
            <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-900">
              <span className="font-black uppercase tracking-[0.18em] text-sky-700">
                {getQuizUiCopy(locale, "session.sourceLabel")}
              </span>
              {sourceIsExternal && question.sourceUrl ? (
                <a
                  href={question.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-bold text-sky-950 underline decoration-sky-300 underline-offset-2"
                >
                  {getQuizLocalizedTextFallback(locale, question.localized?.sourceLabel, question.sourceLabel ?? "")}
                </a>
              ) : (
                <span className="font-bold text-sky-950">
                  {getQuizLocalizedTextFallback(locale, question.localized?.sourceLabel, question.sourceLabel ?? "")}
                </span>
              )}
              <span className="rounded-full bg-white px-2 py-1 font-black uppercase tracking-[0.14em] text-sky-700">
                {question.sourceType}
              </span>
              <span className="rounded-full bg-white px-2 py-1 font-black uppercase tracking-[0.14em] text-sky-700">
                {question.confidenceLevel}
              </span>
              {question.isLocalRule ? (
                <span className="rounded-full bg-white px-2 py-1 font-black uppercase tracking-[0.14em] text-amber-700">
                  {getQuizUiCopy(locale, "session.localRuleLabel")} {question.localScope}
                </span>
              ) : null}
              {question.needsReview ? (
                <span className="rounded-full bg-white px-2 py-1 font-black uppercase tracking-[0.14em] text-rose-700">
                  {getQuizUiCopy(locale, "session.reviewedLabel")}
                </span>
              ) : null}
              {question.lastCheckedAt ? (
                <span className="ml-auto text-sky-900/70">
                  {getQuizUiCopy(locale, "session.reviewedAtLabel")} {question.lastCheckedAt}
                </span>
              ) : null}
            </div>
          ) : null}

          {shouldHideChoices ? (
            <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm md:p-6">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 md:text-xs">
                {getQuizUiCopy(locale, "session.hiddenChoicesLabel")}
              </p>
              <p className="mt-2 text-lg font-semibold leading-relaxed text-amber-950">
                {getQuizUiCopy(locale, "session.school.promptHidden")}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {onRevealChoices && question.type !== "flashcard" ? (
                  <button
                    type="button"
                    onClick={onRevealChoices}
                    className={`${INTERACTIVE_FOCUS_RING} inline-flex items-center justify-center rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-amber-700`}
                  >
                    {getQuizUiCopy(locale, "session.school.revealChoices")}
                  </button>
                ) : null}
                {onRevealAnswer ? (
                  <button
                    type="button"
                    onClick={onRevealAnswer}
                    className={`${INTERACTIVE_FOCUS_RING} inline-flex items-center justify-center rounded-2xl border border-amber-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-widest text-amber-900 transition hover:border-amber-300 hover:bg-amber-100`}
                  >
                    {getQuizUiCopy(locale, "session.school.revealAnswer")}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {(question.type === "multiple-choice" || question.type === "multiple-select" || question.type === "true-false") && displayOptions.length > 0 ? (
            <div className="space-y-3">
              {displayOptions.map((option, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() =>
                    !showAnswer &&
                    (question.type === "multiple-select" ? onToggleOption(option) : onSelectOption(option))
                  }
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                    isSchoolMode ? "min-h-16 px-5 py-5 text-lg" : "p-4",
                    question.type === "multiple-select" && selectedOptions.includes(option)
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : selectedOption === option
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-white hover:border-slate-300",
                    showAnswer && "cursor-not-allowed opacity-60",
                  )}
                  disabled={showAnswer}
                  aria-pressed={question.type === "multiple-select" ? selectedOptions.includes(option) : selectedOption === option}
                >
                  {question.type === "multiple-select" ? (
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-black transition",
                        selectedOptions.includes(option)
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-300 bg-white text-transparent",
                      )}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  ) : null}
                  <span>{option}</span>
                </button>
              ))}
            </div>
          ) : null}

          {isSchoolMode && isCollectiveMode && showChoices && !showAnswer ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              {getQuizUiCopy(locale, "session.school.promptCollective")}
            </div>
          ) : null}

          {question.type === "flashcard" && !showAnswer && !shouldHideChoices ? (
            <div className="text-center">
              <button
                type="button"
                onClick={() =>
                  onSelectOption(Array.isArray(question.answer) ? question.answer.join(", ") : question.answer)
                }
                className={`${INTERACTIVE_FOCUS_RING} rounded-xl bg-emerald-500 px-8 py-4 font-bold text-white transition-colors hover:bg-emerald-600`}
              >
                {getQuizUiCopy(locale, "session.school.revealAnswer")}
              </button>
            </div>
          ) : null}

          {question.type === "multiple-choice" && selectedOption && !showAnswer ? (
            <button
              type="button"
              onClick={isSchoolMode && isCollectiveMode && onRevealAnswer ? onRevealAnswer : onCheckAnswer}
              className={`${INTERACTIVE_FOCUS_RING} mt-4 w-full rounded-xl bg-emerald-500 py-4 font-bold text-white transition-colors hover:bg-emerald-600 md:py-5`}
            >
              {collectiveRevealLabel}
            </button>
          ) : null}

          {question.type === "multiple-select" && selectedOptions.length > 0 && !showAnswer ? (
            <button
              type="button"
              onClick={isSchoolMode && isCollectiveMode && onRevealAnswer ? onRevealAnswer : onCheckAnswer}
              className={`${INTERACTIVE_FOCUS_RING} mt-4 w-full rounded-xl bg-emerald-500 py-4 font-bold text-white transition-colors hover:bg-emerald-600 md:py-5`}
            >
              {collectiveRevealLabel}
            </button>
          ) : null}

          {isSchoolMode && isCollectiveMode && !showAnswer && !selectedOption && selectedOptions.length === 0 && onRevealAnswer ? (
            <button
              type="button"
              onClick={onRevealAnswer}
              className={`${INTERACTIVE_FOCUS_RING} mt-4 w-full rounded-xl border border-amber-200 bg-amber-50 py-4 font-bold text-amber-900 transition-colors hover:border-amber-300 hover:bg-amber-100 md:py-5`}
            >
              {getQuizUiCopy(locale, "session.school.revealAnswer")}
            </button>
          ) : null}

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
                    <CheckCircle size={24} />
                  ) : lastCheckResult === false ? (
                    <XCircle size={24} />
                  ) : (
                    <Lightbulb size={24} />
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
                  {lastCheckResult === false ? (
                    <p className="mt-2 text-sm font-medium italic text-red-600">
                      Votre réponse : {question.type === "multiple-select" ? selectedOptionsLabel : selectedOption}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-6 text-sm leading-relaxed text-white/90 shadow-xl">
                <div className="absolute right-0 top-0 p-4 opacity-5">
                  <Lightbulb size={80} />
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
                      <p className="mt-2 text-sm text-white/90">
                        {getQuizLocalizedTextFallback(locale, question.localized?.takeaway, question.takeaway ?? "")}
                      </p>
                    </div>
                  ) : null}
                  {(question.feedbackCorrect || question.feedbackWrong || question.localized?.feedbackCorrect || question.localized?.feedbackWrong) ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                        {getQuizUiCopy(locale, "session.feedbackLabel")}
                      </p>
                      <p className="mt-2 text-sm text-white/85">
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
                      <p className="mt-2 text-sm text-white/85">{correctOptionsLabel}</p>
                    </div>
                  ) : null}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                      {getQuizUiCopy(locale, "session.reviewTargetLabel")}
                    </p>
                    <Link
                      href={reviewTargetFollowUp.href}
                      className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-white/15"
                    >
                      {reviewTargetFollowUp.label}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                    <p className="mt-3 text-xs text-white/70">{reviewTargetFollowUp.reason}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white/85">
                        {getQuizUiCopy(locale, "session.school.recommendedModeLabel")} : {reviewTargetFollowUp.modeLabel}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white/70">
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
                        onClick={onResetQuiz}
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
                      onClick={onResetQuiz}
                      className={`${INTERACTIVE_FOCUS_RING} flex-1 rounded-[1.5rem] bg-emerald-600 py-4 font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95`}
                    >
                      {getQuizUiCopy(locale, "session.replaySession")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onResetQuiz}
                    className={`${INTERACTIVE_FOCUS_RING} rounded-2xl border border-slate-200 bg-white p-4 text-slate-400 transition-all duration-500 active:rotate-180 hover:border-slate-400 hover:text-slate-900`}
                  >
                    <Shuffle size={24} />
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
            <Trophy size={250} />
          </div>
          <div className="relative z-10 flex flex-col items-center gap-8 md:flex-row">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 shadow-inner backdrop-blur-md">
              <Trophy size={48} />
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
