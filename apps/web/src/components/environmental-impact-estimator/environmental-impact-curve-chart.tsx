"use client";

import { cn } from "@/lib/utils";
import type {
  EnvironmentalImpactInfrastructureEstimate,
  EnvironmentalImpactProjectSignals,
  EnvironmentalImpactScopeEstimate,
} from "@/lib/environmental-impact-estimator/types";
import { EnvironmentalImpactCurveChartDetails } from "./environmental-impact-curve-chart-details";
import { formatKg, formatPercent } from "./environmental-impact-curve-chart.formatters";
import { CURVE_COLORS } from "./environmental-impact-curve-chart.model";
import { EnvironmentalImpactCurveChartView } from "./environmental-impact-curve-chart-view";
import { useEnvironmentalImpactCurveChart } from "./use-environmental-impact-curve-chart";

type EnvironmentalImpactCurveChartProps = {
  site: EnvironmentalImpactScopeEstimate;
  user: EnvironmentalImpactScopeEstimate;
  infrastructure: EnvironmentalImpactInfrastructureEstimate;
  signals?: EnvironmentalImpactProjectSignals | null;
  className?: string;
};

export function EnvironmentalImpactCurveChart({
  site,
  user,
  infrastructure,
  signals,
  className,
}: EnvironmentalImpactCurveChartProps) {
  const chart = useEnvironmentalImpactCurveChart({ site, user, signals });

  return (
    <figure
      className={cn(
        "overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20 p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
            Courbe temporelle
          </p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-white">
            Pollution du site et pollution attribuée à l&apos;utilisateur
          </h3>
          <p className="cmm-text-body cmm-text-inverse mt-2 max-w-3xl">
            Le tracé expose deux courbes hebdomadaires cumulées depuis la mise en ligne:
            le total du site et le total attribué à l&apos;utilisateur. Clique sur un point
            pour comparer les deux séries et ouvrir le détail des familles de signaux.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100/35">
              Site total
            </p>
            <p className="mt-1 text-lg font-black text-white">
              {formatKg(site.totalKgCo2eProxy)}
            </p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
              Confiance {formatPercent(infrastructure.graph.confidencePercent)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100/35">
              Utilisateur
            </p>
            <p className="mt-1 text-lg font-black text-white">
              {formatKg(user.totalKgCo2eProxy)}
            </p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
              Confiance {formatPercent(infrastructure.graph.confidencePercent)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-red-100/45">
        <span className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: CURVE_COLORS.site }}
          />
          Site total
        </span>
        <span className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: CURVE_COLORS.user }}
          />
          Utilisateur
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
          1 point hebdo
        </span>
      </div>

      <EnvironmentalImpactCurveChartView
        site={site}
        user={user}
        geometry={chart}
        selectedPointIndex={chart.selectedPointIndex}
        selectedLinePoint={chart.selectedLinePoint}
        onSitePointClick={chart.onSitePointClick}
        onSitePointKeyDown={chart.onSitePointKeyDown}
        onUserPointClick={chart.onUserPointClick}
        onUserPointKeyDown={chart.onUserPointKeyDown}
      />

      <EnvironmentalImpactCurveChartDetails
        infrastructure={infrastructure}
        selectedPointIndex={chart.selectedPointIndex}
        selectedSitePoint={chart.selectedSitePoint}
        selectedUserPoint={chart.selectedUserPoint}
        selectedScope={chart.selectedScope}
        selectedScopePoint={chart.selectedScopePoint}
        selectedScopeBreakdown={chart.selectedScopeBreakdown}
        selectedXAxisPoint={chart.selectedXAxisPoint}
      />
    </figure>
  );
}
