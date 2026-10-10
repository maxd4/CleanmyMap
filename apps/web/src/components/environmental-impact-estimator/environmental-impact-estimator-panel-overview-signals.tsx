import { EnvironmentalImpactProjectSignalsPanel } from "./environmental-impact-project-signals-panel";
import { formatCount, formatProxyMass, formatShortDate } from "./environmental-impact-estimator-panel.helpers";
import { EnvironmentalImpactEstimatorPanelOverviewProvenance } from "./environmental-impact-estimator-panel-overview-provenance";
import type {
  EnvironmentalImpactEstimateModel,
  EnvironmentalImpactProjectSignals,
} from "@/lib/environmental-impact-estimator/types";

type EnvironmentalImpactEstimatorPanelOverviewSignalsProps = {
  model: EnvironmentalImpactEstimateModel;
  signals: EnvironmentalImpactProjectSignals;
};

export function EnvironmentalImpactEstimatorPanelOverviewSignals({
  model,
  signals,
}: EnvironmentalImpactEstimatorPanelOverviewSignalsProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
            Signaux projet CleanMyMap
          </p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-white">
            Données réellement branchées dans le calcul
          </h3>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-red-100/50">
          {formatShortDate(signals.generatedAt)}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {signals.highlights.slice(0, 4).map((item) => (
          <div
            key={item.label}
            className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
              {item.label}
            </p>
            <p className="mt-2 text-xl font-black text-white">
              {formatCount(
                typeof item.value === "number" ? item.value : Number(item.value),
              )}
            </p>
            <p className="cmm-text-small cmm-text-inverse mt-2">{item.detail}</p>
          </div>
        ))}
      </div>

      <EnvironmentalImpactProjectSignalsPanel signals={signals.signalBreakdown} />
      <EnvironmentalImpactEstimatorPanelOverviewProvenance model={model} />

      {signals.codexUsage ? (
        <div className="rounded-[1.35rem] border border-white/10 bg-black/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                Journal Codex
              </p>
              <h4 className="mt-1 text-lg font-black text-white">
                Historique hebdomadaire spécifique au projet
              </h4>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-red-100/50">
              {signals.codexUsage.weekCount} semaine
              {signals.codexUsage.weekCount > 1 ? "s" : ""}
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                Sessions / mois
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {formatCount(signals.codexUsage.monthlyEquivalent.sessionCount)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                Minutes actives
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {formatCount(signals.codexUsage.monthlyEquivalent.activeMinutes)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                kg CO2e proxy
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {formatProxyMass(signals.codexUsage.estimatedKgCo2eProxy)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                Confiance
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {formatCount(signals.codexUsage.confidencePercent)}%
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[1.35rem] border border-white/10 bg-black/10 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
            Mise en ligne
          </p>
          <p className="mt-2 text-sm font-black text-white">{formatShortDate(signals.launchedAt)}</p>
        </div>
        <div className="rounded-[1.35rem] border border-white/10 bg-black/10 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
            Compte utilisateur
          </p>
          <p className="mt-2 text-sm font-black text-white">
            {formatShortDate(signals.accountCreatedAt)}
          </p>
        </div>
        <div className="rounded-[1.35rem] border border-white/10 bg-black/10 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
            Fenêtre récente
          </p>
          <p className="mt-2 text-sm font-black text-white">{signals.recentWindowDays} jours</p>
        </div>
      </div>
    </div>
  );
}
