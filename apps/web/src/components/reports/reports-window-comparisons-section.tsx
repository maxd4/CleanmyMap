import { KpiComparisonCard } from"@/components/pilotage/kpi-comparison-card";
import type { PilotageOverview } from"@/lib/pilotage/overview";

type ReportsWindowComparisonsSectionProps = {
 comparisonsByWindow: PilotageOverview["comparisonsByWindow"];
};

function signed(value: number, suffix =""): string {
 return `${value >= 0 ?"+" :""}${value.toFixed(1)}${suffix}`;
}

function reliabilityTone(level:"elevee" |"moyenne" |"faible"): string {
 if (level ==="elevee") {
 return"border-emerald-200 bg-emerald-50 text-emerald-800";
 }
 if (level ==="moyenne") {
 return"border-amber-200 bg-amber-50 text-amber-800";
 }
 return"border-rose-200 bg-rose-50 text-rose-800";
}

export function ReportsWindowComparisonsSection({
 comparisonsByWindow,
}: ReportsWindowComparisonsSectionProps) {
 return (
 <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
 <h2 className="text-base font-semibold cmm-text-primary">
 Comparatifs N vs N-1 par fenetre
 </h2>
 <div className="mt-3 grid gap-3 lg:grid-cols-3">
 {(["30","90","365"] as const).map((windowKey) => {
 const windowResult = comparisonsByWindow[windowKey];
 return (
 <article
 key={windowKey}
 className="rounded-xl border border-slate-200 bg-slate-50 p-3"
 >
 <div className="flex flex-wrap items-center justify-between gap-2">
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 {windowKey ==="365" ?"12 mois" : `${windowKey} jours`}
 </p>
 <span
 className={`rounded-full border px-2 py-0.5 cmm-text-caption font-semibold uppercase ${reliabilityTone(windowResult.current.reliability.level)}`}
 >
 Fiabilite {windowResult.current.reliability.level}
 </span>
 </div>
 <p className="mt-1 cmm-text-caption cmm-text-muted">
 {windowResult.current.reliability.reason} | completude{""}
 {windowResult.current.reliability.completeness.toFixed(1)},
 geoloc {windowResult.current.reliability.geoloc.toFixed(1)},
 fraicheur{""}
 {windowResult.current.reliability.freshness.toFixed(1)}.
 </p>
 <div className="mt-2 grid gap-2">
 <KpiComparisonCard
 label="Actions"
 value={`${windowResult.current.approvedActions}`}
 previousValue={`${windowResult.previous.approvedActions}`}
 deltaAbsolute={signed(
 windowResult.metrics.approvedActions.deltaAbsolute,
 )}
 deltaPercent={signed(
 windowResult.metrics.approvedActions.deltaPercent,
"%",
 )}
 interpretation={
 windowResult.metrics.approvedActions.interpretation
 }
 />
 <KpiComparisonCard
 label="Volume"
 value={`${windowResult.current.impactVolumeKg.toFixed(1)} kg`}
 previousValue={`${windowResult.previous.impactVolumeKg.toFixed(1)} kg`}
 deltaAbsolute={signed(
 windowResult.metrics.impactVolumeKg.deltaAbsolute,
" kg",
 )}
 deltaPercent={signed(
 windowResult.metrics.impactVolumeKg.deltaPercent,
"%",
 )}
 interpretation={
 windowResult.metrics.impactVolumeKg.interpretation
 }
 />
 <KpiComparisonCard
 label="Couverture"
 value={`${windowResult.current.coverageRate.toFixed(1)}%`}
 previousValue={`${windowResult.previous.coverageRate.toFixed(1)}%`}
 deltaAbsolute={signed(
 windowResult.metrics.coverageRate.deltaAbsolute,
" pt",
 )}
 deltaPercent={signed(
 windowResult.metrics.coverageRate.deltaPercent,
"%",
 )}
 interpretation={
 windowResult.metrics.coverageRate.interpretation
 }
 />
 <KpiComparisonCard
 label="Mobilisation"
 value={`${windowResult.current.mobilizationCount}`}
 previousValue={`${windowResult.previous.mobilizationCount}`}
 deltaAbsolute={signed(
 windowResult.metrics.mobilizationCount.deltaAbsolute,
 )}
 deltaPercent={signed(
 windowResult.metrics.mobilizationCount.deltaPercent,
"%",
 )}
 interpretation={
 windowResult.metrics.mobilizationCount.interpretation
 }
 />
 <KpiComparisonCard
 label="Qualite data"
 value={`${windowResult.current.qualityScore.toFixed(1)}/100`}
 previousValue={`${windowResult.previous.qualityScore.toFixed(1)}/100`}
 deltaAbsolute={signed(
 windowResult.metrics.qualityScore.deltaAbsolute,
 )}
 deltaPercent={signed(
 windowResult.metrics.qualityScore.deltaPercent,
"%",
 )}
 interpretation={windowResult.metrics.qualityScore.interpretation}
 />
 <KpiComparisonCard
 label="Delai moderation"
 value={`${windowResult.current.moderationDelayDays.toFixed(1)} j`}
 previousValue={`${windowResult.previous.moderationDelayDays.toFixed(1)} j`}
 deltaAbsolute={signed(
 windowResult.metrics.moderationDelayDays.deltaAbsolute,
" j",
 )}
 deltaPercent={signed(
 windowResult.metrics.moderationDelayDays.deltaPercent,
"%",
 )}
 interpretation={
 windowResult.metrics.moderationDelayDays.interpretation
 }
 />
 </div>
 </article>
 );
 })}
 </div>
 </section>
 );
}
