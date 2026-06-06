import {
  Bot,
  Eye,
  FileText,
  Image as ImageIcon,
  Layers3,
  MapPinned,
  Server,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";
import { ENVIRONMENTAL_IMPACT_POST_DEFINITIONS } from "@/lib/environmental-impact-estimator/constants";
import type { EnvironmentalImpactEstimateModel, EnvironmentalImpactDataGapNote } from "@/lib/environmental-impact-estimator/types";
import type { EnvironmentalImpactProjectSignals, EnvironmentalImpactSnapshotRecord } from "@/lib/environmental-impact-estimator/types";
import { EnvironmentalImpactProjectSignalsPanel } from "./environmental-impact-project-signals-panel";
import { EnvironmentalImpactCurveChart } from "./environmental-impact-curve-chart";

type EnvironmentalImpactEstimatorPanelProps = {
  model: EnvironmentalImpactEstimateModel;
  signals?: EnvironmentalImpactProjectSignals | null;
  snapshots?: EnvironmentalImpactSnapshotRecord[];
  className?: string;
};

const ICONS = {
  pageViews: Eye,
  storedImages: ImageIcon,
  apiRequests: Server,
  pdfExports: FileText,
  maps: MapPinned,
  storageGbMonths: Layers3,
  aiCalls: Bot,
} as const;

function formatQuantity(value: number | null, unitLabel: string) {
  if (value === null) {
    return "—";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: unitLabel === "GB-mois" ? 2 : 0,
  }).format(value)} ${unitLabel}`;
}

function formatProxyMass(value: number | null) {
  if (value === null) {
    return "—";
  }

  if (value >= 1) {
    return `${new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 3,
    }).format(value)} kg CO2e proxy`;
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value * 1000)} g CO2e proxy`;
}

function getScopeTone(status: EnvironmentalImpactEstimateModel["site"]["status"]) {
  if (status === "ready") {
    return "text-emerald-300";
  }
  if (status === "partial") {
    return "text-amber-300";
  }
  return "text-red-300";
}

function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getDataGapScopeLabel(scope: EnvironmentalImpactDataGapNote["scope"]) {
  switch (scope) {
    case "site":
      return "Site";
    case "user":
      return "Utilisateur";
    case "infrastructure":
      return "Infrastructure";
    case "history":
      return "Historique";
    default:
      return "Donnée";
  }
}

function getDataGapTone(severity: EnvironmentalImpactDataGapNote["severity"]) {
  return severity === "warn"
    ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
    : "border-sky-400/20 bg-sky-400/10 text-sky-100";
}

function getUsageProvenanceTone(source: "input" | "derived" | "reference") {
  switch (source) {
    case "input":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
    case "derived":
      return "border-amber-400/20 bg-amber-400/10 text-amber-100";
    case "reference":
      return "border-slate-400/20 bg-slate-400/10 text-slate-100";
    default:
      return "border-white/10 bg-white/5 text-red-100";
  }
}

const DOCUMENTATION_DOWNLOADS = [
  {
    title: "Fonctionnement du graphique",
    description:
      "Télécharge la méthode détaillée du tracé, les règles de calcul et la lecture des points hebdomadaires.",
    href: "/api/documentation/graphique-impact-co2e",
    filename: "graphique_impact_CO2e.md",
  },
  {
    title: "Atelier DU",
    description:
      "Télécharge le résumé des ateliers DU qui ont nourri les arbitrages de sobriété et de lisibilité.",
    href: "/api/documentation/atelier_DU",
    filename: "atelier_DU.md",
  },
  {
    title: "Journal DU",
    description:
      "Télécharge le journal court des décisions et des évolutions liées à l'impact.",
    href: "/api/documentation/journal_DU",
    filename: "journal_DU.md",
  },
] as const;

type ReductionAction = {
  title: string;
  detail: string;
  serviceLabel: string;
  sharePercent: number;
};

function formatSharePercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value)} %`;
}

function formatSecondOrderQuantity(value: number | null, unitLabel: string) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  const maximumFractionDigits =
    unitLabel === "kWh" ? 1 : unitLabel === "L" ? 0 : unitLabel === "kg CO2 brut" ? 3 : 2;

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits,
  }).format(value)} ${unitLabel}`;
}

function formatLifecycleQuantity(value: number | null, unitLabel: string) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  const maximumFractionDigits =
    unitLabel === "kWh" || unitLabel === "kg CO2e" ? 1 : unitLabel === "L" ? 0 : 2;

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits,
  }).format(value)} ${unitLabel}`;
}

function buildReductionAction(service: {
  key: string;
  label: string;
  sharePercent: number;
}): ReductionAction {
  switch (service.key) {
    case "vercel":
      return {
        title: "Réduire la charge Vercel",
        detail:
          "Favoriser les pages statiques, réduire les fonctions serverless, alléger les bundles et mettre davantage en cache pour diminuer le trafic servi.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "supabase":
      return {
        title: "Rationaliser Supabase",
        detail:
          "Regrouper les écritures, limiter les requêtes répétées, réduire le realtime non utile et nettoyer le stockage pour faire baisser les transferts.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "codex":
      return {
        title: "Canaliser l'usage Codex",
        detail:
          "Concentrer les sessions IA sur des lots précis, réduire les relances, réutiliser les prompts et limiter les tests inutiles pour baisser l'impact du développement assisté.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "resend":
      return {
        title: "Mutualiser les envois Resend",
        detail:
          "Regrouper les lots d'email, éviter les doublons et ne garder que les notifications utiles pour réduire les envois sortants.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "posthog":
      return {
        title: "Alléger la télémétrie",
        detail:
          "Filtrer les événements peu utiles, éviter la sur-instrumentation et privilégier des mesures synthétiques pour diminuer le volume de suivi.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "clerk":
      return {
        title: "Réduire les cycles Clerk",
        detail:
          "Limiter les refreshs de session, les redirections d'auth et les vérifications redondantes pour réduire les appels d'authentification.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "upstash":
      return {
        title: "Batcher les opérations Upstash",
        detail:
          "Regrouper les accès cache et queue, éviter les allers-retours superflus et supprimer les opérations temporaires non nécessaires.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "pinecone":
      return {
        title: "Limiter les requêtes Pinecone",
        detail:
          "Réduire les appels de recherche vectorielle, mieux invalider les index et ne lancer les requêtes que sur les parcours réellement utiles.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "sentry":
      return {
        title: "Filtrer le bruit Sentry",
        detail:
          "Réduire les erreurs bruitées et les logs redondants pour garder uniquement les signaux de qualité réellement utiles au diagnostic.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "stripe":
      return {
        title: "Éviter les opérations Stripe inutiles",
        detail:
          "Conserver un flux de paiement compact, éviter les appels de test non nécessaires et réduire les opérations répétées.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    case "lwsDomain":
      return {
        title: "Stabiliser le domaine LWS",
        detail:
          "Conserver un domaine unique, limiter les sous-domaines superflus et réduire les requêtes DNS inutiles pour garder le coût fixe bas.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
    default:
      return {
        title: `Réduire la charge ${service.label}`,
        detail:
          "Prioriser les usages visibles, supprimer les requêtes ou calculs non essentiels et concentrer l'optimisation sur ce service.",
        serviceLabel: service.label,
        sharePercent: service.sharePercent,
      };
  }
}

function buildTopReductionActions(
  services: Array<{ key: string; label: string; monthlyKgCo2eProxy: number | null; sharePercent: number }>,
): ReductionAction[] {
  return services
    .filter((service) => (service.monthlyKgCo2eProxy ?? 0) > 0)
    .sort((a, b) => (b.monthlyKgCo2eProxy ?? 0) - (a.monthlyKgCo2eProxy ?? 0))
    .map((service) =>
      buildReductionAction({
        key: service.key,
        label: service.label,
        sharePercent: service.sharePercent,
      }),
    )
    .slice(0, 3);
}

export function EnvironmentalImpactEstimatorPanel({
  model,
  signals,
  snapshots = [],
  className,
}: EnvironmentalImpactEstimatorPanelProps) {
  const classes = getBlockClasses("impact");
  const isUnbound = model.site.status === "unbound" && model.user.status === "unbound";
  const dataGapNotes: EnvironmentalImpactDataGapNote[] = [
    ...model.dataGaps,
    ...(snapshots.length === 0
      ? [
          {
            key: "history.snapshots",
            title: "Historique Supabase encore vide",
            detail:
              "Aucun snapshot n'a encore été enregistré. La lecture reste calculée à partir des signaux courants et ne dispose pas encore d'un historique enregistré.",
            scope: "history",
            severity: "info",
          } satisfies EnvironmentalImpactDataGapNote,
        ]
      : []),
  ];
  const topReductionActions = buildTopReductionActions(model.infrastructure.services);

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] border p-6 shadow-2xl md:p-8",
        classes.surface,
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative z-10 space-y-8">
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
            d&apos;infrastructure et les sources de calcul sans masquer les
            zones encore non branchées.
          </p>
        </header>

        {model.validation.issues.length > 0 ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
            <TriangleAlert className="mt-0.5 shrink-0 text-amber-300" size={18} />
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
                    {new Intl.NumberFormat("fr-FR", {
                      maximumFractionDigits: 0,
                    }).format(typeof item.value === "number" ? item.value : Number(item.value))}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-red-100/45">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>

            <EnvironmentalImpactProjectSignalsPanel
              signals={signals.signalBreakdown}
            />

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
                  <div key={bucket.label} className="rounded-2xl border border-white/10 bg-black/10 p-3">
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
                            {new Intl.NumberFormat("fr-FR", {
                              maximumFractionDigits: item.value >= 10 ? 0 : 2,
                            }).format(item.value)}
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
                      {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
                        signals.codexUsage.monthlyEquivalent.sessionCount,
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                      Minutes actives
                    </p>
                    <p className="mt-1 text-sm font-black text-white">
                      {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
                        signals.codexUsage.monthlyEquivalent.activeMinutes,
                      )}
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
                      {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
                        signals.codexUsage.confidencePercent,
                      )}
                      %
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
                      {new Intl.NumberFormat("fr-FR", {
                        maximumFractionDigits: 0,
                      }).format(scope.coveragePercent)}
                      %
                    </p>
                  </div>
                </div>

                <div className="mt-4 text-xs leading-relaxed text-red-100/45">
                  {scope.availablePostCount} postes renseignés,{" "}
                  {scope.missingPostCount} postes encore non branchés.
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
                {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
                  model.infrastructure.confidencePercent,
                )}
                %
              </p>
              <p className="mt-2 text-xs leading-relaxed text-red-100/45">
                Incertitude proxy ±
                {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
                  model.infrastructure.uncertaintyPercent,
                )}
                %.
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
                  className={cn(
                    "rounded-[1.35rem] border p-4",
                    getDataGapTone(note.severity),
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                        {getDataGapScopeLabel(note.scope)}
                      </p>
                      <p className="mt-1 text-sm font-black text-white">
                        {note.title}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                      {note.severity}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-white/80">
                    {note.detail}
                  </p>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <section className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/35">
                  Documents à télécharger
                </p>
                <h4 className="mt-1 text-lg font-black tracking-tight text-white">
                  Méthode, ateliers et journal
                </h4>
              </div>
              <p className="text-xs leading-relaxed text-red-100/40">
                Les fichiers sont servis en téléchargement direct.
              </p>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {DOCUMENTATION_DOWNLOADS.map((doc) => (
                <a
                  key={doc.href}
                  href={doc.href}
                  download={doc.filename}
                  className="rounded-2xl border border-white/10 bg-black/10 p-4 transition hover:border-white/20 hover:bg-white/10"
                >
                  <p className="text-sm font-black text-white">{doc.title}</p>
                  <p className="mt-2 text-xs leading-relaxed text-red-100/45">
                    {doc.description}
                  </p>
                  <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                    Télécharger {doc.filename}
                  </p>
                </a>
              ))}
            </div>
          </section>

          <section className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/35">
                Prochaines actions à plus fort impact
              </p>
              <h4 className="mt-1 text-lg font-black tracking-tight text-white">
                3 leviers pour faire baisser le total affiché
              </h4>
            </div>

            <div className="mt-4 space-y-3">
              {topReductionActions.length > 0 ? (
                topReductionActions.map((action, index) => (
                  <article
                    key={`${action.serviceLabel}-${index}`}
                    className="rounded-2xl border border-white/10 bg-black/10 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                          Priorité {index + 1}
                        </p>
                        <h5 className="mt-1 text-sm font-black text-white">{action.title}</h5>
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/45">
                        {formatSharePercent(action.sharePercent)}
                      </p>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-red-100/45">
                      {action.detail}
                    </p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                      Service concerné: {action.serviceLabel}
                    </p>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-xs leading-relaxed text-red-100/45">
                  Aucune action prioritaire n&apos;est encore calculable tant que les
                  services restent au niveau de référence.
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/35">
                Deuxième ordre
              </p>
              <h4 className="mt-1 text-lg font-black tracking-tight text-white">
                Décomposition environnementale détaillée
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-red-100/40">
              Le total est réparti entre CO2 brut, électricité, autres GES,
              produits chimiques et eau.
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {model.infrastructure.secondOrder.factorEstimates.map((factor) => (
              <article
                key={factor.key}
                className="rounded-2xl border border-white/10 bg-black/10 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">{factor.label}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                      {formatSharePercent(factor.sharePercent)}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/45">
                    {factor.source}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-red-100/45">
                  {formatSecondOrderQuantity(factor.quantity, factor.unitLabel)}
                </p>
                <p className="mt-2 text-sm font-black text-white">
                  {formatProxyMass(factor.estimatedKgCo2eProxy)}
                </p>
                <p className="mt-2 text-[10px] leading-relaxed text-red-100/40">
                  {factor.rationale}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                  Total deuxième ordre
                </p>
                <p className="mt-1 text-lg font-black text-white">
                  {formatProxyMass(model.infrastructure.secondOrder.totalKgCo2eProxy)}
                </p>
              </div>
              <p className="text-xs leading-relaxed text-red-100/40">
                Ce total doit rester cohérent avec le premier ordre et servir
                seulement à décomposer le signal.
              </p>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-red-100/45">
              {model.infrastructure.secondOrder.notes.join(" ")}
            </p>
          </div>
        </section>

        <section className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/35">
                Empreinte matérielle et cycle de vie
              </p>
              <h4 className="mt-1 text-lg font-black tracking-tight text-white">
                Énergie, carbone, eau, matière et fin de vie
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-red-100/40">
              Cette couche décrit l&apos;empreinte lifecycle du projet sans la
              confondre avec le CO2e opérationnel.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                  Total lifecycle
                </p>
                <p className="mt-1 text-lg font-black text-white">
                  {formatProxyMass(model.lifecycle.totalKgCo2eProxy)}
                </p>
              </div>
              <p className="max-w-xl text-xs leading-relaxed text-red-100/40">
                {model.lifecycle.notes.join(" ")}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {model.lifecycle.axisEstimates.map((axis) => (
              <article
                key={axis.key}
                className="rounded-2xl border border-white/10 bg-black/10 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">{axis.label}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                      {formatSharePercent(axis.sharePercent)}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/45">
                    {axis.source}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-red-100/45">
                  {formatLifecycleQuantity(axis.quantity, axis.unitLabel)}
                </p>
                <p className="mt-2 text-sm font-black text-white">
                  {formatProxyMass(axis.estimatedKgCo2eProxy)}
                </p>
                <p className="mt-2 text-[10px] leading-relaxed text-red-100/40">
                  {axis.rationale}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {model.lifecycle.componentEstimates.map((component) => (
              <article
                key={component.key}
                className="rounded-2xl border border-white/10 bg-black/10 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">{component.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-red-100/45">
                      {component.description}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/45">
                    {formatSharePercent(component.sharePercent)}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-red-100/45">
                  {formatLifecycleQuantity(component.quantity, component.unitLabel)}
                </p>
                <p className="mt-2 text-sm font-black text-white">
                  {formatProxyMass(component.estimatedKgCo2eProxy)}
                </p>
                <p className="mt-2 text-[10px] leading-relaxed text-red-100/40">
                  {component.rationale}
                </p>
              </article>
            ))}
          </div>
        </section>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
                Services d&apos;infrastructure
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-white">
                Vercel, Supabase, GPT-5.4 mini, Codex et les autres postes visibles
              </h3>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-red-100/45">
                GPT-5.4 mini — développement du site et les sessions Codex sont suivis comme deux
                postes distincts ACV, chacun avec ses propres hypothèses et son propre poids dans
                le calcul.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-red-100/50">
              {model.infrastructure.mode === "measured"
                ? model.infrastructure.usage.source === "input"
                  ? "usage dynamique"
                  : "dérivé"
                : "référence"}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {model.infrastructure.services.map((service) => (
              <article
                key={service.key}
                className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">{service.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-red-100/45">
                      {service.description}
                    </p>
                  </div>
                  <span className={cn(
                    "rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em]",
                    service.status === "ready"
                      ? "text-emerald-200"
                      : service.status === "derived"
                        ? "text-sky-200"
                      : service.status === "partial"
                        ? "text-amber-200"
                        : "text-red-200",
                  )}>
                    {service.status === "derived" ? "dérivé" : service.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                      Mensuel
                    </p>
                    <p className="mt-1 text-sm font-black text-white">
                      {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(
                        service.monthlyKgCo2eProxy ?? 0,
                      )}{" "}
                      kg
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                      Annuel
                    </p>
                    <p className="mt-1 text-sm font-black text-white">
                      {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(
                        service.annualKgCo2eProxy ?? 0,
                      )}{" "}
                      kg
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                  {service.sourceNote}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-red-100/45">
                  {service.metricCount} métrique
                  {service.metricCount > 1 ? "s" : ""}, {service.referenceMetricCount} en
                  référence. Part du total mensuel:{" "}
                  {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(
                    service.sharePercent,
                  )}
                  %.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-red-100/45">
                  Confiance:{" "}
                  {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
                    service.confidencePercent,
                  )}
                  %, incertitude: ±
                  {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
                    service.uncertaintyPercent,
                  )}
                  %.
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Pages vues / mois",
              value: model.infrastructure.usage.monthlyPageViews,
            },
            {
              label: "Utilisateurs actifs / mois",
              value: model.infrastructure.usage.monthlyActiveUsers,
            },
            {
              label: "Croissance mensuelle",
              value: `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(
                model.infrastructure.usage.growthRateMonthly * 100,
              )}%`,
            },
            {
              label: "Horizon de projection",
              value: `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
                model.infrastructure.usage.horizonMonths,
              )} mois`,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                {item.label}
              </p>
              <p className="mt-2 text-lg font-black text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
                Détail des postes
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-white">
                Lecture auditable, ligne par ligne
              </h3>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-red-100/50">
              Hypothèses versionnées
            </div>
          </div>

          <div className="space-y-3">
            {ENVIRONMENTAL_IMPACT_POST_DEFINITIONS.map((definition) => {
              const sitePost = model.site.posts.find(
                (post) => post.key === definition.key,
              );
              const userPost = model.user.posts.find(
                (post) => post.key === definition.key,
              );
              const Icon = ICONS[definition.key];

              return (
                <article
                  key={definition.key}
                  className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 md:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)_minmax(220px,1fr)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/10 text-red-200">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white">
                        {definition.label}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-red-100/45">
                        {definition.description}
                      </p>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-100/35">
                        {definition.proxyRationale}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100/35">
                      Site
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {formatQuantity(sitePost?.quantity ?? null, definition.unitLabel)}
                    </p>
                    <p className="mt-1 text-xs text-red-100/45">
                      {formatProxyMass(sitePost?.estimatedKgCo2eProxy ?? null)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100/35">
                      Utilisateur
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {formatQuantity(userPost?.quantity ?? null, definition.unitLabel)}
                    </p>
                    <p className="mt-1 text-xs text-red-100/45">
                      {formatProxyMass(userPost?.estimatedKgCo2eProxy ?? null)}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <article className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
              Hypothèses retenues
            </p>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-red-100/55">
              {model.methodology.hypotheses.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
              Limites et garde-fous
            </p>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-red-100/55">
              {model.methodology.limitations.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="text-red-300" />
            <div>
              <p className="text-sm font-black text-white">
                Structure prête pour le rapport d&apos;impact IA
              </p>
              <p className="text-xs leading-relaxed text-red-100/45">
                Les postes sont déjà modélisés pour accueillir des flux réels
                sans casser le contrat de calcul ni la lisibilité du rapport.
              </p>
            </div>
          </div>
        </div>

        {snapshots.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
                  Historique Supabase
                </p>
                <h3 className="mt-1 text-xl font-black tracking-tight text-white">
                  Snapshots enregistrés du calculateur
                </h3>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-red-100/50">
                {snapshots.length} snapshot{snapshots.length > 1 ? "s" : ""}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {snapshots.slice(0, 4).map((snapshot) => (
                <article
                  key={`${snapshot.snapshotKey}-${snapshot.snapshotDate}`}
                  className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                    {snapshot.snapshotDate}
                  </p>
                  <p className="mt-2 text-sm font-black text-white">
                    {formatProxyMass(snapshot.totalKgCo2eProxy)}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-red-100/45">
                    Confiance {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
                      snapshot.confidencePercent,
                    )}
                    %, généré le {formatShortDate(snapshot.generatedAt)}.
                  </p>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
