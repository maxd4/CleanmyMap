import Link from "next/link";
import { getQuizErrorFollowUp } from "@/lib/learning/quiz/quiz-error-grid";
import type { QuizErrorTypeId } from "@/lib/learning/quiz/quiz-error-grid";
import { getQuizUiCopy } from "@/lib/learning/quiz/quiz-i18n";
import type { QuizModeRecommendation, QuizSessionSummary } from "@/lib/learning/quiz/quiz-session-types";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";

type QuizSessionPanelSummaryReviewProps = {
  locale: SupportedLocale;
  sessionSummary: QuizSessionSummary;
  recommendedMode: QuizModeRecommendation | null;
  onReplayRecommendedMode: () => void;
};

export function QuizSessionPanelSummaryReview({
  locale,
  sessionSummary,
  recommendedMode,
  onReplayRecommendedMode,
}: QuizSessionPanelSummaryReviewProps) {
  return (
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
              className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700"
            >
              {getQuizUiCopy(locale, "session.replaySession")}
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-sky-900/70">Aucun mode recommandé pour l’instant.</p>
        )}
      </div>
    </div>
  );
}
