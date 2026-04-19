import { KpiComparisonCard } from "@/components/pilotage/kpi-comparison-card";
import type { PilotageOverview } from "@/lib/pilotage/overview";

type DashboardComparisonGridProps = {
  overview: PilotageOverview | null;
};

export function DashboardComparisonGrid({
  overview,
}: DashboardComparisonGridProps) {
  if (!overview) {
    return (
      <p className="text-sm text-amber-700">
        Metriques indisponibles temporairement, verifier la connexion Supabase.
      </p>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      <KpiComparisonCard
        label="Actions approuvees"
        value={`${overview.comparison.current.approvedActions}`}
        previousValue={`${overview.comparison.previous.approvedActions}`}
        deltaAbsolute={`${overview.comparison.metrics.approvedActions.deltaAbsolute >= 0 ? "+" : ""}${overview.comparison.metrics.approvedActions.deltaAbsolute.toFixed(1)}`}
        deltaPercent={`${overview.comparison.metrics.approvedActions.deltaPercent >= 0 ? "+" : ""}${overview.comparison.metrics.approvedActions.deltaPercent.toFixed(1)}%`}
        interpretation={overview.comparison.metrics.approvedActions.interpretation}
      />
      <KpiComparisonCard
        label="Volume collecte"
        value={`${overview.comparison.current.impactVolumeKg.toFixed(1)} kg`}
        previousValue={`${overview.comparison.previous.impactVolumeKg.toFixed(1)} kg`}
        deltaAbsolute={`${overview.comparison.metrics.impactVolumeKg.deltaAbsolute >= 0 ? "+" : ""}${overview.comparison.metrics.impactVolumeKg.deltaAbsolute.toFixed(1)} kg`}
        deltaPercent={`${overview.comparison.metrics.impactVolumeKg.deltaPercent >= 0 ? "+" : ""}${overview.comparison.metrics.impactVolumeKg.deltaPercent.toFixed(1)}%`}
        interpretation={overview.comparison.metrics.impactVolumeKg.interpretation}
      />
      <KpiComparisonCard
        label="Qualite data"
        value={`${overview.comparison.current.qualityScore.toFixed(1)}/100`}
        previousValue={`${overview.comparison.previous.qualityScore.toFixed(1)}/100`}
        deltaAbsolute={`${overview.comparison.metrics.qualityScore.deltaAbsolute >= 0 ? "+" : ""}${overview.comparison.metrics.qualityScore.deltaAbsolute.toFixed(1)}`}
        deltaPercent={`${overview.comparison.metrics.qualityScore.deltaPercent >= 0 ? "+" : ""}${overview.comparison.metrics.qualityScore.deltaPercent.toFixed(1)}%`}
        interpretation={overview.comparison.metrics.qualityScore.interpretation}
      />
      <KpiComparisonCard
        label="Geo-couverture"
        value={`${overview.comparison.current.coverageRate.toFixed(1)}%`}
        previousValue={`${overview.comparison.previous.coverageRate.toFixed(1)}%`}
        deltaAbsolute={`${overview.comparison.metrics.coverageRate.deltaAbsolute >= 0 ? "+" : ""}${overview.comparison.metrics.coverageRate.deltaAbsolute.toFixed(1)} pt`}
        deltaPercent={`${overview.comparison.metrics.coverageRate.deltaPercent >= 0 ? "+" : ""}${overview.comparison.metrics.coverageRate.deltaPercent.toFixed(1)}%`}
        interpretation={overview.comparison.metrics.coverageRate.interpretation}
      />
      <KpiComparisonCard
        label="Delai moderation"
        value={`${overview.comparison.current.moderationDelayDays.toFixed(1)} j`}
        previousValue={`${overview.comparison.previous.moderationDelayDays.toFixed(1)} j`}
        deltaAbsolute={`${overview.comparison.metrics.moderationDelayDays.deltaAbsolute >= 0 ? "+" : ""}${overview.comparison.metrics.moderationDelayDays.deltaAbsolute.toFixed(1)} j`}
        deltaPercent={`${overview.comparison.metrics.moderationDelayDays.deltaPercent >= 0 ? "+" : ""}${overview.comparison.metrics.moderationDelayDays.deltaPercent.toFixed(1)}%`}
        interpretation={
          overview.comparison.metrics.moderationDelayDays.interpretation
        }
      />
      <KpiComparisonCard
        label="Mobilisation"
        value={`${overview.comparison.current.mobilizationCount}`}
        previousValue={`${overview.comparison.previous.mobilizationCount}`}
        deltaAbsolute={`${overview.comparison.metrics.mobilizationCount.deltaAbsolute >= 0 ? "+" : ""}${overview.comparison.metrics.mobilizationCount.deltaAbsolute.toFixed(1)}`}
        deltaPercent={`${overview.comparison.metrics.mobilizationCount.deltaPercent >= 0 ? "+" : ""}${overview.comparison.metrics.mobilizationCount.deltaPercent.toFixed(1)}%`}
        interpretation={overview.comparison.metrics.mobilizationCount.interpretation}
      />
    </div>
  );
}
