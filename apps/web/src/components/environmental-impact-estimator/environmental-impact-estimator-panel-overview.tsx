import { EnvironmentalImpactCurveChart } from "./environmental-impact-curve-chart";
import { EnvironmentalImpactEstimatorPanelOverviewDataGaps } from "./environmental-impact-estimator-panel-overview-data-gaps";
import { EnvironmentalImpactEstimatorPanelOverviewImpactSummary } from "./environmental-impact-estimator-panel-overview-impact-summary";
import { EnvironmentalImpactEstimatorPanelOverviewSignals } from "./environmental-impact-estimator-panel-overview-signals";
import type {
  EnvironmentalImpactDataGapNote,
  EnvironmentalImpactEstimateModel,
  EnvironmentalImpactProjectSignals,
} from "@/lib/environmental-impact-estimator/types";

type EnvironmentalImpactEstimatorPanelOverviewProps = {
  model: EnvironmentalImpactEstimateModel;
  signals?: EnvironmentalImpactProjectSignals | null;
  dataGapNotes: EnvironmentalImpactDataGapNote[];
  isUnbound: boolean;
};

export function EnvironmentalImpactEstimatorPanelOverview({
  model,
  signals,
  dataGapNotes,
  isUnbound,
}: EnvironmentalImpactEstimatorPanelOverviewProps) {
  return (
    <>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
            Estimateur d&apos;impact environnemental
          </h2>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-red-100/50">
            {model.version}
          </span>
        </div>
        <p className="cmm-text-body cmm-text-inverse max-w-3xl">
          Socle transparent, documenté et extensible. Les lignes ci-dessous
          exposent les postes visibles, les hypothèses, les services
          d&apos;infrastructure et les sources de calcul sans masquer les zones
          encore non branchées.
        </p>
      </header>

      {model.validation.issues.length > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
          <div className="mt-0.5 shrink-0 text-amber-300">!</div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-amber-100">Données d&apos;entrée à corriger</p>
            <ul className="space-y-1 text-xs leading-relaxed text-amber-100/75">
              {model.validation.issues.map((issue) => (
                <li key={`${issue.path}-${issue.message}`}>
                  <span className="font-semibold">{issue.path}</span>: {issue.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {isUnbound ? (
        <div className="cmm-text-body cmm-text-inverse rounded-2xl border border-white/10 bg-white/5 p-4">
          Aucune source n&apos;est encore branchée. L&apos;estimateur conserve
          néanmoins sa structure complète pour rendre visibles les futurs
          flux, poste par poste.
        </div>
      ) : null}

      {signals ? (
        <EnvironmentalImpactEstimatorPanelOverviewSignals model={model} signals={signals} />
      ) : null}

      <EnvironmentalImpactEstimatorPanelOverviewImpactSummary
        model={model}
        isUnbound={isUnbound}
      />

      <EnvironmentalImpactCurveChart
        site={model.site}
        user={model.user}
        infrastructure={model.infrastructure}
        signals={signals ?? null}
      />

      <EnvironmentalImpactEstimatorPanelOverviewDataGaps dataGapNotes={dataGapNotes} />
    </>
  );
}
