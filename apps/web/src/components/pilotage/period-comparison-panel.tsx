import type {
  MetricDelta,
  PeriodComparisonResult,
} from "@/lib/analytics/period-comparison";

type PeriodComparisonPanelProps = {
  title?: string;
  result: PeriodComparisonResult;
};

function formatSigned(value: number, unit: string): string {
  const sign = value > 0 ? "+" : value < 0 ? "" : "+/-";
  return `${sign}${value.toFixed(1)}${unit}`;
}

function describeDelta(
  delta: MetricDelta,
  betterWhenLower: boolean,
): { label: string; tone: string } {
  const improves = betterWhenLower
    ? delta.direction === "down"
    : delta.direction === "up";
  if (delta.strength === "stable" || delta.direction === "flat") {
    return { label: "Stable", tone: "text-slate-600" };
  }
  if (improves) {
    return {
      label:
        delta.strength === "strong" ? "Amelioration forte" : "Amelioration",
      tone: "text-emerald-700",
    };
  }
  return {
    label: delta.strength === "strong" ? "Alerte forte" : "Vigilance",
    tone: "text-rose-700",
  };
}

export function PeriodComparisonPanel({
  title = "Comparatif vs periode precedente",
  result,
}: PeriodComparisonPanelProps) {
  const actionsTrend = describeDelta(result.deltas.actionsCount, false);
  const volumeTrend = describeDelta(result.deltas.volumeKg, false);
  const coverageTrend = describeDelta(result.deltas.coverageRate, false);
  const moderationTrend = describeDelta(
    result.deltas.moderationDelayDays,
    true,
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">
        Fenetre: {result.periodDays} jours vs N-1
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Actions
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {result.current.actionsCount}
          </p>
          <p className={`text-xs ${actionsTrend.tone}`}>
            {formatSigned(result.deltas.actionsCount.percent, "%")} (
            {actionsTrend.label})
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Volume
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {result.current.volumeKg.toFixed(1)} kg
          </p>
          <p className={`text-xs ${volumeTrend.tone}`}>
            {formatSigned(result.deltas.volumeKg.percent, "%")} (
            {volumeTrend.label})
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Couverture geo
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {result.current.coverageRate.toFixed(1)}%
          </p>
          <p className={`text-xs ${coverageTrend.tone}`}>
            {formatSigned(result.deltas.coverageRate.absolute, " pt")} (
            {coverageTrend.label})
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Delai moderation
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {result.current.moderationDelayDays.toFixed(1)} j
          </p>
          <p className={`text-xs ${moderationTrend.tone}`}>
            {formatSigned(result.deltas.moderationDelayDays.percent, "%")} (
            {moderationTrend.label})
          </p>
        </article>
      </div>
    </section>
  );
}
