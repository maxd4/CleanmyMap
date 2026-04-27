import type {
 MetricDelta,
 PeriodComparisonResult,
} from"@/lib/analytics/period-comparison";

type PeriodComparisonPanelProps = {
 title?: string;
 result: PeriodComparisonResult;
};

function formatSigned(value: number, unit: string): string {
 const sign = value > 0 ?"+" : value < 0 ?"" :"+/-";
 return `${sign}${value.toFixed(1)}${unit}`;
}

function describeDelta(
 delta: MetricDelta,
 betterWhenLower: boolean,
): { label: string; tone: string } {
 const improves = betterWhenLower
 ? delta.direction ==="down"
 : delta.direction ==="up";
 if (delta.strength ==="stable" || delta.direction ==="flat") {
 return { label:"Stable", tone:"cmm-text-secondary" };
 }
 if (improves) {
 return {
 label:
 delta.strength ==="strong" ?"Amelioration forte" :"Amelioration",
 tone:"text-emerald-700",
 };
 }
 return {
 label: delta.strength ==="strong" ?"Alerte forte" :"Vigilance",
 tone:"text-rose-700",
 };
}

export function PeriodComparisonPanel({
 title ="Comparatif vs periode precedente",
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
 <h2 className="text-base font-semibold cmm-text-primary">{title}</h2>
 <p className="mt-1 cmm-text-caption cmm-text-muted">
 Fenetre: {result.periodDays} jours vs N-1
 </p>

 <div className="mt-4 grid gap-3 md:grid-cols-4">
 <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Actions
 </p>
 <p className="mt-1 text-lg font-semibold cmm-text-primary">
 {result.current.actionsCount}
 </p>
 <p className={`cmm-text-caption ${actionsTrend.tone}`}>
 {formatSigned(result.deltas.actionsCount.percent,"%")} (
 {actionsTrend.label})
 </p>
 </article>

 <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Volume
 </p>
 <p className="mt-1 text-lg font-semibold cmm-text-primary">
 {result.current.volumeKg.toFixed(1)} kg
 </p>
 <p className={`cmm-text-caption ${volumeTrend.tone}`}>
 {formatSigned(result.deltas.volumeKg.percent,"%")} (
 {volumeTrend.label})
 </p>
 </article>

 <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Couverture geo
 </p>
 <p className="mt-1 text-lg font-semibold cmm-text-primary">
 {result.current.coverageRate.toFixed(1)}%
 </p>
 <p className={`cmm-text-caption ${coverageTrend.tone}`}>
 {formatSigned(result.deltas.coverageRate.absolute," pt")} (
 {coverageTrend.label})
 </p>
 </article>

 <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
 Delai moderation
 </p>
 <p className="mt-1 text-lg font-semibold cmm-text-primary">
 {result.current.moderationDelayDays.toFixed(1)} j
 </p>
 <p className={`cmm-text-caption ${moderationTrend.tone}`}>
 {formatSigned(result.deltas.moderationDelayDays.percent,"%")} (
 {moderationTrend.label})
 </p>
 </article>
 </div>
 </section>
 );
}
