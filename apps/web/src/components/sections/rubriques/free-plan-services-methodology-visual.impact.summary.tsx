import { Cloud, Leaf } from "lucide-react";
import { formatFallbackStatusLabel, formatImpactKg, formatPercent } from "./free-plan-services-methodology-visual.logic";
import type { ImpactTotals } from "./free-plan-services-methodology-visual.impact.types";

type Props = {
  impactTotals: ImpactTotals;
  isFrench: boolean;
  totalAnnualImpact: number | null;
  totalLifetimeImpact: number | null;
  developmentSharePercent: number | null;
};

export function ImpactSummaryCards({
  impactTotals,
  isFrench,
  totalAnnualImpact,
  totalLifetimeImpact,
  developmentSharePercent,
}: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)]">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <Cloud size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
              {isFrench ? "Impact carbone année en cours" : "Current year carbon impact"}
            </p>
            <p className="mt-2 text-4xl font-black text-rose-600">
              {impactTotals.monthlyKgCo2eProxy === null
                ? formatFallbackStatusLabel("kpi")
                : formatImpactKg(impactTotals.monthlyKgCo2eProxy)}
            </p>
            <p className="cmm-text-body mt-2 font-medium">
              {isFrench
                ? totalAnnualImpact === null
                  ? formatFallbackStatusLabel("kpi")
                  : `(${formatImpactKg(totalAnnualImpact)} projetés)`
                : totalAnnualImpact === null
                  ? formatFallbackStatusLabel("kpi")
                  : `(${formatImpactKg(totalAnnualImpact)} projected)`}
            </p>
            <p className="cmm-text-small cmm-text-secondary mt-3">
              {isFrench
                ? "Projection de l'impact sur l'année entière"
                : "Projection of the impact over the full year"}
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)] lg:text-right">
        <div className="flex items-start gap-4 lg:flex-row-reverse">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <Leaf size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
              {isFrench ? "Total carbone depuis la création du site" : "Total carbon since site creation"}
            </p>
            <p className="mt-2 text-4xl font-black text-rose-600">
              {totalLifetimeImpact === null
                ? formatFallbackStatusLabel("kpi")
                : formatImpactKg(totalLifetimeImpact)}
            </p>
            <p className="cmm-text-body mt-2 font-medium">
              {developmentSharePercent === null
                ? formatFallbackStatusLabel("history")
                : isFrench
                  ? `(${formatPercent(developmentSharePercent)} lié au dev IA)`
                  : `(${formatPercent(developmentSharePercent)} linked to AI development)`}
            </p>
            <p className="cmm-text-small cmm-text-secondary mt-3">
              {isFrench
                ? "Lecture cumulée depuis le lancement du site"
                : "Cumulative reading since site launch"}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
