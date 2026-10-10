import { cn } from "@/lib/utils";
import type { EnvironmentalImpactEstimateModel } from "@/lib/environmental-impact-estimator/types";
import {
  formatProvenanceCount,
  getUsageProvenanceTone,
} from "./environmental-impact-estimator-panel.helpers";

type EnvironmentalImpactEstimatorPanelOverviewProvenanceProps = {
  model: EnvironmentalImpactEstimateModel;
};

export function EnvironmentalImpactEstimatorPanelOverviewProvenance({
  model,
}: EnvironmentalImpactEstimatorPanelOverviewProvenanceProps) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
            Traçabilité des signaux
          </p>
          <h4 className="mt-1 text-lg font-black text-white">
            Origine des valeurs utilisées par l&apos;estimateur
          </h4>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-emerald-100">
            {model.infrastructure.usage.derivedFrom.length > 0
              ? "Mixte"
              : model.infrastructure.usage.source === "input"
                ? "Entrée"
                : "Référence"}
          </span>
          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-amber-100">
            {model.infrastructure.usage.derivedFrom.length > 0
              ? `${model.infrastructure.usage.derivedFrom.length} dérivées`
              : "0 dérivées"}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {(
          [
            {
              label: "Directement branchés",
              value: model.infrastructure.usage.provenance.filter((item) => item.source === "input").length,
              source: "input" as const,
              detail: "Valeurs lues directement depuis un signal du repo ou une saisie explicite.",
            },
            {
              label: "Dérivés",
              value: model.infrastructure.usage.provenance.filter((item) => item.source === "derived").length,
              source: "derived" as const,
              detail: "Valeurs calculées à partir d'autres signaux CleanMyMap.",
            },
            {
              label: "Référence",
              value: model.infrastructure.usage.provenance.filter((item) => item.source === "reference").length,
              source: "reference" as const,
              detail: "Valeurs de repli documentées quand aucun signal direct n'est disponible.",
            },
          ] as const
        ).map((bucket) => (
          <div
            key={bucket.label}
            className="rounded-2xl border border-white/10 bg-black/10 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                {bucket.label}
              </p>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em]",
                  getUsageProvenanceTone(bucket.source),
                )}
              >
                {bucket.source}
              </span>
            </div>
            <p className="mt-2 text-xl font-black text-white">{bucket.value}</p>
            <p className="cmm-text-small cmm-text-inverse mt-1">{bucket.detail}</p>
          </div>
        ))}
      </div>

      {model.infrastructure.usage.provenance.length > 0 ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {model.infrastructure.usage.provenance.slice(0, 6).map((item) => (
            <div
              key={item.key}
              className="rounded-2xl border border-white/10 bg-black/10 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-black text-white">
                    {formatProvenanceCount(item.value)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em]",
                    getUsageProvenanceTone(item.source),
                  )}
                >
                  {item.source}
                </span>
              </div>
              <p className="cmm-text-small cmm-text-inverse mt-2">{item.detail}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
