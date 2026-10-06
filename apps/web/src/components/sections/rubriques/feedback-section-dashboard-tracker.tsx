import { ArrowRight, ChevronRight } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  getStatusTone,
  localize,
  type Locale,
  type StatusFilter,
} from "./feedback-section.shared";
import type { FeedbackDashboardController } from "./use-feedback-dashboard-controller";

type FeedbackDashboardTrackerProps = Pick<
  FeedbackDashboardController,
  "statusFilter" | "setStatusFilter" | "visibleTrackerItems"
> & {
  locale: Locale;
  fr: boolean;
};

export function FeedbackSectionDashboardTracker({
  locale,
  fr,
  statusFilter,
  setStatusFilter,
  visibleTrackerItems,
}: FeedbackDashboardTrackerProps) {
  return (
    <div
      id="improvement"
      className="rounded-[2rem] border border-rose-200/70 bg-white/88 p-6 shadow-[0_24px_72px_-60px_rgba(236,72,153,0.55)] backdrop-blur-sm"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[0.9rem] font-black uppercase tracking-[0.18em] text-pink-600">
            {fr ? "Suivi des retours" : "Feedback tracking"}
          </h2>
          <p className="mt-2 text-[0.96rem] leading-[1.65] text-slate-600">
            {fr
              ? "Consultez l'état d'avancement des sujets que vous avez signalés ou suivis."
              : "Track the progress of the issues you submitted or follow."}
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          className="h-12 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
        >
          <option value="all">{fr ? "Tous les statuts" : "All statuses"}</option>
          <option value="en_cours">{fr ? "En cours" : "In progress"}</option>
          <option value="traite">{fr ? "Traité" : "Resolved"}</option>
          <option value="planifie">{fr ? "Planifié" : "Planned"}</option>
        </select>
      </div>

      <div className="mt-6 space-y-3">
        {visibleTrackerItems.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={localize(locale, item.title)}
              className="grid gap-4 rounded-[1.5rem] border border-rose-100 bg-white p-4 transition hover:border-rose-200 hover:shadow-sm md:grid-cols-[auto_minmax(0,1fr)_auto]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-pink-500">
                <Icon size={20} />
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-[0.94rem] font-bold leading-tight text-slate-950">
                  {localize(locale, item.title)}
                </h3>
                <p className="mt-1 cmm-text-caption leading-relaxed text-slate-500">
                  {localize(locale, item.category)}
                </p>
                <p className="mt-3 text-[0.96rem] leading-[1.65] text-slate-600">
                  {localize(locale, item.summary)}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2 md:items-end md:justify-center">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 cmm-text-caption font-black uppercase tracking-[0.14em] ${getStatusTone(item.statusId)}`}
                >
                  {localize(locale, item.status)}
                </span>
                <ChevronRight className="h-5 w-5 text-pink-400" />
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center">
        <CmmButton
          href="/sections/feedback#bug"
          tone="secondary"
          variant="pill"
          className="h-12 px-8 cmm-text-small font-black uppercase tracking-[0.16em] text-pink-600"
        >
          {fr ? "Voir tous mes retours" : "See all my feedback"}
          <ArrowRight size={16} />
        </CmmButton>
      </div>
    </div>
  );
}
