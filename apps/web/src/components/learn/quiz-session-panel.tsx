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
import { getQuizReviewTarget } from "@/components/learn/quiz-review-targets";
import type { QuizReasoningType } from "@/components/learn/quiz-reasoning-types";

type QuizSessionPanelProps = {
  locale: SupportedLocale;
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  currentQuestionState: CognitiveQuizStateId | null;
  currentQuestionReviewDate: string;
  currentQuestionStreak: number;
  currentQuestionMasteryLevel: number;
  selectedOption: string;
  showAnswer: boolean;
  lastCheckResult: boolean | null;
  score: number;
  shouldOfferMiniChallenge: boolean;
  nextReasoningType: QuizReasoningType | null;
  hasReviewedToday: boolean;
  sessionSummary?: QuizSessionSummary | null;
  onSelectOption: (option: string) => void;
  onCheckAnswer: () => void;
  onNextQuestion: () => void;
  onResetQuiz: () => void;
  onStartMiniChallenge: () => void;
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
  question,
  questionIndex,
  totalQuestions,
  currentQuestionState,
  currentQuestionReviewDate,
  currentQuestionStreak,
  currentQuestionMasteryLevel,
  selectedOption,
  showAnswer,
  lastCheckResult,
  score,
  shouldOfferMiniChallenge,
  nextReasoningType,
  hasReviewedToday,
  sessionSummary,
  onSelectOption,
  onCheckAnswer,
  onNextQuestion,
  onResetQuiz,
  onStartMiniChallenge,
  onHandleSRSUpdate,
}: QuizSessionPanelProps) {
  const nextReasoningTypeLabel = useMemo(() => nextReasoningType, [nextReasoningType]);
  const questionFormatLabel = useMemo(() => {
    if (question.type === "flashcard") {
      return "Flashcard";
    }
    if (question.type === "true-false") {
      return "Vrai / Faux";
    }
    return "Choix Multiple";
  }, [question.type]);
  const reviewTarget = useMemo(
    () => getQuizReviewTarget(question.category, question.review),
    [question.category, question.review],
  );
  const sessionAccuracy = useMemo(() => {
    if (!sessionSummary || sessionSummary.totalAnswered === 0) {
      return 0;
    }
    return Math.round((sessionSummary.score / sessionSummary.totalAnswered) * 100);
  }, [sessionSummary]);

  if (sessionSummary) {
    const nextReviewTarget = sessionSummary.nextReviewTarget;

    return (
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="text-violet-600" size={32} />
            <h2 className="text-3xl font-black cmm-text-primary tracking-tight">Bilan de session</h2>
          </div>
          <p className="text-lg cmm-text-secondary max-w-2xl mx-auto font-medium">
            Le bilan relie vos erreurs à la bonne rubrique pour fermer la boucle d&apos;apprentissage.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Score</p>
            <p className="mt-3 text-4xl font-black text-emerald-950">
              {sessionSummary.score}/{sessionSummary.totalQuestions}
            </p>
            <p className="mt-2 text-sm font-medium text-emerald-900/80">{sessionAccuracy}% de réussite</p>
          </div>

          <div className="rounded-[2rem] border border-sky-100 bg-sky-50 p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">Thèmes réussis</p>
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
              <p className="mt-3 text-sm text-sky-900/70">Aucun thème validé entièrement pour l’instant.</p>
            )}
          </div>

          <div className="rounded-[2rem] border border-amber-100 bg-amber-50 p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">À retravailler</p>
            {sessionSummary.themesToReview.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {sessionSummary.themesToReview.map((theme) => (
                  <li key={theme.href} className="rounded-2xl border border-amber-200 bg-white p-3">
                    <p className="text-sm font-bold text-amber-950">{theme.label}</p>
                    <p className="mt-1 text-xs text-amber-900/70">
                      {theme.correct}/{theme.total} réponses justes
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-amber-900/70">Aucune reprise prioritaire.</p>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Reprise ciblée</p>
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
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                >
                  Revoir la rubrique
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : null}
              <button
                onClick={onResetQuiz}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black uppercase tracking-widest text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
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
      ? question.answer
      : lastCheckResult === true
      ? "Bonne réponse"
      : "Réponse attendue";

  const answerFeedbackBody =
    question.type === "flashcard"
      ? "La réponse attendue et la piste de révision sont affichées immédiatement."
      : lastCheckResult === true
        ? "Le corrigé rappelle pourquoi la réponse est juste et où la notion se retrouve dans Learn."
        : "Le corrigé montre la bonne réponse, explique le choix et indique où revoir la notion.";

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Brain className="text-violet-600" size={32} />
          <h2 className="text-3xl font-black cmm-text-primary tracking-tight">
            Apprentissage Adaptatif
          </h2>
        </div>
        <p className="text-lg cmm-text-secondary max-w-2xl mx-auto font-medium">
          Ce quiz utilise la répétition espacée. Les questions reviennent selon votre maîtrise.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <CognitiveSignalChip
            label={locale === "fr" ? `Série: ${currentQuestionStreak}` : `Streak: ${currentQuestionStreak}`}
            tone="emerald"
          />
          <CognitiveSignalChip
            label={
              locale === "fr"
                ? `Maîtrise: ${currentQuestionMasteryLevel}/5`
                : `Mastery: ${currentQuestionMasteryLevel}/5`
            }
            tone="violet"
          />
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-full bg-slate-200/50 h-1.5">
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          className="relative overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white/80 p-8 shadow-2xl shadow-slate-200/50 backdrop-blur-xl md:p-12"
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
              {currentQuestionState ? (
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

          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-muted)] px-4 py-3">
            <CognitiveSignalChip label="Prochaine révision" tone="default" />
            <span className="cmm-text-small cmm-text-secondary">{currentQuestionReviewDate}</span>
            <span className="ml-auto">
              <CognitiveSignalChip label="Questions mélangées" tone="cyan" />
            </span>
          </div>

          <p className="mb-6 text-xl font-bold leading-relaxed cmm-text-primary">
            {question.question}
          </p>

          {question.type === "multiple-choice" && question.options ? (
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => !showAnswer && onSelectOption(option)}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition-all",
                    selectedOption === option
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-white hover:border-slate-300",
                    showAnswer && "cursor-not-allowed opacity-60",
                  )}
                  disabled={showAnswer}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}

          {question.type === "flashcard" && !showAnswer ? (
            <div className="text-center">
              <button
                onClick={() => onSelectOption(question.answer)}
                className="rounded-xl bg-emerald-500 px-8 py-4 font-bold text-white transition-colors hover:bg-emerald-600"
              >
                Révéler la réponse
              </button>
            </div>
          ) : null}

          {question.type === "multiple-choice" && selectedOption && !showAnswer ? (
            <button
              onClick={onCheckAnswer}
              className="mt-4 w-full rounded-xl bg-emerald-500 py-3 font-bold text-white transition-colors hover:bg-emerald-600"
            >
              Vérifier ma réponse
            </button>
          ) : null}

          {showAnswer ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 mt-10 space-y-6"
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
                  {lastCheckResult === false ? (
                    <p className="mt-2 text-sm font-medium italic text-red-600">
                      Votre réponse : {selectedOption}
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
                      Pourquoi ?
                    </p>
                    <p className="mt-2">{question.explanation}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                      À revoir dans
                    </p>
                    <Link
                      href={reviewTarget.href}
                      className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-white/15"
                    >
                      {reviewTarget.label}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                    <p className="mt-3 text-xs text-white/70">
                      Reviens sur cette rubrique pour revoir le cadre, les repères utiles et les
                      bons réflexes.
                    </p>
                  </div>
                </div>
              </div>

              {shouldOfferMiniChallenge && lastCheckResult === true && nextReasoningTypeLabel ? (
                <div className="rounded-3xl border border-violet-200 bg-violet-50/60 p-6 shadow-sm">
                  <p className="mb-2 text-xs font-black uppercase tracking-widest text-violet-600">
                    Mini-défi
                  </p>
                  <p className="cmm-text-small cmm-text-secondary">
                    Passe au type de raisonnement {nextReasoningTypeLabel} pour varier le défi et
                    garder l&apos;élan.
                  </p>
                  <button
                    onClick={onStartMiniChallenge}
                    className="mt-4 inline-flex items-center justify-center rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-700"
                  >
                    Lancer le mini-défi
                  </button>
                </div>
              ) : null}

              {lastCheckResult === true && !hasReviewedToday ? (
                <div className="rounded-3xl border border-violet-100 bg-violet-50/50 p-6">
                  <p className="mb-4 text-center text-xs font-black uppercase tracking-widest text-violet-600">
                    Qualité du rappel ?
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => onHandleSRSUpdate(3)}
                      className="group flex flex-col items-center gap-2 rounded-2xl border border-violet-200 bg-white p-4 shadow-sm transition-all hover:border-violet-500"
                    >
                      <div className="text-2xl transition-transform group-hover:scale-110">😅</div>
                      <span className="text-xs font-bold text-violet-900">Pas évident</span>
                    </button>
                    <button
                      onClick={() => onHandleSRSUpdate(5)}
                      className="group flex flex-col items-center gap-2 rounded-2xl border border-violet-200 bg-white p-4 shadow-sm transition-all hover:border-violet-500"
                    >
                      <div className="text-2xl transition-transform group-hover:scale-110">🚀</div>
                      <span className="text-xs font-bold text-violet-900">Réponse immédiate</span>
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="flex gap-4 pt-4">
                {questionIndex < totalQuestions - 1 ? (
                  <button
                    onClick={onNextQuestion}
                    className="flex-1 rounded-[1.5rem] bg-emerald-600 py-4 font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95"
                  >
                    Question suivante
                  </button>
                ) : (
                  <button
                    onClick={onResetQuiz}
                    className="flex-1 rounded-[1.5rem] bg-emerald-600 py-4 font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95"
                  >
                    Terminer le cycle
                  </button>
                )}
                <button
                  onClick={onResetQuiz}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-400 transition-all duration-500 active:rotate-180 hover:border-slate-400 hover:text-slate-900"
                >
                  <Shuffle size={24} />
                </button>
              </div>
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
