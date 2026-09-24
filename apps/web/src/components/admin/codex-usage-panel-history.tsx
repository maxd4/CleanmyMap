import type { EnvironmentalImpactCodexUsageWeeklySnapshotRecord } from "@/lib/environmental-impact-estimator";
import { formatKg, formatNumber } from "./codex-usage-panel.utils";

type CodexUsagePanelHistoryProps = {
  snapshots: EnvironmentalImpactCodexUsageWeeklySnapshotRecord[] | undefined;
};

export function CodexUsagePanelHistory({ snapshots }: CodexUsagePanelHistoryProps) {
  if (!snapshots?.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/30">Historique</p>
          <h3 className="mt-1 text-lg font-black text-white">Semaines Codex enregistrées</h3>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white/50">
          {snapshots.length} semaine{snapshots.length > 1 ? "s" : ""}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {snapshots.slice(0, 6).map((snapshot) => (
          <article key={`${snapshot.weekStart}-${snapshot.weekEnd}`} className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">{snapshot.weekStart} → {snapshot.weekEnd}</p>
            <p className="mt-2 text-sm font-black text-white">{formatKg(snapshot.estimatedKgCo2eProxy)}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">
              Sessions {formatNumber(snapshot.sessionCount)}, conversations {formatNumber(snapshot.conversationCount)}, confiance {formatNumber(snapshot.confidencePercent)}%.
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
