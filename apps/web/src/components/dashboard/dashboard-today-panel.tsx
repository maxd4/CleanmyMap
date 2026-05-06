import Link from "next/link";
import type { DashboardTodayState } from "@/lib/dashboard/today";

type DashboardTodayPanelProps = {
  state: DashboardTodayState;
};

function tileBorderClass(label: string): string {
  if (label.includes("traiter") || label.includes("review")) {
    return "border-amber-200 bg-amber-50";
  }
  if (label.includes("action")) {
    return "border-emerald-200 bg-emerald-50";
  }
  if (label.includes("activité") || label.includes("activity")) {
    return "border-sky-200 bg-sky-50";
  }
  return "border-slate-200 bg-slate-50";
}

export function DashboardTodayPanel({ state }: DashboardTodayPanelProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
            {state.kind === "error"
              ? "Synthèse du jour"
              : state.kind === "empty"
                ? "Aujourd'hui"
                : "Aujourd'hui"}
          </p>
          <h2 className="mt-1 text-xl font-semibold cmm-text-primary">
            {state.kind === "error"
              ? "Lecture temporairement indisponible"
              : state.kind === "empty"
                ? "Pas encore d'activité sur cette fenêtre"
                : "Ce qu'il faut lire maintenant"}
          </h2>
        </div>
        {"syncedAtLabel" in state ? (
          <p className="cmm-text-caption font-semibold cmm-text-muted">
            Dernière synchro {state.syncedAtLabel}
          </p>
        ) : null}
      </div>

      {state.kind === "ready" ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[
            state.latestActivity,
            state.validation,
            state.nextAction,
          ].map((tile) => (
            <article
              key={tile.label}
              className={`rounded-2xl border px-4 py-4 ${tileBorderClass(tile.label)}`}
            >
              <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
                {tile.label}
              </p>
              <p className="mt-2 text-lg font-semibold cmm-text-primary">
                {tile.title}
              </p>
              <p className="mt-1 cmm-text-small cmm-text-secondary">
                {tile.detail}
              </p>
              <p className="mt-2 cmm-text-caption cmm-text-muted">{tile.meta}</p>
              {tile.label.includes("Next action") ||
              tile.label.includes("Prochaine action") ? (
                <Link
                  href={state.nextAction.href}
                  className="mt-3 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-primary transition hover:bg-slate-100"
                >
                  {state.nextAction.title}
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div
          className={`rounded-2xl border px-4 py-4 ${
            state.kind === "error"
              ? "border-rose-200 bg-rose-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <p
            className={`cmm-text-caption font-semibold uppercase tracking-[0.14em] ${
              state.kind === "error" ? "text-rose-700" : "text-amber-700"
            }`}
          >
            {state.kind === "error" ? "Erreur" : "Aucune activité"}
          </p>
          <p
            className={`mt-2 text-lg font-semibold ${
              state.kind === "error" ? "text-rose-900" : "cmm-text-primary"
            }`}
          >
            {state.kind === "error"
              ? state.message
              : state.message}
          </p>
          <p className="mt-1 cmm-text-small cmm-text-secondary">
            Les autres blocs du cockpit restent utilisables.
          </p>
          <Link
            href={state.nextAction.href}
            className="mt-4 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-primary transition hover:bg-slate-100"
          >
            {state.nextAction.title}
          </Link>
        </div>
      )}
    </section>
  );
}
