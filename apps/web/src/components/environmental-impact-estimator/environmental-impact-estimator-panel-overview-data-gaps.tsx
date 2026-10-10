import { cn } from "@/lib/utils";
import type { EnvironmentalImpactDataGapNote } from "@/lib/environmental-impact-estimator/types";
import {
  getDataGapScopeLabel,
  getDataGapTone,
} from "./environmental-impact-estimator-panel.helpers";

type EnvironmentalImpactEstimatorPanelOverviewDataGapsProps = {
  dataGapNotes: EnvironmentalImpactDataGapNote[];
};

export function EnvironmentalImpactEstimatorPanelOverviewDataGaps({
  dataGapNotes,
}: EnvironmentalImpactEstimatorPanelOverviewDataGapsProps) {
  if (dataGapNotes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
            Notes de données manquantes
          </p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-white">
            Ce qui reste à brancher pour affiner l&apos;impact
          </h3>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-red-100/50">
          {dataGapNotes.length} note{dataGapNotes.length > 1 ? "s" : ""}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {dataGapNotes.map((note) => (
          <article
            key={note.key}
            className={cn("rounded-[1.35rem] border p-4", getDataGapTone(note.severity))}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                  {getDataGapScopeLabel(note.scope)}
                </p>
                <p className="mt-1 text-sm font-black text-white">{note.title}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                {note.severity}
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white">{note.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
