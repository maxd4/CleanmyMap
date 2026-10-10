"use client";

import { RefreshCcw, TriangleAlert } from "lucide-react";
import { AdminPanelShell } from "@/components/admin/admin-panel-shell";
import { EnvironmentalImpactProjectSignalsPanel } from "@/components/admin/environmental-impact-project-signals-panel";
import { cn } from "@/lib/utils";
import { EnvironmentalImpactCapturePanelServiceRisks } from "./environmental-impact-capture-panel-service-risks";
import { EnvironmentalImpactCapturePanelSummary } from "./environmental-impact-capture-panel-summary";
import { projectEnvironmentalImpactCapture } from "./environmental-impact-capture-panel.model";
import { useEnvironmentalImpactCapture } from "./use-environmental-impact-capture";

export function EnvironmentalImpactCapturePanel() {
  const { result, error, isPending, triggerCapture } = useEnvironmentalImpactCapture();
  const projection = projectEnvironmentalImpactCapture(result);

  return (
    <AdminPanelShell
      title="Capture d'impact environnemental"
      subtitle="Déclenche une capture manuelle pour remplir l'historique Supabase sans attendre le cron."
      headerAction={
        <button
          type="button"
          onClick={triggerCapture}
          disabled={isPending}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          <RefreshCcw size={12} className={cn(isPending && "animate-spin")} />
          {isPending ? "Capture..." : "Capturer maintenant"}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
              Déclenchement
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              Lance une capture serveur et enregistre un snapshot daté dans Supabase.
            </p>
          </article>
          <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
              Protection
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              Route réservée aux comptes admin et max via `requireAdminAccess`.
            </p>
          </article>
          <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
              Historique
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              Alimente l&apos;historique utilisé par la courbe hebdomadaire.
            </p>
          </article>
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-100">
            <TriangleAlert className="mt-0.5 shrink-0" size={18} />
            <div>
              <p className="text-sm font-black">Capture impossible</p>
              <p className="mt-1 text-xs leading-relaxed text-rose-100/80">{error}</p>
            </div>
          </div>
        ) : null}

        {result ? (
          <>
            <EnvironmentalImpactCapturePanelSummary
              result={result}
              latestSnapshot={projection.latestSnapshot}
            />
            <EnvironmentalImpactProjectSignalsPanel
              signals={result.signals?.signalBreakdown}
            />
            {projection.serviceRiskProjections.length > 0 ? (
              <EnvironmentalImpactCapturePanelServiceRisks
                projections={projection.serviceRiskProjections}
              />
            ) : null}
          </>
        ) : (
          <div className="rounded-3xl border border-white/5 bg-white/5 p-4 text-sm leading-relaxed text-white/45">
            Aucune capture manuelle n&apos;a encore été lancée. Le bouton ci-dessus
            déclenche la même logique que le cron et remplit l&apos;historique.
          </div>
        )}
      </div>
    </AdminPanelShell>
  );
}
