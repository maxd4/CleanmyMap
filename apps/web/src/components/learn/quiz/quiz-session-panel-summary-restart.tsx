import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { QuizReviewTarget } from "@/lib/learning/quiz/quiz-review-targets";

type QuizSessionPanelSummaryRestartProps = {
  nextReviewTarget: QuizReviewTarget | null;
  onResetQuiz: () => void;
};

export function QuizSessionPanelSummaryRestart({
  nextReviewTarget,
  onResetQuiz,
}: QuizSessionPanelSummaryRestartProps) {
  return (
    <>
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
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
              >
                Revoir la rubrique d&apos;apprentissage
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ) : null}
            <button
              type="button"
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
    </>
  );
}
