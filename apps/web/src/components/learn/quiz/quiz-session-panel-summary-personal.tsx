import Link from "next/link";
import { CheckCircle, Trophy } from "lucide-react";
import { getQuizReviewFollowUp } from "@/lib/learning/quiz/quiz-review-targets";
import { getQuizUiCopy } from "@/lib/learning/quiz/quiz-i18n";
import type { QuizSessionSummary } from "@/lib/learning/quiz/quiz-session-types";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import type { ReactNode } from "react";

type QuizSessionPanelSummaryPersonalProps = {
  locale: SupportedLocale;
  sessionSummary: QuizSessionSummary;
  sessionAccuracy: number;
  personalProgressView: ReactNode;
};

export function QuizSessionPanelSummaryPersonal({
  locale,
  sessionSummary,
  sessionAccuracy,
  personalProgressView,
}: QuizSessionPanelSummaryPersonalProps) {
  return (
    <>
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Trophy className="text-violet-600" size={32} aria-hidden="true" />
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

      {personalProgressView}
    </>
  );
}
