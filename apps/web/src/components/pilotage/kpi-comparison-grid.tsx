import { Fragment, type ReactNode } from "react";
import type { PilotageComparisonResult } from "@/lib/pilotage/metrics";
import { KpiComparisonCard } from "./kpi-comparison-card";

export type KpiCardKey =
  | "actions"
  | "volume"
  | "coverage"
  | "mobilization"
  | "quality"
  | "moderationDelay";

type KpiLabels = Record<KpiCardKey, string>;

type KpiComparisonGridProps = {
  comparison: PilotageComparisonResult;
  labels?: Partial<KpiLabels>;
  order?: KpiCardKey[];
  className?: string;
};

const DEFAULT_LABELS: KpiLabels = {
  actions: "Actions approuvees",
  volume: "Volume collecte",
  coverage: "Geo-couverture",
  mobilization: "Mobilisation",
  quality: "Qualite data",
  moderationDelay: "Delai moderation",
};

const DEFAULT_ORDER: KpiCardKey[] = [
  "actions",
  "volume",
  "quality",
  "coverage",
  "moderationDelay",
  "mobilization",
];

function signed(value: number, suffix = ""): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}${suffix}`;
}

export function KpiComparisonGrid({
  comparison,
  labels,
  order = DEFAULT_ORDER,
  className = "grid gap-3 md:grid-cols-2 lg:grid-cols-3",
}: KpiComparisonGridProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };

  const cards: Record<KpiCardKey, ReactNode> = {
    actions: (
      <KpiComparisonCard
        label={mergedLabels.actions}
        value={`${comparison.current.approvedActions}`}
        previousValue={`${comparison.previous.approvedActions}`}
        deltaAbsolute={signed(comparison.metrics.approvedActions.deltaAbsolute)}
        deltaPercent={signed(comparison.metrics.approvedActions.deltaPercent, "%")}
        interpretation={comparison.metrics.approvedActions.interpretation}
      />
    ),
    volume: (
      <KpiComparisonCard
        label={mergedLabels.volume}
        value={`${comparison.current.impactVolumeKg.toFixed(1)} kg`}
        previousValue={`${comparison.previous.impactVolumeKg.toFixed(1)} kg`}
        deltaAbsolute={signed(comparison.metrics.impactVolumeKg.deltaAbsolute, " kg")}
        deltaPercent={signed(comparison.metrics.impactVolumeKg.deltaPercent, "%")}
        interpretation={comparison.metrics.impactVolumeKg.interpretation}
      />
    ),
    coverage: (
      <KpiComparisonCard
        label={mergedLabels.coverage}
        value={`${comparison.current.coverageRate.toFixed(1)}%`}
        previousValue={`${comparison.previous.coverageRate.toFixed(1)}%`}
        deltaAbsolute={signed(comparison.metrics.coverageRate.deltaAbsolute, " pt")}
        deltaPercent={signed(comparison.metrics.coverageRate.deltaPercent, "%")}
        interpretation={comparison.metrics.coverageRate.interpretation}
      />
    ),
    mobilization: (
      <KpiComparisonCard
        label={mergedLabels.mobilization}
        value={`${comparison.current.mobilizationCount}`}
        previousValue={`${comparison.previous.mobilizationCount}`}
        deltaAbsolute={signed(comparison.metrics.mobilizationCount.deltaAbsolute)}
        deltaPercent={signed(comparison.metrics.mobilizationCount.deltaPercent, "%")}
        interpretation={comparison.metrics.mobilizationCount.interpretation}
      />
    ),
    quality: (
      <KpiComparisonCard
        label={mergedLabels.quality}
        value={`${comparison.current.qualityScore.toFixed(1)}/100`}
        previousValue={`${comparison.previous.qualityScore.toFixed(1)}/100`}
        deltaAbsolute={signed(comparison.metrics.qualityScore.deltaAbsolute)}
        deltaPercent={signed(comparison.metrics.qualityScore.deltaPercent, "%")}
        interpretation={comparison.metrics.qualityScore.interpretation}
      />
    ),
    moderationDelay: (
      <KpiComparisonCard
        label={mergedLabels.moderationDelay}
        value={`${comparison.current.moderationDelayDays.toFixed(1)} j`}
        previousValue={`${comparison.previous.moderationDelayDays.toFixed(1)} j`}
        deltaAbsolute={signed(
          comparison.metrics.moderationDelayDays.deltaAbsolute,
          " j",
        )}
        deltaPercent={signed(
          comparison.metrics.moderationDelayDays.deltaPercent,
          "%",
        )}
        interpretation={comparison.metrics.moderationDelayDays.interpretation}
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
