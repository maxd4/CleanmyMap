import { cn } from "@/lib/utils";
import type { EnvironmentalImpactEstimateModel } from "@/lib/environmental-impact-estimator/types";
import {
  formatCount,
  formatProxyMass,
  getScopeTone,
} from "./environmental-impact-estimator-panel.helpers";

type EnvironmentalImpactEstimatorPanelOverviewImpactSummaryProps = {
  model: EnvironmentalImpactEstimateModel;
  isUnbound: boolean;
};

export function EnvironmentalImpactEstimatorPanelOverviewImpactSummary({
  model,
  isUnbound,
}: EnvironmentalImpactEstimatorPanelOverviewImpactSummaryProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
      <p
        className="xl:col-span-2 text-xs font-medium text-red-100/55"
        title="Repère documentaire basé sur Impact CO₂ et la Base Empreinte ADEME; il ne constitue pas une conversion des données CleanMyMap."
      >
        Repère : 10 kgCO₂e ≈ 70 km en voiture thermique moyenne.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {[model.site, model.user].map((scope) => (
          <article
            key={scope.key}
            className={cn(
              "rounded-[1.5rem] border p-5",
              scope.key === "site"
                ? "border-amber-400/20 bg-amber-400/5"
                : "border-sky-400/20 bg-sky-400/5",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className={cn(
                    "text-[10px] font-black uppercase tracking-[0.22em]",
                    scope.key === "site" ? "text-amber-100/55" : "text-sky-100/55",
                  )}
                >
                  {scope.periodLabel}
                </p>
                <h3 className="mt-2 text-lg font-black tracking-tight text-white">
                  {scope.label}
                </h3>
              </div>
              <span
                className={cn(
                  "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
                  getScopeTone(scope.status),
                )}
              >
                {scope.status === "ready"
                  ? "branché"
                  : scope.status === "partial"
                    ? "partiel"
                    : "non branché"}
              </span>
            </div>

            <div
              className={cn(
                "mt-4 h-1.5 rounded-full",
                scope.key === "site"
                  ? "bg-gradient-to-r from-amber-300/80 via-amber-400/60 to-transparent"
                  : "bg-gradient-to-r from-sky-300/80 via-sky-400/60 to-transparent",
              )}
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
                  Impact estimé
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-white">
                  {formatProxyMass(scope.totalKgCo2eProxy)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
                  Couverture
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-white">
                  {formatCount(scope.coveragePercent)}%
                </p>
              </div>
            </div>

            <div className="mt-4 text-xs leading-relaxed text-red-100/45">
              {scope.availablePostCount} postes renseignés, {scope.missingPostCount} postes
              encore non branchés.
              {scope.accountCreatedAt ? (
                <span className="block text-red-100/30">Compte créé le {scope.accountCreatedAt}.</span>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div className="rounded-[1.35rem] border border-white/10 bg-black/10 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
            Confiance méthodologique
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-white">
            {formatCount(model.infrastructure.confidencePercent)}%
          </p>
          <p className="cmm-text-small cmm-text-inverse mt-2">
            Incertitude proxy ±{formatCount(model.infrastructure.uncertaintyPercent)}%.
          </p>
        </div>
        <div className="rounded-[1.35rem] border border-white/10 bg-black/10 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
            Période
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-white">
            {model.infrastructure.referencePeriodMonths} mois
          </p>
          <p className="cmm-text-small cmm-text-inverse mt-2">
            Graphique découpé en une semaine par point, depuis la mise en ligne.
          </p>
        </div>
        <div className="rounded-[1.35rem] border border-white/10 bg-black/10 p-4 sm:col-span-2 xl:col-span-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
            État
          </p>
          <p className="mt-2 text-sm font-black text-white">
            {isUnbound ? "Structure prête, pas encore branchée" : "Lecture dynamique active"}
          </p>
          <p className="cmm-text-small cmm-text-inverse mt-2">
            {model.validation.valid
              ? "Le socle est cohérent et prêt à afficher les signaux projet."
              : "Des entrées restent à corriger avant la lecture finale."}
          </p>
        </div>
      </div>
    </div>
  );
}
