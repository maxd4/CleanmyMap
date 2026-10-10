import { Database } from "lucide-react";
import type {
  EnvironmentalImpactCaptureResponse,
  EnvironmentalImpactCaptureSnapshot,
} from "./environmental-impact-capture-panel.model";
import { formatDate, formatKg } from "./environmental-impact-capture-panel.formatters";

type EnvironmentalImpactCapturePanelSummaryProps = {
  result: EnvironmentalImpactCaptureResponse;
  latestSnapshot: EnvironmentalImpactCaptureSnapshot | null;
};

export function EnvironmentalImpactCapturePanelSummary({
  result,
  latestSnapshot,
}: EnvironmentalImpactCapturePanelSummaryProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
      <article className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-300">
            <Database size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200/60">
              Dernière capture
            </p>
            <p className="mt-1 text-lg font-black text-white">
              {formatDate(result.model?.generatedAt ?? null)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
              Mensuel
            </p>
            <p className="mt-1 text-sm font-black text-white">
              {formatKg(result.model?.infrastructure.monthlyKgCo2eProxy ?? null)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
              Cumul
            </p>
            <p className="mt-1 text-sm font-black text-white">
              {formatKg(result.model?.infrastructure.totalKgCo2eProxy ?? null)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
              Confiance
            </p>
            <p className="mt-1 text-sm font-black text-white">
              {new Intl.NumberFormat("fr-FR", {
                maximumFractionDigits: 0,
              }).format(result.model?.infrastructure.confidencePercent ?? 0)}
              %
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-white/50">
          Déclenché par {result.triggeredBy ?? "admin-manual"} avec la version {result.version}.
        </p>
      </article>

      <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
          Snapshot enregistré
        </p>
        <p className="mt-2 text-3xl font-black text-white">
          {result.snapshots?.length ?? 0}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-white/45">
          Dernière date d&apos;historique: {formatDate(latestSnapshot?.generatedAt ?? null)}.
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
            Dernier point
          </p>
          <p className="mt-1 text-sm font-black text-white">
            {formatKg(latestSnapshot?.totalKgCo2eProxy ?? null)}
          </p>
        </div>
      </article>
    </div>
  );
}
