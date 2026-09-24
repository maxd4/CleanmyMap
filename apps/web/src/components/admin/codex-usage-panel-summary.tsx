import { Clock3 } from "lucide-react";
import type {
  EnvironmentalImpactCodexUsageMonthlyEstimate,
  EnvironmentalImpactCodexUsageWeeklySnapshotRecord,
} from "@/lib/environmental-impact-estimator";
import type { CodexUsageAdminResponse } from "./codex-usage-panel.model";
import { formatKg, formatNumber } from "./codex-usage-panel.utils";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

type CodexUsagePanelSummaryProps = {
  aggregate: EnvironmentalImpactCodexUsageMonthlyEstimate | null;
  averageWeeklyKg: number | null;
  latestSnapshot: EnvironmentalImpactCodexUsageWeeklySnapshotRecord | null;
  result: CodexUsageAdminResponse | null;
};

type CodexUsageLatestSummaryProps = Pick<CodexUsagePanelSummaryProps, "aggregate" | "latestSnapshot"> & {
  result: CodexUsageAdminResponse;
};

function CodexUsageLatestSummary({ aggregate, latestSnapshot, result }: CodexUsageLatestSummaryProps) {
  return (
    <article className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-300">
          <Clock3 size={18} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200/60">Dernière semaine enregistrée</p>
          <p className="mt-1 text-lg font-black text-white">{latestSnapshot?.weekStart ?? "—"} → {latestSnapshot?.weekEnd ?? "—"}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Semaine</p>
          <p className="mt-1 text-sm font-black text-white">{formatKg(latestSnapshot?.estimatedKgCo2eProxy ?? null)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Mensuel équivalent</p>
          <p className="mt-1 text-sm font-black text-white">{formatKg(aggregate?.estimatedKgCo2eProxy ?? null)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Confiance</p>
          <p className="mt-1 text-sm font-black text-white">{formatNumber(aggregate?.confidencePercent ?? null)}%</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-white/50">
        Déclenché par {result.triggeredBy ?? "admin-manual"} avec {result.snapshots?.length ?? 0} semaine(s) enregistrée(s).
      </p>
    </article>
  );
}

function CodexUsageUpdateSummary({
  averageWeeklyKg,
  latestSnapshot,
  result,
}: Pick<CodexUsagePanelSummaryProps, "averageWeeklyKg" | "latestSnapshot"> & {
  result: CodexUsageAdminResponse;
}) {
  return (
    <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-white/30">Dernière mise à jour</p>
      <p className="mt-2 text-3xl font-black text-white">{formatDate(result.snapshot?.generatedAt ?? latestSnapshot?.generatedAt ?? null)}</p>
      <p className="mt-2 text-xs leading-relaxed text-white/45">Source: {latestSnapshot?.source ?? "—"}.</p>
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-3">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">Moyenne hebdo</p>
        <p className="mt-1 text-sm font-black text-white">{formatKg(averageWeeklyKg)}</p>
      </div>
    </article>
  );
}

export function CodexUsagePanelSummary({
  aggregate,
  averageWeeklyKg,
  latestSnapshot,
  result,
}: CodexUsagePanelSummaryProps) {
  if (!result) {
    return (
      <div className="rounded-3xl border border-white/5 bg-white/5 p-4 text-sm leading-relaxed text-white/45">
        Aucun journal Codex n&apos;a encore été enregistré. Le premier envoi crée une semaine pivot qui servira ensuite au calcul mensuel.
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <CodexUsageLatestSummary aggregate={aggregate} latestSnapshot={latestSnapshot} result={result} />
      <CodexUsageUpdateSummary averageWeeklyKg={averageWeeklyKg} latestSnapshot={latestSnapshot} result={result} />
    </div>
  );
}
