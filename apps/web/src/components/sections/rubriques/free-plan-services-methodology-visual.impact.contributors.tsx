import { formatPercent, getImpactVisual } from "./free-plan-services-methodology-visual.logic";
import type { EnvironmentalImpactInfrastructureServiceEstimate } from "@/lib/environmental-impact-estimator/types";

type Props = {
  isFrench: boolean;
  topContributors: EnvironmentalImpactInfrastructureServiceEstimate[];
  totalMonthlyImpact: number;
};

export function ImpactContributorsLegend({ isFrench, topContributors, totalMonthlyImpact }: Props) {
  return (
    <aside className="space-y-4">
      <section className="rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-xl font-black text-slate-950">{isFrench ? "Top contributeurs" : "Top contributors"}</h4>
            <p className="mt-1 text-sm text-slate-500">{isFrench ? "(hors développement)" : "(excluding development)"}</p>
          </div>
        </div>

        <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-[1.35rem] border border-slate-200">
          {topContributors.length > 0 ? (
            topContributors.map((service, index) => {
              const visual = getImpactVisual(service.key);
              const Icon = visual.icon;
              const sharePercent =
                totalMonthlyImpact > 0 ? ((service.monthlyKgCo2eProxy ?? 0) / totalMonthlyImpact) * 100 : null;

              return (
                <div key={service.key} className="flex items-center gap-3 bg-white px-3 py-3">
                  <div className="w-6 text-sm font-black text-slate-700">{index + 1}</div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ color: visual.color }}>
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{service.label}</p>
                  </div>
                  <p className="text-sm font-black text-slate-700">{formatPercent(sharePercent)}</p>
                </div>
              );
            })
          ) : (
            <div className="px-3 py-4 text-sm text-slate-500">NA</div>
          )}
        </div>
      </section>

      <section className="rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)]">
        <h4 className="text-xl font-black text-slate-950">{isFrench ? "Légende" : "Legend"}</h4>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <span>{isFrench ? "Production web" : "Web production"}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-rose-500" />
            <span>{isFrench ? "Développement" : "Development"}</span>
          </div>
        </div>
      </section>
    </aside>
  );
}
