import type { VisionTrainingMetrics } from "@/lib/admin/vision-training-metrics";

type VisionTrainingPanelProps = {
  metrics: VisionTrainingMetrics;
};

function formatMetric(value: number | null) {
  return value === null ? "n/a" : value.toFixed(2);
}

export function VisionTrainingPanel({ metrics }: VisionTrainingPanelProps) {
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      aria-labelledby="vision-training-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
            Supervision interne
          </p>
          <h2 id="vision-training-title" className="mt-2 text-2xl font-bold cmm-text-primary">
            Entraînement vision
          </h2>
          <p className="mt-2 max-w-2xl cmm-text-small leading-6 cmm-text-secondary">
            Suivi descriptif des exemples enregistrés et des erreurs comparables.
            Ces métriques ne déterminent pas à elles seules la qualité d’un modèle.
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 cmm-text-caption font-semibold ${
            metrics.paused
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {metrics.paused ? "En pause" : "Actif"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Exemples", metrics.count.toString()],
          ["Labellisés", metrics.labelledCount.toString()],
          ["MAE", formatMetric(metrics.mae)],
          ["RMSE", formatMetric(metrics.rmse)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold cmm-text-primary">{value}</p>
          </div>
        ))}
      </div>

      {metrics.count === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 cmm-text-small cmm-text-secondary">
          Aucun exemple d’entraînement disponible.
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
            États
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3 cmm-text-small">
            {Object.entries(metrics.statusCounts).map(([status, count]) => (
              <div key={status}>
                <dt className="cmm-text-muted">{status}</dt>
                <dd className="font-semibold cmm-text-primary">{count}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
            Dernière version observée
          </p>
          <p className="mt-3 break-all text-lg font-semibold cmm-text-primary">
            {metrics.latestModelVersion ?? "n/a"}
          </p>
          <p className="mt-2 cmm-text-caption cmm-text-muted">
            La version est déterminée par la date de création la plus récente.
          </p>
        </div>
      </div>
    </section>
  );
}
