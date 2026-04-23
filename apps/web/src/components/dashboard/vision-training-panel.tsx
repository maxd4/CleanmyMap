import type { VisionTrainingMetrics } from "@/lib/actions/training";

type VisionTrainingPanelProps = {
  metrics: VisionTrainingMetrics | null;
};

function formatMetric(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  return value.toFixed(2);
}

export function VisionTrainingPanel({ metrics }: VisionTrainingPanelProps) {
  const lowData = metrics?.lowDataWarning ?? true;
  return (
    <section className="space-y-4 rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md p-5 shadow-xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Vision terrain
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          Photos de sacs, masse réelle et signaux retenus
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Le modèle apprend sur les photos des sacs collectés et la masse réelle saisie dans le formulaire, avec seulement le nombre de sacs, le remplissage et la densité en signaux facultatifs.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Exemples</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {metrics?.count ?? 0}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Labellisés</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {metrics?.labelledCount ?? 0}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">MAE</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {formatMetric(metrics?.mae ?? null)} kg
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">RMSE</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {formatMetric(metrics?.rmse ?? null)} kg
          </p>
        </article>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold">
          Version: {metrics?.latestModelVersion ?? "n/a"}
        </span>
        <span
          className={`rounded-full px-2 py-1 font-semibold ${
            lowData
              ? "bg-amber-100 text-amber-800"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {lowData ? "Dataset faible" : "Dataset suffisant"}
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-4 text-xs text-slate-600">
        <span>Pending: {metrics?.statusCounts.pending_label ?? 0}</span>
        <span>Labellisés: {metrics?.statusCounts.labelled ?? 0}</span>
        <span>À revoir: {metrics?.statusCounts.needs_review ?? 0}</span>
        <span>Sans photo: {metrics?.statusCounts.no_photo ?? 0}</span>
      </div>
    </section>
  );
}
