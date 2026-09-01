import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Lightbulb,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import type { QuizQuestion } from "@/lib/learning/quiz/quiz-question-contract";
import {
  getQuizLocalizedTextFallback,
  getQuizUiCopy,
} from "@/lib/learning/quiz/quiz-i18n";
import type {
  QuizErrorFollowUp,
  QuizErrorTypeId,
} from "@/lib/learning/quiz/quiz-error-grid";
import type { QuizReviewFollowUp } from "@/lib/learning/quiz/quiz-review-targets";

type QuizSessionFeedbackProps = {
  locale: SupportedLocale;
  question: QuizQuestion;
  lastCheckResult: boolean | null;
  selectedOption: string;
  answerFeedbackTitle: string;
  answerFeedbackBody: string;
  resolvedErrorType: QuizErrorTypeId;
  errorTargetFollowUp: QuizErrorFollowUp;
  selectedOptionsLabel: string;
  correctOptionsLabel: string;
  reviewTargetFollowUp: QuizReviewFollowUp;
};

export function QuizSessionFeedback({
  locale,
  question,
  lastCheckResult,
  selectedOption,
  answerFeedbackTitle,
  answerFeedbackBody,
  resolvedErrorType,
  errorTargetFollowUp,
  selectedOptionsLabel,
  correctOptionsLabel,
  reviewTargetFollowUp,
}: QuizSessionFeedbackProps) {
  return (
    <>
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
    </>
  );
}
