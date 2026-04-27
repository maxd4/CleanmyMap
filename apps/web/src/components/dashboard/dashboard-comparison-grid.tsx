import { KpiComparisonCard } from"@/components/pilotage/kpi-comparison-card";
import type { PilotageOverview } from"@/lib/pilotage/overview";

type DashboardComparisonGridProps = {
 overview: PilotageOverview | null;
};

export function DashboardComparisonGrid({
 overview,
}: DashboardComparisonGridProps) {
 if (!overview) {
 return (
 <p className="cmm-text-small text-amber-700">
 Metriques indisponibles temporairement, verifier la connexion Supabase.
 </p>
 );
 }

 const methodByKpi = new Map(
 overview.methods.map((method) => [method.kpi.toLowerCase(), method]),
 );

 function tooltipFor(kpiLabel: string): string | undefined {
 const normalized = kpiLabel.toLowerCase();
 const method =
 methodByKpi.get(normalized) ??
 (normalized ==="volume collecte"
 ? methodByKpi.get("impact terrain (kg)")
 : undefined);
 if (!method) {
 return undefined;
 }
 return `Formule: ${method.formula}\nSource: ${method.source}\nFrequence: ${method.recalc}\nHypotheses/Limites: ${method.limits}`;
 }

 function labelWithTooltip(label: string) {
 const tooltip = tooltipFor(label);
 if (!tooltip) {
 return label;
 }
 return (
 <span className="inline-flex items-center gap-1">
 <span>{label}</span>
 <span
 aria-label={`Formule de calcul pour ${label}`}
 title={tooltip}
 className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-slate-100 cmm-text-caption font-bold cmm-text-secondary"
 >
 i
 </span>
 </span>
 );
 }

 return (
 <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
 <KpiComparisonCard
 label={labelWithTooltip("Actions approuvees")}
 value={`${overview.comparison.current.approvedActions}`}
 previousValue={`${overview.comparison.previous.approvedActions}`}
 deltaAbsolute={`${overview.comparison.metrics.approvedActions.deltaAbsolute >= 0 ?"+" :""}${overview.comparison.metrics.approvedActions.deltaAbsolute.toFixed(1)}`}
 deltaPercent={`${overview.comparison.metrics.approvedActions.deltaPercent >= 0 ?"+" :""}${overview.comparison.metrics.approvedActions.deltaPercent.toFixed(1)}%`}
 interpretation={overview.comparison.metrics.approvedActions.interpretation}
 />
 <KpiComparisonCard
 label={labelWithTooltip("Volume collecte")}
 value={`${overview.comparison.current.impactVolumeKg.toFixed(1)} kg`}
 previousValue={`${overview.comparison.previous.impactVolumeKg.toFixed(1)} kg`}
 deltaAbsolute={`${overview.comparison.metrics.impactVolumeKg.deltaAbsolute >= 0 ?"+" :""}${overview.comparison.metrics.impactVolumeKg.deltaAbsolute.toFixed(1)} kg`}
 deltaPercent={`${overview.comparison.metrics.impactVolumeKg.deltaPercent >= 0 ?"+" :""}${overview.comparison.metrics.impactVolumeKg.deltaPercent.toFixed(1)}%`}
 interpretation={overview.comparison.metrics.impactVolumeKg.interpretation}
 />
 <KpiComparisonCard
 label={labelWithTooltip("Qualite data")}
 value={`${overview.comparison.current.qualityScore.toFixed(1)}/100`}
 previousValue={`${overview.comparison.previous.qualityScore.toFixed(1)}/100`}
 deltaAbsolute={`${overview.comparison.metrics.qualityScore.deltaAbsolute >= 0 ?"+" :""}${overview.comparison.metrics.qualityScore.deltaAbsolute.toFixed(1)}`}
 deltaPercent={`${overview.comparison.metrics.qualityScore.deltaPercent >= 0 ?"+" :""}${overview.comparison.metrics.qualityScore.deltaPercent.toFixed(1)}%`}
 interpretation={overview.comparison.metrics.qualityScore.interpretation}
 />
 <KpiComparisonCard
 label={labelWithTooltip("Geo-couverture")}
 value={`${overview.comparison.current.coverageRate.toFixed(1)}%`}
 previousValue={`${overview.comparison.previous.coverageRate.toFixed(1)}%`}
 deltaAbsolute={`${overview.comparison.metrics.coverageRate.deltaAbsolute >= 0 ?"+" :""}${overview.comparison.metrics.coverageRate.deltaAbsolute.toFixed(1)} pt`}
 deltaPercent={`${overview.comparison.metrics.coverageRate.deltaPercent >= 0 ?"+" :""}${overview.comparison.metrics.coverageRate.deltaPercent.toFixed(1)}%`}
 interpretation={overview.comparison.metrics.coverageRate.interpretation}
 />
 <KpiComparisonCard
 label={labelWithTooltip("Delai moderation")}
 value={`${overview.comparison.current.moderationDelayDays.toFixed(1)} j`}
 previousValue={`${overview.comparison.previous.moderationDelayDays.toFixed(1)} j`}
 deltaAbsolute={`${overview.comparison.metrics.moderationDelayDays.deltaAbsolute >= 0 ?"+" :""}${overview.comparison.metrics.moderationDelayDays.deltaAbsolute.toFixed(1)} j`}
 deltaPercent={`${overview.comparison.metrics.moderationDelayDays.deltaPercent >= 0 ?"+" :""}${overview.comparison.metrics.moderationDelayDays.deltaPercent.toFixed(1)}%`}
 interpretation={
 overview.comparison.metrics.moderationDelayDays.interpretation
 }
 />
 <KpiComparisonCard
 label={labelWithTooltip("Mobilisation")}
 value={`${overview.comparison.current.mobilizationCount}`}
 previousValue={`${overview.comparison.previous.mobilizationCount}`}
 deltaAbsolute={`${overview.comparison.metrics.mobilizationCount.deltaAbsolute >= 0 ?"+" :""}${overview.comparison.metrics.mobilizationCount.deltaAbsolute.toFixed(1)}`}
 deltaPercent={`${overview.comparison.metrics.mobilizationCount.deltaPercent >= 0 ?"+" :""}${overview.comparison.metrics.mobilizationCount.deltaPercent.toFixed(1)}%`}
 interpretation={overview.comparison.metrics.mobilizationCount.interpretation}
 />
 </div>
 );
}
