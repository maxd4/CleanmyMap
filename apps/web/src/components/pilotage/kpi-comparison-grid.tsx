import { Fragment, type ReactNode } from"react";
import type { PilotageComparisonResult } from"@/lib/pilotage/metrics";
import { KpiComparisonCard } from"./kpi-comparison-card";
import { formatScorePercent } from "@/lib/formatters/score";

type KpiCardKey =
 |"actions"
 |"volume"
 |"coverage"
 |"mobilization"
 |"quality"
 |"moderationDelay";

type KpiLabels = Record<KpiCardKey, string>;

type KpiComparisonGridProps = {
 comparison: PilotageComparisonResult;
 labels?: Partial<KpiLabels>;
 order?: KpiCardKey[];
 className?: string;
};

const DEFAULT_LABELS: KpiLabels = {
 actions:"Actions approuvees",
 volume:"Volume collecte",
 coverage:"Geo-couverture",
 mobilization:"Mobilisation",
 quality:"Qualite data",
 moderationDelay:"Delai moderation",
};

const DEFAULT_ORDER: KpiCardKey[] = [
"actions",
"volume",
"quality",
"coverage",
"moderationDelay",
"mobilization",
];

function signed(value: number, suffix =""): string {
 return `${value >= 0 ?"+" :""}${value.toFixed(1)}${suffix}`;
}

function signedPercent(value: number | null): string {
 return value === null ? "Variation indisponible" : signed(value, "%");
}

function formatVolumeValue(approvedActions: number, wasteKnownActions: number, impactVolumeKg: number, wasteCoverageRate: number): string {
 if (approvedActions === 0) return "Non renseigné (aucune action)";
 if (wasteKnownActions === 0) return "Non renseigné (0% renseigné)";
 return `${impactVolumeKg.toFixed(1)} kg (${wasteCoverageRate.toFixed(0)}% renseigné)`;
}

export function KpiComparisonGrid({
 comparison,
 labels,
 order = DEFAULT_ORDER,
 className ="grid gap-3 md:grid-cols-2 lg:grid-cols-3",
}: KpiComparisonGridProps) {
 const mergedLabels = { ...DEFAULT_LABELS, ...labels };
 const wasteComparable =
  comparison.current.approvedActions > 0 &&
  comparison.previous.approvedActions > 0 &&
  comparison.current.wasteCoverageRate === 100 &&
  comparison.previous.wasteCoverageRate === 100;
 const qualityCurrentAvailable = comparison.current.approvedActions > 0;
 const qualityPreviousAvailable = comparison.previous.approvedActions > 0;
 const qualityComparable = qualityCurrentAvailable && qualityPreviousAvailable;

 const cards: Record<KpiCardKey, ReactNode> = {
 actions: (
 <KpiComparisonCard
 label={mergedLabels.actions}
 value={`${comparison.current.approvedActions}`}
 previousValue={`${comparison.previous.approvedActions}`}
 deltaAbsolute={signed(comparison.metrics.approvedActions.deltaAbsolute)}
 deltaPercent={signedPercent(comparison.metrics.approvedActions.deltaPercent)}
 interpretation={comparison.metrics.approvedActions.interpretation}
 />
 ),
 volume: (
 <KpiComparisonCard
 label={mergedLabels.volume}
 value={formatVolumeValue(comparison.current.approvedActions, comparison.current.wasteKnownActions, comparison.current.impactVolumeKg, comparison.current.wasteCoverageRate)}
 previousValue={formatVolumeValue(comparison.previous.approvedActions, comparison.previous.wasteKnownActions, comparison.previous.impactVolumeKg, comparison.previous.wasteCoverageRate)}
 deltaAbsolute={wasteComparable ? signed(comparison.metrics.impactVolumeKg.deltaAbsolute," kg") : "Non comparable"}
 deltaPercent={wasteComparable && comparison.metrics.impactVolumeKg.deltaPercent !== null ? signed(comparison.metrics.impactVolumeKg.deltaPercent,"%") : "Non comparable"}
 interpretation={wasteComparable ? comparison.metrics.impactVolumeKg.interpretation : "neutral"}
 />
 ),
 coverage: (
 <KpiComparisonCard
 label={mergedLabels.coverage}
 value={qualityCurrentAvailable ? `${comparison.current.coverageRate.toFixed(1)}%` : "Indisponible"}
 previousValue={qualityPreviousAvailable ? `${comparison.previous.coverageRate.toFixed(1)}%` : "Indisponible"}
 deltaAbsolute={qualityComparable ? signed(comparison.metrics.coverageRate.deltaAbsolute," pt") : "Non comparable"}
 deltaPercent={qualityComparable ? signedPercent(comparison.metrics.coverageRate.deltaPercent) : "Non comparable"}
 interpretation={qualityComparable ? comparison.metrics.coverageRate.interpretation : "neutral"}
 />
 ),
 mobilization: (
 <KpiComparisonCard
 label={mergedLabels.mobilization}
 value={`${comparison.current.mobilizationCount}`}
 previousValue={`${comparison.previous.mobilizationCount}`}
 deltaAbsolute={signed(comparison.metrics.mobilizationCount.deltaAbsolute)}
 deltaPercent={signedPercent(comparison.metrics.mobilizationCount.deltaPercent)}
 interpretation={comparison.metrics.mobilizationCount.interpretation}
 />
 ),
 quality: (
 <KpiComparisonCard
 label={mergedLabels.quality}
 value={qualityCurrentAvailable ? formatScorePercent(comparison.current.qualityScore, 1) : "Indisponible"}
 previousValue={qualityPreviousAvailable ? formatScorePercent(comparison.previous.qualityScore, 1) : "Indisponible"}
 deltaAbsolute={qualityComparable ? signed(comparison.metrics.qualityScore.deltaAbsolute) : "Non comparable"}
 deltaPercent={qualityComparable ? signedPercent(comparison.metrics.qualityScore.deltaPercent) : "Non comparable"}
 interpretation={qualityComparable ? comparison.metrics.qualityScore.interpretation : "neutral"}
 />
 ),
 moderationDelay: (
 <KpiComparisonCard
 label={mergedLabels.moderationDelay}
 value={
 comparison.current.moderationDelayDays === null
 ? "Indisponible"
 : `${comparison.current.moderationDelayDays.toFixed(1)} j`
 }
 previousValue={
 comparison.previous.moderationDelayDays === null
 ? "Indisponible"
 : `${comparison.previous.moderationDelayDays.toFixed(1)} j`
 }
 deltaAbsolute={
 comparison.metrics.moderationDelayDays === null
 ? "Indisponible"
 : signed(comparison.metrics.moderationDelayDays.deltaAbsolute, " j")
 }
 deltaPercent={
 comparison.metrics.moderationDelayDays === null
 ? "Indisponible"
 : signedPercent(comparison.metrics.moderationDelayDays.deltaPercent)
 }
 interpretation={comparison.metrics.moderationDelayDays?.interpretation ?? "neutral"}
 />
 ),
 };

 return (
 <div className={className}>
 {order.map((key) => (
 <Fragment key={key}>{cards[key]}</Fragment>
 ))}
 </div>
 );
}
