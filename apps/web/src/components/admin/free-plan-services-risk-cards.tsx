import { cn } from "@/lib/utils";
import {
  formatNumber,
  formatServiceQuotaStateLabel,
  formatServiceRiskBandLabel,
  getHealthLabel,
  getHealthTone,
  getRiskTone,
} from "./free-plan-services-panel.model";
import type { FreePlanServicesPanelRiskCard } from "./free-plan-services-panel.model";

type FreePlanServicesRiskCardsProps = {
  cards: FreePlanServicesPanelRiskCard[];
};

export function FreePlanServicesRiskCards({ cards }: FreePlanServicesRiskCardsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {cards.map((card) => {
        const {
          row,
          service,
          health,
          planInfo,
          primaryQuota,
          extraQuotaMetrics,
          quotaStateLabel,
          quotaValue,
          impactLabel,
          deltaLabel,
          estimateTone,
          estimateLabel,
        } = card;

        return (
          <article
            key={row.key}
            className={cn("rounded-3xl border p-4", getRiskTone(row.score))}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-70">
                  {row.key}
                </p>
                <p className="mt-1 text-sm font-black text-white">{row.label}</p>
                <p className="mt-1 text-xs leading-relaxed opacity-80">
                  {service.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] opacity-85">
                    plan {planInfo.type}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] opacity-85">
                    prix {planInfo.price}
                  </span>
                  {health ? (
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
                        getHealthTone(health.state),
                      )}
                    >
                      {getHealthLabel(health.state)}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
                      estimateTone,
                    )}
                  >
                    {estimateLabel}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="rounded-full border border-white/10 bg-black/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] opacity-85">
                  {quotaStateLabel}
                </p>
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
                  {formatServiceRiskBandLabel(row.band)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.75fr)]">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">
                  Quota principal
                </p>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {primaryQuota?.label ?? "NA"}
                    </p>
                    <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                      {primaryQuota?.referenceMonthlyQuantity
                        ? `ref ${formatNumber(primaryQuota.referenceMonthlyQuantity, 0)} ${primaryQuota.unitLabel}`
                        : "NA"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-white">{quotaValue}</p>
                    <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                      {quotaStateLabel}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                  Le quota le plus proche de la limite sert d&apos;indicateur principal.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">
                  Impact mensuel
                </p>
                <p className="mt-1 text-sm font-black text-white">{impactLabel}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                  Dérive vs mois précédent {deltaLabel}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                Quotas principaux
              </p>
              {primaryQuota ? (
                <>
                  {extraQuotaMetrics.length > 0 ? (
                    extraQuotaMetrics.map((metric) => (
                      <div
                        key={metric.key}
                        className="rounded-2xl border border-white/5 bg-slate-950/40 px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {metric.label}
                            </p>
                            <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                              {metric.source === "input"
                                ? "mesure branchée"
                                : metric.source === "derived"
                                  ? "estimée depuis les signaux"
                                  : "référence interne"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-white">
                              {metric.consumedPercent === null
                                ? "NA"
                                : `${formatNumber(metric.consumedPercent, 0)}%`}
                            </p>
                            <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                              {formatServiceQuotaStateLabel(metric.state)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-3 py-2 text-xs text-white/40">
                      NA
                    </p>
                  )}
                </>
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-3 py-2 text-xs text-white/40">
                  NA
                </p>
              )}
            </div>

            <p className="mt-3 text-xs leading-relaxed text-white/45">
              {service.sourceNote}
            </p>
          </article>
        );
      })}
    </div>
  );
}
