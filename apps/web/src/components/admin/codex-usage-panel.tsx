"use client";

import { RefreshCcw, TriangleAlert } from "lucide-react";
import { AdminPanelShell } from "@/components/admin/admin-panel-shell";
import { cn } from "@/lib/utils";
import { CodexUsagePanelForm } from "./codex-usage-panel-form";
import { CodexUsagePanelHistory } from "./codex-usage-panel-history";
import { CodexUsagePanelSummary } from "./codex-usage-panel-summary";
import { useCodexUsagePanel } from "./use-codex-usage-panel";

function CodexUsageIntro() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-white/30">Source</p>
        <p className="mt-2 text-sm font-semibold text-white">
          Journal hebdomadaire manuel, importé ou reconstruit à partir de l&apos;activité réelle du projet.
        </p>
      </article>
      <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-white/30">Conversion</p>
        <p className="mt-2 text-sm font-semibold text-white">
          Le calcul transforme sessions, conversations, actions outillées et temps actif en kg CO2e proxy.
        </p>
      </article>
      <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-white/30">Historique</p>
        <p className="mt-2 text-sm font-semibold text-white">
          Le calculateur lit ensuite les 4 dernières semaines pour produire l&apos;équivalent mensuel.
        </p>
      </article>
    </div>
  );
}

function CodexUsageError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-100">
      <TriangleAlert className="mt-0.5 shrink-0" size={18} />
      <div>
        <p className="text-sm font-black">Erreur Codex</p>
        <p className="mt-1 text-xs leading-relaxed text-rose-100/80">{message}</p>
      </div>
    </div>
  );
}

export function CodexUsagePanel() {
  const {
    aggregate,
    averageWeeklyKg,
    error,
    form,
    isLoading,
    isSaving,
    latestSnapshot,
    result,
    save,
    updateField,
  } = useCodexUsagePanel();

  return (
    <AdminPanelShell
      title="Journal Codex hebdomadaire"
      subtitle="Enregistre l'activité Codex — développement du site semaine par semaine pour produire un historique CleanMyMap spécifique au projet."
      headerAction={
        <button
          type="button"
          onClick={() => void save()}
          disabled={isSaving}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          <RefreshCcw size={12} className={cn(isSaving && "animate-spin")} />
          {isSaving ? "Enregistrement..." : "Enregistrer la semaine"}
        </button>
      }
    >
      <div className="space-y-4">
        <CodexUsageIntro />
        {error ? <CodexUsageError message={error} /> : null}
        <CodexUsagePanelForm form={form} onChange={updateField} />
        <CodexUsagePanelSummary
          aggregate={aggregate}
          averageWeeklyKg={averageWeeklyKg}
          latestSnapshot={latestSnapshot}
          result={result}
        />
        <CodexUsagePanelHistory snapshots={result?.snapshots} />
        {isLoading ? (
          <div className="rounded-3xl border border-white/5 bg-white/5 p-4 text-sm leading-relaxed text-white/45">
            Chargement de l&apos;historique Codex...
          </div>
        ) : null}
      </div>
    </AdminPanelShell>
  );
}
