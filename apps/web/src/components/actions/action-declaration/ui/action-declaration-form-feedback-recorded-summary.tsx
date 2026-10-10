import type { PostActionSummary } from "@/lib/actions/post-action-summary";
import { formatBusinessDurationMinutes } from "@/lib/actions/time-contract";
import { formatScorePercent } from "@/lib/formatters/score";

type ActionDeclarationFormFeedbackRecordedSummaryProps = {
  summary: PostActionSummary;
};

function formatMeasuredValue(value: number | null | undefined, unit = ""): string {
  if (value === null || value === undefined) {
    return "Non mesuré";
  }
  return `${value}${unit}`;
}

export function ActionDeclarationFormFeedbackRecordedSummary({
  summary,
}: ActionDeclarationFormFeedbackRecordedSummaryProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-emerald-200/70 bg-white/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-emerald-700">
            Données enregistrées · confirmation exploitable
          </p>
          <p className="mt-1 text-sm font-bold text-emerald-950">
            {summary.action.locationLabel} · {summary.action.actionDate}
          </p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-[#ECF8EF] px-2.5 py-1 cmm-text-caption font-bold uppercase tracking-[0.14em] text-emerald-900">
          {summary.impactStatus === "validated"
            ? "Données validées"
            : "En attente de validation"}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-emerald-100 bg-[#F3FBF6] p-3">
          <p className="cmm-text-caption font-bold uppercase tracking-[0.12em] text-emerald-700">Déchets</p>
          <p className="mt-1 text-lg font-black text-emerald-950">{formatMeasuredValue(summary.action.wasteKg, " kg")}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-[#F3FBF6] p-3">
          <p className="cmm-text-caption font-bold uppercase tracking-[0.12em] text-emerald-700">Mégots</p>
          <p className="mt-1 text-lg font-black text-emerald-950">{formatMeasuredValue(summary.action.cigaretteButts)}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-[#F3FBF6] p-3">
          <p className="cmm-text-caption font-bold uppercase tracking-[0.12em] text-emerald-700">Bénévoles</p>
          <p className="mt-1 text-lg font-black text-emerald-950">{summary.action.volunteersCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-[#F3FBF6] p-3">
          <p className="cmm-text-caption font-bold uppercase tracking-[0.12em] text-emerald-700">Durée</p>
          <p className="mt-1 text-lg font-black text-emerald-950">
            {summary.action.durationMinutes === null
              ? "Non mesuré"
              : formatBusinessDurationMinutes(summary.action.durationMinutes)}
          </p>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-800">Résumé de l&apos;impact</p>
          <span className="cmm-text-small font-semibold text-emerald-900/70">
            Confiance des données: {formatScorePercent(summary.quality.score)} ({summary.quality.grade})
          </span>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          {summary.impact.map((metric) => (
            <div key={metric.id} className="rounded-xl border border-emerald-100 bg-white p-3">
              <p className="text-xs font-semibold text-emerald-800">{metric.label}</p>
              <p className="mt-1 text-xl font-black text-emerald-950">
                {formatMeasuredValue(metric.value, metric.value === null ? "" : ` ${metric.unit}`)}
              </p>
              <p className="mt-1 cmm-text-small leading-4 text-emerald-900/65">{metric.method}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 cmm-text-small leading-4 text-emerald-900/65">
          {summary.methodology.label} · {summary.methodology.version} · confiance calculée avec les règles {summary.quality.rulesVersion}.
        </p>
      </div>
    </div>
  );
}
