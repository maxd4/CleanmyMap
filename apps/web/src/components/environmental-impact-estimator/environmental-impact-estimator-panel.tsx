import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";
import type {
  EnvironmentalImpactDataGapNote,
  EnvironmentalImpactEstimateModel,
  EnvironmentalImpactProjectSignals,
  EnvironmentalImpactSnapshotRecord,
} from "@/lib/environmental-impact-estimator/types";
import { buildTopReductionActions } from "./environmental-impact-estimator-panel.helpers";
import { EnvironmentalImpactEstimatorPanelDetails } from "./environmental-impact-estimator-panel-details";
import { EnvironmentalImpactEstimatorPanelOverview } from "./environmental-impact-estimator-panel-overview";
import { EnvironmentalImpactEstimatorPanelResources } from "./environmental-impact-estimator-panel-resources";

type EnvironmentalImpactEstimatorPanelProps = {
  model: EnvironmentalImpactEstimateModel;
  signals?: EnvironmentalImpactProjectSignals | null;
  snapshots?: EnvironmentalImpactSnapshotRecord[];
  className?: string;
};

export function EnvironmentalImpactEstimatorPanel({
  model,
  signals,
  snapshots = [],
  className,
}: EnvironmentalImpactEstimatorPanelProps) {
  const classes = getBlockClasses("impact");
  const isUnbound = model.site.status === "unbound" && model.user.status === "unbound";
  const dataGapNotes: EnvironmentalImpactDataGapNote[] = [
    ...model.dataGaps,
    ...(snapshots.length === 0
      ? [
          {
            key: "history.snapshots",
            title: "Historique Supabase encore vide",
            detail:
              "Aucun snapshot n'a encore été enregistré. La lecture reste calculée à partir des signaux courants et ne dispose pas encore d'un historique enregistré.",
            scope: "history",
            severity: "info",
          } satisfies EnvironmentalImpactDataGapNote,
        ]
      : []),
  ];
  const topReductionActions = buildTopReductionActions(model.infrastructure.services);

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] border p-6 shadow-2xl md:p-8",
        classes.surface,
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative z-10 space-y-8">
        <EnvironmentalImpactEstimatorPanelOverview
          model={model}
          signals={signals}
          dataGapNotes={dataGapNotes}
          isUnbound={isUnbound}
        />

        <EnvironmentalImpactEstimatorPanelResources
          topReductionActions={topReductionActions}
        />

        <EnvironmentalImpactEstimatorPanelDetails
          model={model}
          snapshots={snapshots}
        />
      </div>
    </section>
  );
}
