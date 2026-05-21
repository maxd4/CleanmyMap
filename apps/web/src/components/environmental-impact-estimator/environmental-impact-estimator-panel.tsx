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
import {
  ENVIRONMENTAL_IMPACT_POST_DEFINITIONS,
} from "@/lib/environmental-impact-estimator";
import type { EnvironmentalImpactEstimateModel } from "@/lib/environmental-impact-estimator";
import type { EnvironmentalImpactDataGapNote } from "@/lib/environmental-impact-estimator";
import type {
  EnvironmentalImpactProjectSignals,
  EnvironmentalImpactSnapshotRecord,
} from "@/lib/environmental-impact-estimator";
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

        <div className="grid gap-4 md:grid-cols-2">
          {[model.site, model.user].map((scope) => (
            <article
              key={scope.key}
              className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
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

        <EnvironmentalImpactCurveChart infrastructure={model.infrastructure} />

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/40">
                Services d&apos;infrastructure
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-white">
                Vercel, Supabase, Resend et les autres postes web visibles
              </h3>
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
