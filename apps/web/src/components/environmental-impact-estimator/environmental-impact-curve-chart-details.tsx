import type {
  EnvironmentalImpactInfrastructureEstimate,
  EnvironmentalImpactScopeEstimate,
} from "@/lib/environmental-impact-estimator/types";
import { formatSharePercent } from "./environmental-impact-estimator-panel.helpers";
import type { EnvironmentalImpactCurveDriverRow } from "./environmental-impact-curve-chart.breakdown";
import { formatKg, formatPercent } from "./environmental-impact-curve-chart.formatters";

export function EnvironmentalImpactCurveChartDetails({
  infrastructure,
  selectedPointIndex,
  selectedSitePoint,
  selectedUserPoint,
  selectedScope,
  selectedScopePoint,
  selectedScopeBreakdown,
  selectedXAxisPoint,
}: {
  infrastructure: EnvironmentalImpactInfrastructureEstimate;
  selectedPointIndex: number;
  selectedSitePoint: EnvironmentalImpactScopeEstimate["curve"][number] | null;
  selectedUserPoint: EnvironmentalImpactScopeEstimate["curve"][number] | null;
  selectedScope: EnvironmentalImpactScopeEstimate;
  selectedScopePoint: EnvironmentalImpactScopeEstimate["curve"][number] | null;
  selectedScopeBreakdown: EnvironmentalImpactCurveDriverRow[];
  selectedXAxisPoint: EnvironmentalImpactScopeEstimate["curve"][number] | null;
}) {
  return (
    <>
      <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/35">
              Point hebdomadaire sélectionné
            </p>
            <h4 className="mt-1 text-lg font-black tracking-tight text-white">
              {selectedScopePoint?.weekLabel ?? selectedXAxisPoint?.weekLabel ?? "Aucun point"}
            </h4>
            <p className="cmm-text-small cmm-text-inverse mt-1">
              Cliquez sur une semaine pour comparer la courbe du site et celle de l&apos;utilisateur.
              Le bloc suivant détaille la portée actuellement sélectionnée.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                Site
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {formatKg(selectedSitePoint?.weeklyKgCo2eProxy ?? null)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                Utilisateur
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {formatKg(selectedUserPoint?.weeklyKgCo2eProxy ?? null)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                Portée détaillée
              </p>
              <p className="mt-1 text-sm font-black text-white capitalize">
                {selectedScope.key}
              </p>
            </div>
          </div>
        </div>

        {selectedScopeBreakdown.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {selectedScopeBreakdown.map((driver) => (
              <div
                key={`${driver.key}-${selectedPointIndex}`}
                className="rounded-2xl border border-white/10 bg-black/10 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white" />
                    <p className="truncate text-sm font-black text-white">{driver.label}</p>
                  </div>
                  <p className="text-sm font-black text-white">{formatSharePercent(driver.sharePercent)}</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(0, driver.sharePercent))}%`,
                      backgroundColor:
                        driver.key === "page_view"
                          ? "#f59e0b"
                          : driver.key === "community"
                            ? "#ef4444"
                            : driver.key === "notifications"
                              ? "#38bdf8"
                              : driver.key === "actions"
                                ? "#22c55e"
                                : driver.key === "PDF"
                                  ? "#a855f7"
                                  : driver.key === "IA"
                                    ? "#f97316"
                                    : "#60a5fa",
                    }}
                  />
                </div>
                <p className="cmm-text-caption cmm-text-inverse mt-2">
                  {formatKg(driver.kg)} sur la semaine sélectionnée.
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
            Granularité
          </p>
          <p className="mt-1 text-sm font-black text-white capitalize">
            {infrastructure.graph.granularity}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
            Incertitude proxy
          </p>
          <p className="mt-1 text-sm font-black text-white">
            ± {formatPercent(infrastructure.graph.uncertaintyPercent)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
            Couverture mesurée
          </p>
          <p className="mt-1 text-sm font-black text-white">
            {formatPercent(infrastructure.graph.coveragePercent)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/35">
          Considérations intégrées au calcul
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {infrastructure.graph.considerations.map((item) => (
            <div
              key={item}
              className="cmm-text-small cmm-text-inverse rounded-2xl border border-white/10 bg-black/10 px-3 py-2"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
