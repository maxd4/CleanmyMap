import { cn } from "@/lib/utils";
import { formatPercent, type ImpactSelectionKey } from "./free-plan-services-methodology-visual.logic";
import type { ImpactSegment } from "./free-plan-services-methodology-visual.impact.types";

type Props = {
  barSegments: ImpactSegment[];
  developmentLineLabel: string;
  inactiveProductionImpactServices: Array<{ label: string }>;
  isFrench: boolean;
  onSelectImpactKey: (key: ImpactSelectionKey | null) => void;
  selectedImpactKey: ImpactSelectionKey | null;
};

export function ImpactContributionVisualization({
  barSegments,
  developmentLineLabel,
  inactiveProductionImpactServices,
  isFrench,
  onSelectImpactKey,
  selectedImpactKey,
}: Props) {
  return (
    <section className="rounded-[2.25rem] border border-rose-100 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(244,63,94,0.16)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h4 className="text-xl font-black text-slate-950">
            {isFrench
              ? "Contribution estimée à l'empreinte carbone (ACV)"
              : "Estimated contribution to the carbon footprint (LCA)"}
          </h4>
        </div>
        <div className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 cmm-text-caption font-black uppercase tracking-[0.18em] text-rose-600">
          {formatPercent(100)}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-start gap-5">
        {barSegments.length > 0 ? (
          barSegments.map((segment) => {
            const Icon = segment.icon;
            const widthPercent = Math.max(0, segment.sharePercent ?? 0);
            const isDevelopment = segment.kind === "development";
            const isOther = segment.kind === "other";
            const isSelected = selectedImpactKey === segment.key;

            return (
              <button
                type="button"
                key={segment.key}
                className={cn(
                  "flex min-w-[92px] flex-1 flex-col items-center gap-2 rounded-[1.2rem] px-2 py-2 text-center transition",
                  isDevelopment && "border border-rose-300 border-dashed bg-rose-50/60",
                  isOther && "border border-slate-200 bg-slate-50",
                  isSelected && "ring-2 ring-rose-500 ring-offset-2 ring-offset-white",
                )}
                onClick={() => onSelectImpactKey(segment.key)}
                aria-pressed={isSelected}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white"
                  style={{ color: segment.color }}
                >
                  <Icon size={16} />
                </span>
                <div className="space-y-1">
                  <p className="cmm-text-caption font-black uppercase tracking-[0.16em] text-slate-900">
                    {isDevelopment ? "Développement IA" : segment.shortLabel}
                  </p>
                  {isDevelopment && developmentLineLabel !== "NA" ? (
                    <p className="cmm-text-small leading-tight text-slate-500">{developmentLineLabel}</p>
                  ) : null}
                  {isDevelopment ? (
                    <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                      <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 cmm-text-caption font-semibold text-rose-600">
                        Inclus ACV
                      </span>
                      <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 cmm-text-caption font-semibold text-rose-600">
                        Hors production
                      </span>
                      <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 cmm-text-caption font-semibold text-rose-600">
                        Hors quotas web
                      </span>
                    </div>
                  ) : null}
                  <p className={cn("text-sm font-black", isDevelopment ? "text-rose-600" : "text-slate-900")}>
                    {formatPercent(widthPercent)}
                  </p>
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            <p className="font-black text-slate-950">
              {isFrench
                ? "Services surveillés sans consommation récente"
                : "Tracked services without recent consumption"}
            </p>
            <p className="mt-2 leading-relaxed">
              {isFrench
                ? "Aucun poste positif n'est encore disponible pour tracer une barre utile."
                : "No positive post is available yet to draw a useful bar."}
            </p>
          </div>
        )}
      </div>

      {inactiveProductionImpactServices.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-400">
            {isFrench
              ? "Services surveillés sans consommation récente"
              : "Tracked services without recent consumption"}
          </p>
          <p className="mt-2 leading-relaxed">
            {inactiveProductionImpactServices.map((service) => service.label).join(" · ")}
          </p>
        </div>
      ) : null}

      {barSegments.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <div className="flex h-14 overflow-hidden">
            {barSegments.map((segment) => {
              const isDevelopment = segment.kind === "development";
              const isOther = segment.kind === "other";
              return (
                <div
                  key={segment.key}
                  className={cn(
                    "flex items-center justify-center border-r border-white/60 last:border-r-0",
                    isDevelopment && "border-dashed border-rose-300",
                    isOther && "border-slate-300",
                  )}
                  style={{
                    width: `${Math.max(0, segment.sharePercent ?? 0)}%`,
                    minWidth: segment.sharePercent && segment.sharePercent > 0 ? "2rem" : undefined,
                    background:
                      isDevelopment
                        ? "linear-gradient(135deg, #ef4444 0%, #fb7185 100%)"
                        : isOther
                          ? "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)"
                          : `linear-gradient(135deg, ${segment.color} 0%, ${segment.color}dd 100%)`,
                  }}
                  title={`${segment.label} ${formatPercent(segment.sharePercent ?? null)}`}
                >
                  {segment.sharePercent !== null && segment.sharePercent >= 7 ? (
                    <span className={cn("cmm-text-caption font-black uppercase tracking-[0.18em]", isOther ? "text-slate-700" : "text-white")}>
                      {formatPercent(segment.sharePercent)}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-400">
        <span>0%</span>
        <span>{isFrench ? "Contribution relative au total ACV" : "Relative contribution to total LCA"}</span>
        <span>100%</span>
      </div>
    </section>
  );
}
