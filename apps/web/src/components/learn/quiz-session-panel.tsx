"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
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
import type { QuizQuestion } from "@/components/learn/environmental-quiz";

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
  nextDifficulty: QuizQuestion["difficulty"] | null;
  hasReviewedToday: boolean;
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
  nextDifficulty,
  hasReviewedToday,
  onSelectOption,
  onCheckAnswer,
  onNextQuestion,
  onResetQuiz,
  onStartMiniChallenge,
  onHandleSRSUpdate,
}: QuizSessionPanelProps) {
  const nextDifficultyLabel = useMemo(() => {
    if (!nextDifficulty) return null;
    if (nextDifficulty === "novice") return "novice";
    if (nextDifficulty === "intermédiaire") return "intermédiaire";
    return "expert";
  }, [nextDifficulty]);

  const answerFeedbackTitle =
    question.type === "flashcard"
      ? question.answer
      : lastCheckResult === true
        ? "Bonne réponse"
        : "À revoir";

  const answerFeedbackBody =
    question.type === "flashcard"
      ? "La réponse attendue est affichée immédiatement."
      : lastCheckResult === true
        ? "Le geste ou la réponse consolide la mémoire."
        : "Le rappel sera reprogrammé plus tôt.";

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
          Ce quiz utilise la répétition espacée. Les questions reviennent selon votre niveau de
          maîtrise.
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
                label={question.type === "multiple-choice" ? "Choix Multiple" : "Flashcard"}
                tone={question.type === "multiple-choice" ? "violet" : "emerald"}
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
                <p className="relative z-10">{question.explanation}</p>
              </div>

              {shouldOfferMiniChallenge && lastCheckResult === true && nextDifficultyLabel ? (
                <div className="rounded-3xl border border-violet-200 bg-violet-50/60 p-6 shadow-sm">
                  <p className="mb-2 text-xs font-black uppercase tracking-widest text-violet-600">
                    Mini-défi
                  </p>
                  <p className="cmm-text-small cmm-text-secondary">
                    Passe au niveau {nextDifficultyLabel} pour mélanger un thème voisin et garder
                    l&apos;élan.
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
                    Niveau de difficulté ?
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
                      <span className="text-xs font-bold text-violet-900">Trop facile</span>
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
