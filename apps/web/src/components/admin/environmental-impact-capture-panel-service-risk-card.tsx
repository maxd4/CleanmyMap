import {
  formatServiceQuotaStateLabel,
  formatServiceRiskBandLabel,
  isDevelopmentAiServiceKey,
} from "@/lib/environmental-impact-estimator/service-risk";
import { cn } from "@/lib/utils";
import type { EnvironmentalImpactCaptureServiceRiskProjection } from "./environmental-impact-capture-panel.model";
import {
  formatKg,
  formatNumber,
  formatPercent,
  getQuotaStateTone,
  getRiskTone,
} from "./environmental-impact-capture-panel.formatters";

type EnvironmentalImpactCapturePanelServiceRiskCardProps = {
  projection: EnvironmentalImpactCaptureServiceRiskProjection;
};

export function EnvironmentalImpactCapturePanelServiceRiskCard({
  projection,
}: EnvironmentalImpactCapturePanelServiceRiskCardProps) {
  const {
    service,
    serviceRisk,
    planInfo,
    quotaSummary,
    primaryQuota,
    primaryQuotaConsumedPercent,
    extraQuotaMetrics,
  } = projection;

  return (
    <article
      className={cn("rounded-3xl border p-4", getRiskTone(serviceRisk.score))}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-70">
            {serviceRisk.key}
          </p>
          <h3 className="mt-1 text-lg font-black text-white">{serviceRisk.label}</h3>
          <p className="mt-1 text-xs leading-relaxed opacity-80">{service.description}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {isDevelopmentAiServiceKey(service.key) ? (
              <>
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] opacity-90">
                  Inclus ACV
                </span>
                <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] opacity-80">
                  Hors production
                </span>
                <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] opacity-80">
                  Hors quotas web
                </span>
              </>
            ) : null}
            <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] opacity-80">
              plan {planInfo.type}
            </span>
            <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] opacity-80">
              prix {planInfo.price}
            </span>
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
                getQuotaStateTone(quotaSummary.state),
              )}
            >
              {formatServiceQuotaStateLabel(quotaSummary.state)}
            </span>
          </div>
        </div>

        <div className="text-right">
          <p className="rounded-full border border-white/10 bg-black/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] opacity-85">
            {primaryQuotaConsumedPercent === null
              ? "NA"
              : `${formatPercent(primaryQuotaConsumedPercent)}`}
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
            quota principal
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
            {formatServiceRiskBandLabel(serviceRisk.band)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]">
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
                {primaryQuota
                  ? `ref ${formatNumber(primaryQuota.referenceMonthlyQuantity, 0)} ${primaryQuota.unitLabel}`
                  : "NA"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-white">
                {primaryQuotaConsumedPercent === null
                  ? "NA"
                  : `${formatPercent(primaryQuotaConsumedPercent)}`}
              </p>
              <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                {formatServiceQuotaStateLabel(primaryQuota?.state ?? "NA")}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">
            Impact mensuel
          </p>
          <p className="mt-1 text-sm font-black text-white">
            {formatKg(service.monthlyKgCo2eProxy ?? null)}
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
            confiance {formatPercent(service.confidencePercent)}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
          Autres quotas
        </p>
        {extraQuotaMetrics.length > 0 ? (
          extraQuotaMetrics.map((metric) => (
            <div
              key={metric.key}
              className="rounded-2xl border border-white/5 bg-slate-950/40 px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{metric.label}</p>
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
                      : `${formatPercent(metric.consumedPercent)}`}
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
      </div>
    </article>
  );
}
