import { EnvironmentalImpactCurveChart } from "./environmental-impact-curve-chart";
import { EnvironmentalImpactProjectSignalsPanel } from "./environmental-impact-project-signals-panel";
import {
  formatProxyMass,
  formatShortDate,
  getDataGapScopeLabel,
  getDataGapTone,
  getScopeTone,
  getUsageProvenanceTone,
} from "./environmental-impact-estimator-panel.helpers";
import type {
  EnvironmentalImpactDataGapNote,
  EnvironmentalImpactEstimateModel,
  EnvironmentalImpactProjectSignals,
} from "@/lib/environmental-impact-estimator/types";
import { cn } from "@/lib/utils";

type EnvironmentalImpactEstimatorPanelOverviewProps = {
  model: EnvironmentalImpactEstimateModel;
  signals?: EnvironmentalImpactProjectSignals | null;
  dataGapNotes: EnvironmentalImpactDataGapNote[];
  isUnbound: boolean;
};

function formatCount(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatProvenanceCount(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: value >= 10 ? 0 : 2,
  }).format(value);
}

export function EnvironmentalImpactEstimatorPanelOverview({
  model,
  signals,
  dataGapNotes,
  isUnbound,
}: EnvironmentalImpactEstimatorPanelOverviewProps) {
  return (
    <>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
            Estimateur d&apos;impact environnemental
          </h2>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-red-100/50">
            {model.version}
          </span>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-red-100/45 md:text-base">
          Socle transparent, documenté et extensible. Les lignes ci-dessous
          exposent les postes visibles, les hypothèses, les services
          d&apos;infrastructure et les sources de calcul sans masquer les zones
          encore non branchées.
        </p>
      </header>

      {model.validation.issues.length > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
          <div className="mt-0.5 shrink-0 text-amber-300">!</div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-amber-100">
              Données d&apos;entrée à corriger
            </p>
            <ul className="space-y-1 text-xs leading-relaxed text-amber-100/75">
              {model.validation.issues.map((issue) => (
                <li key={`${issue.path}-${issue.message}`}>
                  <span className="font-semibold">{issue.path}</span>: {issue.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {isUnbound ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-red-100/55">
          Aucune source n&apos;est encore branchée. L&apos;estimateur conserve
          néanmoins sa structure complète pour rendre visibles les futurs
          flux, poste par poste.
        </div>
      ) : null}

      {signals ? (
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
                <p className="mt-2 text-xs leading-relaxed text-red-100/45">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>

          <EnvironmentalImpactProjectSignalsPanel signals={signals.signalBreakdown} />

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
                  <p className="mt-1 text-xs leading-relaxed text-red-100/45">{bucket.detail}</p>
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
                    <p className="mt-2 text-xs leading-relaxed text-red-100/45">{item.detail}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

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
              <p className="mt-2 text-sm font-black text-white">
                {formatShortDate(signals.launchedAt)}
              </p>
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
              <p className="mt-2 text-sm font-black text-white">
                {signals.recentWindowDays} jours
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
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
                  <span className="block text-red-100/30">
                    Compte créé le {scope.accountCreatedAt}.
                  </span>
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
            <p className="mt-2 text-xs leading-relaxed text-red-100/45">
              Incertitude proxy ±
              {formatCount(model.infrastructure.uncertaintyPercent)}%.
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-white/10 bg-black/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
              Période
            </p>
            <p className="mt-2 text-2xl font-black tracking-tight text-white">
              {model.infrastructure.referencePeriodMonths} mois
            </p>
            <p className="mt-2 text-xs leading-relaxed text-red-100/45">
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
            <p className="mt-2 text-xs leading-relaxed text-red-100/45">
              {model.validation.valid
                ? "Le socle est cohérent et prêt à afficher les signaux projet."
                : "Des entrées restent à corriger avant la lecture finale."}
            </p>
          </div>
        </div>
      </div>

      <EnvironmentalImpactCurveChart
        site={model.site}
        user={model.user}
        infrastructure={model.infrastructure}
        signals={signals ?? null}
      />

      {dataGapNotes.length > 0 ? (
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
                  <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                    {note.severity}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-white/80">{note.detail}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
