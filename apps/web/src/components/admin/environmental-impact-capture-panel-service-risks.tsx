import { EnvironmentalImpactCapturePanelServiceRiskCard } from "./environmental-impact-capture-panel-service-risk-card";
import type { EnvironmentalImpactCaptureServiceRiskProjection } from "./environmental-impact-capture-panel.model";

type EnvironmentalImpactCapturePanelServiceRisksProps = {
  projections: EnvironmentalImpactCaptureServiceRiskProjection[];
};

export function EnvironmentalImpactCapturePanelServiceRisks({
  projections,
}: EnvironmentalImpactCapturePanelServiceRisksProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
            Fiche de pilotage par service
          </p>
          <p className="mt-1 text-sm text-white/50">
            Chaque fiche met en avant le quota le plus proche de la limite, puis détaille les autres quotas sans masque global.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
          {projections.length} service
          {projections.length > 1 ? "s" : ""}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {projections.map((projection) => (
          <EnvironmentalImpactCapturePanelServiceRiskCard
            key={projection.serviceRisk.key}
            projection={projection}
          />
        ))}
      </div>
    </section>
  );
}
