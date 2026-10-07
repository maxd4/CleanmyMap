import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImpactDetailSelection } from "./free-plan-services-methodology-visual.impact.types";

type Props = {
  isFrench: boolean;
  onClose: () => void;
  selectedImpactSelection: ImpactDetailSelection | null;
};

export function ImpactSelectionDetail({ isFrench, onClose, selectedImpactSelection }: Props) {
  return (
    <section className="mt-5 rounded-[1.75rem] border border-rose-200 bg-rose-50/35 p-5 shadow-[0_18px_45px_-34px_rgba(244,63,94,0.16)]">
      {selectedImpactSelection ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="cmm-text-caption font-black uppercase tracking-[0.22em] text-rose-600/75">
                {isFrench ? "Détail de la contribution" : "Contribution detail"}
              </p>
              <h4 className="text-2xl font-black tracking-tight text-slate-950">{selectedImpactSelection.title}</h4>
              <div className="flex flex-wrap gap-2">
                {selectedImpactSelection.badgeLabels.map((badge) => (
                  <span
                    key={badge.label}
                    className={cn(
                      "rounded-full border px-3 py-1 cmm-text-caption font-black uppercase tracking-[0.18em]",
                      badge.tone === "rose"
                        ? "border-rose-200 bg-white text-rose-600"
                        : "border-slate-200 bg-white text-slate-600",
                    )}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 cmm-text-caption font-black uppercase tracking-[0.18em] text-rose-700 transition hover:bg-rose-100"
            >
              <ExternalLink size={14} className="rotate-45" />
              {isFrench ? "Fermer le détail" : "Close detail"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-rose-200 bg-white px-3 py-1 cmm-text-caption font-black uppercase tracking-[0.18em] text-rose-700">
              {isFrench ? "Part du total" : "Share of total"} {selectedImpactSelection.contributionPercentLabel}
            </span>
            <span className="rounded-full border border-rose-200 bg-white px-3 py-1 cmm-text-caption font-black uppercase tracking-[0.18em] text-rose-700">
              {isFrench ? "Contribution" : "Contribution"} {selectedImpactSelection.contributionValueLabel}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {selectedImpactSelection.serviceRows.length > 0 ? (
              selectedImpactSelection.serviceRows.map((row) => (
                <article
                  key={`${selectedImpactSelection.key}-${row.label}`}
                  className={cn(
                    "rounded-[1.15rem] border bg-white p-4 shadow-[0_12px_30px_-26px_rgba(244,63,94,0.18)]",
                    row.statusLabel === "mesuré"
                      ? "border-rose-200"
                      : row.statusLabel === "estimé"
                        ? "border-rose-100"
                        : "border-slate-200",
                  )}
                >
                  <div className="flex h-full flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950">{row.label}</p>
                        {row.descriptionLabel ? (
                          <p className="mt-0.5 cmm-text-small leading-snug text-slate-500">{row.descriptionLabel}</p>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full border px-2.5 py-1 cmm-text-caption font-black uppercase tracking-[0.18em]",
                          row.statusLabel === "mesuré"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : row.statusLabel === "estimé"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-slate-200 bg-slate-50 text-slate-500",
                        )}
                      >
                        {row.statusLabel}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-950">{row.valueLabel}</p>
                  </div>
                </article>
              ))
            ) : (
              <div className="col-span-full rounded-[1.15rem] border border-dashed border-rose-200 bg-white p-4 text-sm text-slate-600">
                {isFrench ? "Aucun poste détaillé disponible." : "No detailed post available."}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-[1.15rem] border border-dashed border-rose-200 bg-white px-4 py-6 text-sm font-medium text-slate-600">
          {isFrench
            ? "Cliquez sur une portion du graphique pour afficher le détail de contribution."
            : "Click a chart segment to show the contribution detail."}
        </div>
      )}
    </section>
  );
}
