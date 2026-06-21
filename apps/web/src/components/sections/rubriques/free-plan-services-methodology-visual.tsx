"use client";

import { useMemo, useState, type ReactElement } from "react";
import {
  BarChart3,
  Bot,
  Bell,
  CreditCard,
  ExternalLink,
  Database,
  Fingerprint,
  Globe,
  GitBranch,
  Leaf,
  Mail,
  Monitor,
  PieChart,
  MoreHorizontal,
  Plug,
  Radar,
  ShieldAlert,
  Sparkles,
  Triangle,
  Zap,
  Cloud,
  type LucideIcon,
} from "lucide-react";
import type {
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactInfrastructureMetricKey,
  EnvironmentalImpactInfrastructureServiceKey,
} from "@/lib/environmental-impact-estimator/types";
import type { GitHubRepositoryStats } from "@/lib/github/github-repository-stats";
import { getServicePlanInfo, type ServicePlanType } from "@/lib/environmental-impact-estimator/service-plan";
import {
  buildServiceQuotaSummary,
  formatServiceQuotaStateLabel,
  isDevelopmentAiServiceKey,
  type ServiceQuotaMetricSummary,
  type ServiceQuotaState,
} from "@/lib/environmental-impact-estimator/service-risk";
import { cn } from "@/lib/utils";

type QuotaDisplayServiceKey = "supabase" | "vercel" | "github" | "resend" | "posthog" | "lwsDomain";

type MethodologyTabKey = "quota" | "impact";

type DisplayService = {
  key: QuotaDisplayServiceKey;
  label: string;
  icon: LucideIcon;
  accent: string;
  service: EnvironmentalImpactInfrastructureServiceEstimate | null;
  planType: ServicePlanType;
  price: string;
  state: ServiceQuotaState;
  primaryMetric: ServiceQuotaMetricSummary | null;
  metrics: ServiceQuotaMetricSummary[];
  summary: string;
  details: string[];
  linkHref: string | null;
  linkLabel: string | null;
};

type ImpactSelectionKey =
  | EnvironmentalImpactInfrastructureServiceKey
  | "other"
  | "development";

type ImpactDetailBadge = {
  label: string;
  tone: "slate" | "rose";
};

type ImpactDetailMetric = {
  label: string;
  descriptionLabel?: string;
  valueLabel: string;
  statusLabel: "mesuré" | "estimé" | "à compléter";
};

type ImpactDetailPostSpec = {
  label: string;
  description: string;
  metricKey?: EnvironmentalImpactInfrastructureMetricKey;
};

type ImpactDetailSelection = {
  key: ImpactSelectionKey;
  title: string;
  subtitle: string;
  badgeLabels: ImpactDetailBadge[];
  contributionPercentLabel: string;
  contributionValueLabel: string;
  serviceRows: ImpactDetailMetric[];
};

type ServiceIconCardProps = {
  service: DisplayService;
  selected: boolean;
  onSelect: (key: QuotaDisplayServiceKey) => void;
  onHover: (key: QuotaDisplayServiceKey | null) => void;
};

const TAB_ITEMS = [
  { key: "quota", label: "Quotas & plans", icon: PieChart },
  { key: "impact", label: "Impact carbone", icon: Leaf },
] as const;

const DISPLAY_ORDER: Array<{ key: QuotaDisplayServiceKey; label: string; icon: LucideIcon; accent: string }> = [
  { key: "supabase", label: "Supabase", icon: Zap, accent: "#34d399" },
  { key: "vercel", label: "Vercel", icon: Triangle, accent: "#111827" },
  { key: "github", label: "GitHub", icon: GitBranch, accent: "#111827" },
  { key: "resend", label: "Resend", icon: Mail, accent: "#f97316" },
  { key: "posthog", label: "PostHog", icon: BarChart3, accent: "#f97316" },
  { key: "lwsDomain", label: "LWS", icon: Globe, accent: "#ef4444" },
];

const IMPACT_VISUALS: Record<
  EnvironmentalImpactInfrastructureServiceKey,
  { icon: LucideIcon; color: string }
> = {
  vercel: { icon: Triangle, color: "#111827" },
  github: { icon: GitBranch, color: "#111827" },
  supabase: { icon: Zap, color: "#34d399" },
  resend: { icon: Mail, color: "#f97316" },
  chatgpt: { icon: Sparkles, color: "#ef4444" },
  codex: { icon: Bot, color: "#ef4444" },
  clerk: { icon: Fingerprint, color: "#6366f1" },
  posthog: { icon: BarChart3, color: "#f97316" },
  sentry: { icon: ShieldAlert, color: "#f43f5e" },
  upstash: { icon: Plug, color: "#22c55e" },
  pinecone: { icon: Radar, color: "#14b8a6" },
  stripe: { icon: CreditCard, color: "#8b5cf6" },
  lwsDomain: { icon: Globe, color: "#ef4444" },
};

const SUPABASE_IMPACT_POSTS: ImpactDetailPostSpec[] = [
  {
    label: "Base de données",
    description: "Stockage PostgreSQL, tables, index, historiques, logs.",
  },
  {
    label: "Requêtes base de données",
    description: "Lectures, écritures, agrégations, requêtes lourdes.",
    metricKey: "supabaseDbRequests",
  },
  {
    label: "Storage",
    description: "Photos, exports PDF, images, pièces jointes.",
    metricKey: "supabaseStorageGbMonths",
  },
  {
    label: "Bande passante",
    description: "Fichiers servis, images téléchargées, exports récupérés.",
    metricKey: "supabaseEgressGb",
  },
  {
    label: "Edge Functions",
    description: "Exécutions serveur et calculs.",
  },
  {
    label: "Backups",
    description: "Sauvegardes et rétention.",
  },
  {
    label: "Logs",
    description: "Volume conservé.",
  },
];

const VERCEL_IMPACT_POSTS: ImpactDetailPostSpec[] = [
  {
    label: "Builds",
    description: "Compilation Next.js, previews, déploiements.",
    metricKey: "vercelDeployments",
  },
  {
    label: "Hébergement frontend",
    description: "Pages servies, rendu serveur, routes dynamiques.",
    metricKey: "vercelPageViews",
  },
  {
    label: "Serverless Functions",
    description: "Exécutions backend, durée, mémoire.",
    metricKey: "vercelFunctionInvocations",
  },
  {
    label: "Edge Middleware / Edge Functions",
    description: "Traitements à la requête.",
  },
  {
    label: "Bande passante",
    description: "JS, CSS, images, polices, assets.",
    metricKey: "vercelBandwidthGb",
  },
  {
    label: "Image Optimization",
    description: "Transformations, cache, variantes générées.",
  },
  {
    label: "Preview deployments",
    description: "Environnements de test conservés.",
  },
  {
    label: "Logs",
    description: "Volume et durée de conservation.",
  },
];

const GITHUB_IMPACT_POSTS: ImpactDetailPostSpec[] = [
  {
    label: "Stockage du dépôt",
    description: "Code source, historique Git, branches, tags.",
  },
  {
    label: "GitHub Actions",
    description: "CI/CD, tests, lint, builds automatiques.",
    metricKey: "githubWorkflowRunsCount30d",
  },
  {
    label: "Artefacts CI",
    description: "Rapports, caches, fichiers générés.",
  },
  {
    label: "Packages / Registry",
    description: "Stockage et transferts si utilisé.",
  },
  {
    label: "Clones et téléchargements",
    description: "Bande passante du dépôt.",
  },
  {
    label: "Pull requests",
    description: "Déclenchement indirect de builds et previews.",
  },
];

const RESEND_IMPACT_POSTS: ImpactDetailPostSpec[] = [
  {
    label: "Emails envoyés",
    description: "Notifications, emails transactionnels.",
    metricKey: "resendEmailsSent",
  },
  {
    label: "Taille des emails",
    description: "HTML, images, pièces jointes éventuelles.",
  },
  {
    label: "Templates",
    description: "Rendu et génération.",
  },
  {
    label: "Webhooks",
    description: "Appels sortants.",
  },
  {
    label: "Logs d'emails",
    description: "Événements, erreurs, statuts.",
  },
  {
    label: "Réessais d'envoi",
    description: "Emails échoués puis renvoyés.",
  },
];

const POSTHOG_IMPACT_POSTS: ImpactDetailPostSpec[] = [
  {
    label: "Événements collectés",
    description: "Vues, clics, actions utilisateur.",
    metricKey: "posthogEvents",
  },
  {
    label: "Sessions enregistrées",
    description: "Session replay si activé.",
  },
  {
    label: "Profils utilisateurs",
    description: "Propriétés et identifiants.",
  },
  {
    label: "Feature flags",
    description: "Évaluations client ou serveur.",
  },
  {
    label: "Dashboards",
    description: "Calculs analytiques.",
  },
  {
    label: "Rétention",
    description: "Durée de conservation.",
  },
  {
    label: "Exports",
    description: "CSV, API ou extraction externe.",
  },
];

const LWS_IMPACT_POSTS: ImpactDetailPostSpec[] = [
  {
    label: "Nom de domaine",
    description: "Enregistrement et gestion DNS.",
    metricKey: "lwsDomainYears",
  },
  {
    label: "DNS",
    description: "Requêtes de résolution.",
    metricKey: "lwsDnsQueries",
  },
  {
    label: "Emails ou redirections",
    description: "Utilisés si activés.",
  },
  {
    label: "Hébergement",
    description: "Si activé.",
  },
  {
    label: "Certificats SSL",
    description: "Si gérés par LWS.",
  },
  {
    label: "Services additionnels",
    description: "Sauvegardes, anti-spam, sécurité, monitoring.",
  },
];

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "NA";
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)}%`;
}

function formatFallbackStatusLabel(kind: "kpi" | "history" | "quota"): string {
  switch (kind) {
    case "kpi":
      return "Non calculé";
    case "history":
      return "Aucune période précédente";
    case "quota":
      return "Historique insuffisant";
    default:
      return "Non calculé";
  }
}

function formatImpactValueLabel(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "valeur à compléter";
  }

  return formatImpactKg(value);
}

function formatMaybePercent(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "valeur à compléter";
  }

  return formatPercent(value);
}

function formatImpactQuantityLabel(
  quantity: number | null | undefined,
  unitLabel: string,
): string {
  if (typeof quantity !== "number" || Number.isNaN(quantity)) {
    return "non mesuré";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: quantity < 1 || unitLabel.includes("GB") ? 2 : 0,
  }).format(quantity)} ${unitLabel}`;
}

function getImpactRowStatusLabel(
  source: "input" | "derived" | "reference" | null | undefined,
): ImpactDetailMetric["statusLabel"] {
  if (source === "input") {
    return "mesuré";
  }

  if (source === "derived" || source === "reference") {
    return "estimé";
  }

  return "à compléter";
}

function getImpactDetailBadges(key: ImpactSelectionKey, isFrench: boolean): ImpactDetailBadge[] {
  if (key === "development") {
    return [
      { label: isFrench ? "développement IA" : "development AI", tone: "rose" },
      { label: isFrench ? "hors quotas web" : "outside web quotas", tone: "rose" },
    ];
  }

  if (key === "other") {
    return [{ label: isFrench ? "autres services" : "other services", tone: "slate" }];
  }

  return [{ label: isFrench ? "service web" : "web service", tone: "slate" }];
}

function formatImpactKg(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "NA";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  }).format(value)} kg`;
}

function formatCount(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "NA";
  }

  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
}

function getPlanTone(planType: ServicePlanType): string {
  switch (planType) {
    case "gratuit":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "payant":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "étudiant":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "sponsorisé":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-500";
  }
}

function getStateTone(state: ServiceQuotaState): string {
  switch (state) {
    case "dépassé":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "proche limite":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "attention":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "ok":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-500";
  }
}

function getMetricFillClass(state: ServiceQuotaState): string {
  switch (state) {
    case "dépassé":
      return "bg-rose-600";
    case "proche limite":
      return "bg-rose-500";
    case "attention":
      return "bg-rose-400";
    case "ok":
      return "bg-rose-300";
    default:
      return "bg-slate-300";
  }
}

function getTabTone(active: boolean): string {
  return active
    ? "border-rose-300 bg-rose-50 text-rose-700 shadow-[0_12px_30px_-24px_rgba(244,63,94,0.45)]"
    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";
}

function getTabIconTone(active: boolean): string {
  return active ? "text-rose-500" : "text-slate-500";
}

function getImpactVisual(serviceKey: EnvironmentalImpactInfrastructureServiceKey): {
  icon: LucideIcon;
  color: string;
} {
  return IMPACT_VISUALS[serviceKey];
}

export function buildImpactDetailRows(
  service: EnvironmentalImpactInfrastructureServiceEstimate,
  isFrench: boolean,
): ImpactDetailMetric[] {
  if (service.key === "supabase") {
    const metricByKey = new Map(service.metricEstimates.map((metric) => [metric.key, metric]));

    return SUPABASE_IMPACT_POSTS.map((post) => {
      const metric = post.metricKey ? metricByKey.get(post.metricKey) ?? null : null;

      return {
        label: post.label,
        descriptionLabel: post.description,
        valueLabel: metric
          ? formatImpactQuantityLabel(metric.quantityPerMonth, metric.unitLabel)
          : isFrench
            ? "non mesuré"
            : "not measured",
        statusLabel: getImpactRowStatusLabel(metric?.source),
      };
    });
  }

  if (service.key === "vercel") {
    const metricByKey = new Map(service.metricEstimates.map((metric) => [metric.key, metric]));

    return VERCEL_IMPACT_POSTS.map((post) => {
      const metric = post.metricKey ? metricByKey.get(post.metricKey) ?? null : null;

      return {
        label: post.label,
        descriptionLabel: post.description,
        valueLabel: metric
          ? formatImpactQuantityLabel(metric.quantityPerMonth, metric.unitLabel)
          : isFrench
            ? "non mesuré"
            : "not measured",
        statusLabel: getImpactRowStatusLabel(metric?.source),
      };
    });
  }

  if (service.key === "github") {
    const metricByKey = new Map(service.metricEstimates.map((metric) => [metric.key, metric]));

    return GITHUB_IMPACT_POSTS.map((post) => {
      const metric = post.metricKey ? metricByKey.get(post.metricKey) ?? null : null;

      return {
        label: post.label,
        descriptionLabel: post.description,
        valueLabel: metric
          ? formatImpactQuantityLabel(metric.quantityPerMonth, metric.unitLabel)
          : isFrench
            ? "non mesuré"
            : "not measured",
        statusLabel: getImpactRowStatusLabel(metric?.source),
      };
    });
  }

  if (service.key === "resend") {
    const metricByKey = new Map(service.metricEstimates.map((metric) => [metric.key, metric]));

    return RESEND_IMPACT_POSTS.map((post) => {
      const metric = post.metricKey ? metricByKey.get(post.metricKey) ?? null : null;

      return {
        label: post.label,
        descriptionLabel: post.description,
        valueLabel: metric
          ? formatImpactQuantityLabel(metric.quantityPerMonth, metric.unitLabel)
          : isFrench
            ? "non mesuré"
            : "not measured",
        statusLabel: getImpactRowStatusLabel(metric?.source),
      };
    });
  }

  if (service.key === "posthog") {
    const metricByKey = new Map(service.metricEstimates.map((metric) => [metric.key, metric]));

    return POSTHOG_IMPACT_POSTS.map((post) => {
      const metric = post.metricKey ? metricByKey.get(post.metricKey) ?? null : null;

      return {
        label: post.label,
        descriptionLabel: post.description,
        valueLabel: metric
          ? formatImpactQuantityLabel(metric.quantityPerMonth, metric.unitLabel)
          : isFrench
            ? "non mesuré"
            : "not measured",
        statusLabel: getImpactRowStatusLabel(metric?.source),
      };
    });
  }

  if (service.key === "lwsDomain") {
    const metricByKey = new Map(service.metricEstimates.map((metric) => [metric.key, metric]));

    return LWS_IMPACT_POSTS.map((post) => {
      const metric = post.metricKey ? metricByKey.get(post.metricKey) ?? null : null;

      return {
        label: post.label,
        descriptionLabel: post.description,
        valueLabel: metric
          ? formatImpactQuantityLabel(metric.quantityPerMonth, metric.unitLabel)
          : isFrench
            ? "non mesuré"
            : "not measured",
        statusLabel: getImpactRowStatusLabel(metric?.source),
      };
    });
  }

  return service.metricEstimates.map((metric) => ({
    label: metric.label,
    descriptionLabel: undefined,
    valueLabel:
      metric.quantityPerMonth === null
        ? "non mesuré"
        : `${new Intl.NumberFormat("fr-FR", {
            maximumFractionDigits: metric.unitLabel.includes("GB") ? 2 : 0,
          }).format(metric.quantityPerMonth)} ${metric.unitLabel}`,
    statusLabel: getImpactRowStatusLabel(metric.source),
  }));
}

function getMetricIcon(metricKey: string): LucideIcon {
  if (metricKey.includes("supabaseDb")) return Database;
  if (metricKey.includes("supabaseAuth")) return ShieldAlert;
  if (metricKey.includes("supabaseStorage")) return Database;
  if (metricKey.includes("supabaseRealtime")) return Monitor;
  if (metricKey.includes("supabaseEgress")) return Globe;
  if (metricKey.includes("vercelPageViews")) return Monitor;
  if (metricKey.includes("vercelFunction")) return Zap;
  if (metricKey.includes("vercelDeployments")) return Triangle;
  if (metricKey.includes("vercelBandwidth")) return Globe;
  if (metricKey.includes("github")) return GitBranch;
  if (metricKey.includes("resend")) return Mail;
  if (metricKey.includes("posthog")) return BarChart3;
  if (metricKey.includes("lwsDomain")) return Globe;
  if (metricKey.includes("lwsDns")) return Globe;
  return ShieldAlert;
}

function renderMetricIcon(metricKey: string): ReactElement {
  const Icon = getMetricIcon(metricKey);
  return <Icon size={16} />;
}

function TabPill({
  tab,
  active,
  onClick,
}: {
  tab: (typeof TAB_ITEMS)[number];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-medium shadow-[0_10px_30px_-24px_rgba(15,23,42,0.3)] transition",
        getTabTone(active),
      )}
    >
      <Icon size={18} className={getTabIconTone(active)} />
      <span>{tab.label}</span>
    </button>
  );
}

function buildDisplayedServices(
  services: EnvironmentalImpactInfrastructureServiceEstimate[],
  githubStats: GitHubRepositoryStats | null,
): DisplayService[] {
  const webServices = services.filter((service) => !isDevelopmentAiServiceKey(service.key));
  const serviceByKey = new Map(webServices.map((service) => [service.key, service] as const));

  return DISPLAY_ORDER.map((definition) => {
    if (definition.key === "github") {
      const dependabotCount = githubStats?.dependabotOpenAlertsCount;
      const warningCount = githubStats?.codeScanningWarningCount;
      const hasSecuritySignals =
        typeof dependabotCount === "number" || typeof warningCount === "number";
      const details = [
        githubStats?.actionsQuotaLabel ?? formatFallbackStatusLabel("kpi"),
        ...(githubStats?.actionsNotes ?? []),
        githubStats?.workflowRunsCount30d == null
          ? `Runs GitHub Actions sur 30 jours: ${formatFallbackStatusLabel("history")}`
          : `Runs GitHub Actions sur 30 jours: ${formatCount(githubStats.workflowRunsCount30d)}`,
        dependabotCount === null
          ? `Dependabot: ${formatFallbackStatusLabel("kpi")}`
          : `Dependabot: ${dependabotCount}`,
        warningCount === null
          ? `Warnings: ${formatFallbackStatusLabel("kpi")}`
          : `Warnings: ${warningCount}`,
      ];

      return {
        ...definition,
        service: null,
        planType: "gratuit",
        price: "NA",
        state: hasSecuritySignals
          ? dependabotCount === 0 && warningCount === 0
            ? "ok"
            : "attention"
          : "NA",
        primaryMetric: null,
        metrics: [],
        summary:
          githubStats === null
            ? formatFallbackStatusLabel("kpi")
            : `Repo ${githubStats.isPrivate ? "privé" : "public"} · Actions ${githubStats.isPrivate ? "quota" : "gratuites et illimitées"}`,
        details,
        linkHref: githubStats?.htmlUrl ?? "https://github.com/maxd4/CleanmyMap",
        linkLabel: "Repo GitHub",
      };
    }

    const service = serviceByKey.get(definition.key) ?? null;
    const quotaSummary = service ? buildServiceQuotaSummary(service) : null;
    const planInfo = getServicePlanInfo(definition.key);

    if (definition.key === "resend") {
      const resendEmailsMetric =
        quotaSummary?.metrics.find((metric) => metric.key === "resendEmailsSent") ?? null;
      const resendEmailsSummary = resendEmailsMetric
        ? {
            ...resendEmailsMetric,
            isPrimary: true,
          }
        : null;
      const resendEmailsSentText = resendEmailsSummary
        ? `${formatCount(resendEmailsSummary.quantityPerMonth)} / ${formatCount(
            resendEmailsSummary.referenceMonthlyQuantity,
          )}`
        : "NA";

      return {
        ...definition,
        service,
        planType: planInfo.type,
        price: planInfo.price,
        state: resendEmailsSummary?.state ?? "NA",
        primaryMetric: resendEmailsSummary,
        metrics: resendEmailsSummary ? [resendEmailsSummary] : [],
        summary: resendEmailsSummary
          ? `${resendEmailsSummary.label} · ${resendEmailsSentText} · ${formatServiceQuotaStateLabel(resendEmailsSummary.state)}`
          : formatFallbackStatusLabel("quota"),
        details: [
          "Transactionnel: 3 000 emails / mois",
          "Transactionnel: 100 emails / jour",
          `Emails envoyés: ${resendEmailsSentText}`,
          `Emails reçus: ${formatFallbackStatusLabel("quota")}`,
          "Marketing: 1 000 contacts",
          "Marketing: broadcasts illimités",
          "Destinataires multiples comptés séparément",
        ],
        linkHref: null,
        linkLabel: null,
      };
    }

    const details = [
      ...(planInfo.cycleResetLabel ? [planInfo.cycleResetLabel] : []),
      ...(planInfo.notes ?? []),
      ...(definition.key === "lwsDomain"
        ? [
            "2 Go d’hébergement web",
            "2 adresses e-mails pro",
            "2 Go par boîte mail",
            "10 000 e-mails stockés par boîte",
            "Pièce jointe jusqu’à 25 Mo",
          ]
        : []),
    ];

    return {
      ...definition,
      service,
      planType: planInfo.type,
      price: planInfo.price,
      state: quotaSummary?.state ?? "NA",
      primaryMetric: quotaSummary?.primaryMetric ?? null,
      metrics: quotaSummary?.metrics ?? [],
      summary: quotaSummary?.primaryMetric
        ? `${quotaSummary.primaryMetric.label} · ${formatPercent(quotaSummary.primaryMetric.consumedPercent)} · ${formatServiceQuotaStateLabel(quotaSummary.primaryMetric.state)}`
        : formatFallbackStatusLabel("quota"),
      details,
      linkHref: null,
      linkLabel: null,
    };
  });
}

function ServiceIconCard({ service, selected, onSelect, onHover }: ServiceIconCardProps) {
  const Icon = service.icon;
  const primarySummary = service.summary;

  return (
    <button
      type="button"
      onClick={() => onSelect(service.key)}
      onMouseEnter={() => onHover(service.key)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(service.key)}
      onBlur={() => onHover(null)}
      className={cn(
        "group rounded-[1.4rem] border bg-white p-4 text-left shadow-[0_10px_30px_-24px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-24px_rgba(15,23,42,0.28)]",
        selected ? "border-rose-300 ring-1 ring-rose-200" : "border-slate-200",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50"
          style={{
            color: service.accent,
            boxShadow: `inset 0 0 0 1px ${service.accent}1c`,
          }}
        >
          <Icon size={24} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-black text-slate-950">{service.label}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold capitalize", getPlanTone(service.planType))}>
                  {service.planType}
                </span>
                {service.price !== "NA" ? (
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700">
                    {service.price}
                  </span>
                ) : service.planType === "NA" ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500">
                    NA
                  </span>
                ) : null}
              </div>
            </div>

            <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold capitalize", getStateTone(service.state))}>
              {service.state === "NA" ? formatFallbackStatusLabel("quota") : formatServiceQuotaStateLabel(service.state)}
            </span>
          </div>

          <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
            {primarySummary}
          </p>
          {service.details.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {service.details.map((detail) => (
                <span
                  key={detail}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600"
                >
                  {detail}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function QuotaMetricRow({ metric }: { metric: ServiceQuotaMetricSummary }) {
  const width = metric.consumedPercent === null ? 0 : Math.max(2, Math.min(100, metric.consumedPercent));
  const missingLabel = metric.source === "reference" ? "Non calculé" : "Historique insuffisant";
  const stateLabel =
    metric.state === "NA" ? missingLabel : formatServiceQuotaStateLabel(metric.state);

  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-rose-600">
          {renderMetricIcon(metric.key)}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{metric.label}</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                {metric.consumedPercent === null
                  ? missingLabel
                  : `Réf. ${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
                      metric.referenceMonthlyQuantity,
                    )} ${metric.unitLabel}`}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[13px] font-black text-slate-950">
                {metric.consumedPercent === null ? missingLabel : formatPercent(metric.consumedPercent)}
              </p>
              <p className="text-[11px] font-medium text-slate-500">{stateLabel}</p>
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-rose-100">
            {metric.consumedPercent === null ? (
              <div className="h-full w-full rounded-full border border-dashed border-slate-300 bg-transparent" />
            ) : (
              <div
                className={cn("h-full rounded-full", getMetricFillClass(metric.state))}
                style={{ width: `${width}%` }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FreePlanServicesMethodologyVisual({
  services,
  impactTotals,
  githubStats,
  isFrench = true,
  initialTab = "impact",
  displayMode = "both",
  sectionId = "impact-services",
}: {
  services: EnvironmentalImpactInfrastructureServiceEstimate[];
  githubStats?: GitHubRepositoryStats | null;
  impactTotals?: {
    monthlyKgCo2eProxy: number | null;
    annualKgCo2eProxy: number | null;
    totalKgCo2eProxy: number | null;
    generatedAt: string | null;
  };
  isFrench?: boolean;
  initialTab?: MethodologyTabKey;
  displayMode?: "both" | MethodologyTabKey;
  sectionId?: string;
}) {
  const resolvedImpactTotals = impactTotals ?? {
    monthlyKgCo2eProxy: null,
    annualKgCo2eProxy: null,
    totalKgCo2eProxy: null,
    generatedAt: null,
  };
  const displayedServices = useMemo(
    () => buildDisplayedServices(services, githubStats ?? null),
    [githubStats, services],
  );
  const initialSelectedKey = displayedServices.find((service) => service.key === "supabase")?.key ?? displayedServices[0]?.key ?? "github";
  const [selectedKey, setSelectedKey] = useState<QuotaDisplayServiceKey>(initialSelectedKey);
  const [hoveredKey, setHoveredKey] = useState<QuotaDisplayServiceKey | null>(null);
  const initialDisplayTab = displayMode === "both" ? initialTab : displayMode;
  const [activeTab, setActiveTab] = useState<MethodologyTabKey>(initialDisplayTab);
  const [selectedImpactKey, setSelectedImpactKey] = useState<ImpactSelectionKey | null>(null);

  const activeKey = hoveredKey ?? selectedKey;
  const selectedService =
    displayedServices.find((service) => service.key === activeKey) ?? displayedServices[0] ?? null;
  const SelectedIcon = selectedService?.icon ?? PieChart;
  const paidPlansCount = displayedServices.filter((service) => service.planType === "payant").length;
  const nearLimitCount = displayedServices.filter(
    (service) => service.state === "proche limite" || service.state === "dépassé",
  ).length;
  const totalMonthlyKgCo2eProxy = displayedServices.reduce(
    (sum, service) => sum + (service.service?.monthlyKgCo2eProxy ?? 0),
    0,
  );

  const title = isFrench ? "Quotas & plans des services web" : "Web services quotas and plans";
  const subtitle = isFrench
    ? "L'onglet quotas répond à une seule question: est-ce qu'un service risque de dépasser son plan ? GitHub est relié au dépôt réel."
    : "The quota tab answers one question: is a service at risk of exceeding its plan? GitHub is linked to the real repository.";

  if (activeTab === "impact") {
    const impactServices = services
      .filter((service) => typeof service.monthlyKgCo2eProxy === "number")
      .slice()
      .sort((left, right) => {
        const byCharge = (right.monthlyKgCo2eProxy ?? 0) - (left.monthlyKgCo2eProxy ?? 0);
        if (byCharge !== 0) {
          return byCharge;
        }

        return left.label.localeCompare(right.label, "fr");
      });
    const developmentImpactServices = impactServices.filter((service) =>
      isDevelopmentAiServiceKey(service.key),
    );
    const productionImpactServices = impactServices.filter(
      (service) => !isDevelopmentAiServiceKey(service.key),
    );
    const activeProductionImpactServices = productionImpactServices.filter(
      (service) => (service.monthlyKgCo2eProxy ?? 0) > 0,
    );
    const inactiveProductionImpactServices = productionImpactServices.filter(
      (service) => (service.monthlyKgCo2eProxy ?? 0) <= 0,
    );
    const totalMonthlyImpact = impactServices.reduce(
      (sum, service) => sum + (service.monthlyKgCo2eProxy ?? 0),
      0,
    );
    const totalDevelopmentImpact = developmentImpactServices.reduce(
      (sum, service) => sum + (service.monthlyKgCo2eProxy ?? 0),
      0,
    );
    const totalAnnualImpact =
      resolvedImpactTotals.annualKgCo2eProxy ??
      (impactServices.every((service) => service.annualKgCo2eProxy !== null)
        ? impactServices.reduce((sum, service) => sum + (service.annualKgCo2eProxy ?? 0), 0)
        : null);
    const totalLifetimeImpact = resolvedImpactTotals.totalKgCo2eProxy;
    const developmentSharePercent =
      totalMonthlyImpact > 0 ? (totalDevelopmentImpact / totalMonthlyImpact) * 100 : null;
    const topProductionServices = activeProductionImpactServices.slice(0, 6);
    const groupedProductionServices = activeProductionImpactServices.slice(topProductionServices.length);
    const barSegments = [
      ...topProductionServices.map((service) => {
        const visual = getImpactVisual(service.key);
        const sharePercent = totalMonthlyImpact > 0 ? ((service.monthlyKgCo2eProxy ?? 0) / totalMonthlyImpact) * 100 : null;

        return {
          key: service.key,
          label: service.label,
          shortLabel: service.label.split(" — ")[0] ?? service.label,
          icon: visual.icon,
          color: visual.color,
          sharePercent,
          monthlyKgCo2eProxy: service.monthlyKgCo2eProxy ?? 0,
          kind: "production" as const,
          services: [service],
        };
      }),
      ...(totalDevelopmentImpact > 0
        ? [
            {
              key: "development" as const,
              label: isFrench ? "Développement IA" : "Development AI",
              shortLabel: isFrench ? "Développement" : "Development",
              icon: Sparkles,
              color: "#ef4444",
              sharePercent:
                totalMonthlyImpact > 0 ? (totalDevelopmentImpact / totalMonthlyImpact) * 100 : null,
              monthlyKgCo2eProxy: totalDevelopmentImpact,
              kind: "development" as const,
              services: developmentImpactServices,
            },
          ]
        : []),
      ...(groupedProductionServices.length > 0
        ? [
            {
              key: "other" as const,
              label: isFrench ? "Autres" : "Other",
              shortLabel: isFrench ? "Autres" : "Other",
              icon: MoreHorizontal,
              color: "#e5e7eb",
              sharePercent:
                totalMonthlyImpact > 0
                  ? (groupedProductionServices.reduce(
                      (sum, service) => sum + (service.monthlyKgCo2eProxy ?? 0),
                      0,
                    ) / totalMonthlyImpact) * 100
                  : null,
              monthlyKgCo2eProxy: groupedProductionServices.reduce(
                (sum, service) => sum + (service.monthlyKgCo2eProxy ?? 0),
                0,
              ),
              kind: "other" as const,
              services: groupedProductionServices,
            },
          ]
        : []),
    ];
    const topContributors = activeProductionImpactServices.slice(0, 6);
    const developmentLineLabel =
      developmentImpactServices.length > 0
        ? developmentImpactServices
            .map((service) => service.label)
            .join(" · ")
        : formatFallbackStatusLabel("history");
    const selectedImpactSegment = selectedImpactKey
      ? barSegments.find((segment) => segment.key === selectedImpactKey) ?? null
      : null;
    const selectedImpactSelection: ImpactDetailSelection | null = selectedImpactSegment
      ? {
          key: selectedImpactSegment.key,
          title:
            selectedImpactSegment.key === "other"
              ? isFrench
                ? "Autres services"
                : "Other services"
              : selectedImpactSegment.key === "development"
                ? selectedImpactSegment.label
                : selectedImpactSegment.label,
          subtitle:
            selectedImpactSegment.key === "other"
              ? isFrench
                ? "Services regroupés sous la portion négligeable"
                : "Grouped services under the negligible share"
              : selectedImpactSegment.key === "development"
                ? developmentImpactServices
                    .map((service) => service.label)
                    .join(" · ")
                : selectedImpactSegment.label,
          badgeLabels: getImpactDetailBadges(selectedImpactSegment.key, isFrench),
          contributionPercentLabel: formatMaybePercent(selectedImpactSegment.sharePercent),
          contributionValueLabel: formatImpactValueLabel(selectedImpactSegment.monthlyKgCo2eProxy),
          serviceRows:
            selectedImpactSegment.key === "development"
              ? developmentImpactServices.map((service) => ({
                  label: service.label,
                  descriptionLabel: isFrench ? "Développement IA" : "AI development",
                  valueLabel:
                    service.monthlyKgCo2eProxy === null
                      ? isFrench
                        ? "valeur à compléter"
                        : "value to complete"
                      : formatImpactValueLabel(service.monthlyKgCo2eProxy),
                  statusLabel:
                    service.monthlyKgCo2eProxy === null ? "à compléter" : "estimé",
                }))
              : selectedImpactSegment.key === "other"
                ? groupedProductionServices.map((service) => ({
                    label: service.label,
                    descriptionLabel: isFrench
                      ? "Contribution faible regroupée dans Autres."
                      : "Low contribution grouped in Other.",
                    valueLabel:
                      service.monthlyKgCo2eProxy === null
                        ? isFrench
                          ? "contribution négligeable ou non mesurée"
                          : "negligible or unmeasured contribution"
                        : formatImpactValueLabel(service.monthlyKgCo2eProxy),
                    statusLabel:
                      service.monthlyKgCo2eProxy === null ? "à compléter" : "estimé",
                  }))
                : selectedImpactSegment.services[0]
                  ? buildImpactDetailRows(selectedImpactSegment.services[0], isFrench)
                  : [],
        }
      : null;

    return (
      <section
        id={sectionId}
        className="rounded-[2.75rem] border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.24)] md:p-8"
      >
        <div className="space-y-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-rose-500/75">
                {isFrench ? "Pilotage de l'impact" : "Impact pilot"}
              </p>
              <h3 className="max-w-4xl text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                {isFrench ? "Impact carbone des services suivis" : "Carbon impact of tracked services"}
              </h3>
              <p className="max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">
                {isFrench
                  ? "Lecture linéaire de l'ACV numérique. L'onglet carbone répond à une question précise: quel poste contribue le plus à l'empreinte estimée ?"
                  : "Linear reading of the digital LCA. The carbon tab answers one question: which post contributes the most to the estimated footprint?"}
              </p>
            </div>

            {displayMode === "both" ? (
              <div className="flex flex-wrap gap-3">
                {TAB_ITEMS.map((tab) => (
                  <TabPill
                    key={tab.key}
                    tab={tab}
                    active={tab.key === activeTab}
                    onClick={() => setActiveTab(tab.key)}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)]">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                  <Cloud size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                    {isFrench ? "Impact carbone année en cours" : "Current year carbon impact"}
                  </p>
                  <p className="mt-2 text-4xl font-black text-rose-600">
                    {resolvedImpactTotals.monthlyKgCo2eProxy === null
                      ? formatFallbackStatusLabel("kpi")
                      : formatImpactKg(resolvedImpactTotals.monthlyKgCo2eProxy)}
                  </p>
                  <p className="mt-2 text-lg font-medium text-slate-600">
                    {isFrench
                      ? totalAnnualImpact === null
                        ? formatFallbackStatusLabel("kpi")
                        : `(${formatImpactKg(totalAnnualImpact)} projetés)`
                      : totalAnnualImpact === null
                        ? formatFallbackStatusLabel("kpi")
                        : `(${formatImpactKg(totalAnnualImpact)} projected)`}
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    {isFrench
                      ? "Projection de l'impact sur l'année entière"
                      : "Projection of the impact over the full year"}
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)] lg:text-right">
              <div className="flex items-start gap-4 lg:flex-row-reverse">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                  <Leaf size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                    {isFrench ? "Total carbone depuis la création du site" : "Total carbon since site creation"}
                  </p>
                  <p className="mt-2 text-4xl font-black text-rose-600">
                    {totalLifetimeImpact === null
                      ? formatFallbackStatusLabel("kpi")
                      : formatImpactKg(totalLifetimeImpact)}
                  </p>
                  <p className="mt-2 text-lg font-medium text-slate-600">
                    {developmentSharePercent === null
                      ? formatFallbackStatusLabel("history")
                      : isFrench
                        ? `(${formatPercent(developmentSharePercent)} lié au dev IA)`
                        : `(${formatPercent(developmentSharePercent)} linked to AI development)`}
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    {isFrench
                      ? "Lecture cumulée depuis le lancement du site"
                      : "Cumulative reading since site launch"}
                  </p>
                </div>
              </div>
            </article>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="rounded-[2.25rem] border border-rose-100 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(244,63,94,0.16)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h4 className="text-xl font-black text-slate-950">
                    {isFrench
                      ? "Contribution estimée à l'empreinte carbone (ACV)"
                      : "Estimated contribution to the carbon footprint (LCA)"}
                  </h4>
                </div>
                <div className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-rose-600">
                  {formatPercent(100)}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-start gap-5">
                {barSegments.length > 0 ? (
                  barSegments.map((segment) => {
                    const Icon = segment.icon;
                    const widthPercent = Math.max(0, segment.sharePercent ?? 0);
                    const isDevelopment = segment.kind === "development";
                    const isOther = segment.kind === "other";
                    const isSelected = selectedImpactKey === segment.key;

                    return (
                      <button
                        type="button"
                        key={segment.key}
                        className={cn(
                          "flex min-w-[92px] flex-1 flex-col items-center gap-2 rounded-[1.2rem] px-2 py-2 text-center transition",
                          isDevelopment && "border border-rose-300 border-dashed bg-rose-50/60",
                          isOther && "border border-slate-200 bg-slate-50",
                          isSelected && "ring-2 ring-rose-500 ring-offset-2 ring-offset-white",
                        )}
                        onClick={() => setSelectedImpactKey(segment.key)}
                        aria-pressed={isSelected}
                      >
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white"
                          style={{ color: segment.color }}
                        >
                          <Icon size={16} />
                        </span>
                        <div className="space-y-1">
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-900">
                            {isDevelopment ? "Développement IA" : segment.shortLabel}
                          </p>
                          {isDevelopment && developmentLineLabel !== "NA" ? (
                            <p className="text-[10px] leading-tight text-slate-500">{developmentLineLabel}</p>
                          ) : null}
                          {isDevelopment ? (
                            <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                              <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 text-[9px] font-semibold text-rose-600">
                                Inclus ACV
                              </span>
                              <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 text-[9px] font-semibold text-rose-600">
                                Hors production
                              </span>
                              <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 text-[9px] font-semibold text-rose-600">
                                Hors quotas web
                              </span>
                            </div>
                          ) : null}
                          <p
                            className={cn(
                              "text-sm font-black",
                              isDevelopment ? "text-rose-600" : "text-slate-900",
                            )}
                          >
                            {formatPercent(widthPercent)}
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    <p className="font-black text-slate-950">
                      {isFrench
                        ? "Services surveillés sans consommation récente"
                        : "Tracked services without recent consumption"}
                    </p>
                    <p className="mt-2 leading-relaxed">
                      {isFrench
                        ? "Aucun poste positif n'est encore disponible pour tracer une barre utile."
                        : "No positive post is available yet to draw a useful bar."}
                    </p>
                  </div>
                )}
              </div>

              {inactiveProductionImpactServices.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {isFrench
                      ? "Services surveillés sans consommation récente"
                      : "Tracked services without recent consumption"}
                  </p>
                  <p className="mt-2 leading-relaxed">
                    {inactiveProductionImpactServices.map((service) => service.label).join(" · ")}
                  </p>
                </div>
              ) : null}

              {barSegments.length > 0 ? (
                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  <div className="flex h-14 overflow-hidden">
                    {barSegments.map((segment) => {
                      const isDevelopment = segment.kind === "development";
                      const isOther = segment.kind === "other";
                      return (
                        <div
                          key={segment.key}
                          className={cn(
                            "flex items-center justify-center border-r border-white/60 last:border-r-0",
                            isDevelopment && "border-dashed border-rose-300",
                            isOther && "border-slate-300",
                          )}
                          style={{
                            width: `${Math.max(0, segment.sharePercent ?? 0)}%`,
                            minWidth: segment.sharePercent && segment.sharePercent > 0 ? "2rem" : undefined,
                            background:
                              isDevelopment
                                ? "linear-gradient(135deg, #ef4444 0%, #fb7185 100%)"
                                : isOther
                                  ? "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)"
                                  : `linear-gradient(135deg, ${segment.color} 0%, ${segment.color}dd 100%)`,
                          }}
                          title={`${segment.label} ${formatPercent(segment.sharePercent ?? null)}`}
                        >
                          {segment.sharePercent !== null && segment.sharePercent >= 7 ? (
                            <span
                              className={cn(
                                "text-[10px] font-black uppercase tracking-[0.18em]",
                                isOther ? "text-slate-700" : "text-white",
                              )}
                            >
                              {formatPercent(segment.sharePercent)}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mt-3 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                <span>0%</span>
                <span>{isFrench ? "Contribution relative au total ACV" : "Relative contribution to total LCA"}</span>
                <span>100%</span>
              </div>

              <section className="mt-5 rounded-[1.75rem] border border-rose-200 bg-rose-50/35 p-5 shadow-[0_18px_45px_-34px_rgba(244,63,94,0.16)]">
                {selectedImpactSelection ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-600/75">
                          {isFrench ? "Détail de la contribution" : "Contribution detail"}
                        </p>
                        <h4 className="text-2xl font-black tracking-tight text-slate-950">
                          {selectedImpactSelection.title}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedImpactSelection.badgeLabels.map((badge) => (
                            <span
                              key={badge.label}
                              className={cn(
                                "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
                                badge.tone === "rose"
                                  ? "border-rose-200 bg-white text-rose-600"
                                  : "border-slate-200 bg-white text-slate-600",
                              )}
                            >
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedImpactKey(null)}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-rose-700 transition hover:bg-rose-100"
                      >
                        <ExternalLink size={14} className="rotate-45" />
                        {isFrench ? "Fermer le détail" : "Close detail"}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-rose-700">
                        {isFrench ? "Part du total" : "Share of total"} {selectedImpactSelection.contributionPercentLabel}
                      </span>
                      <span className="rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-rose-700">
                        {isFrench ? "Contribution" : "Contribution"} {selectedImpactSelection.contributionValueLabel}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {selectedImpactSelection.serviceRows.length > 0 ? (
                        selectedImpactSelection.serviceRows.map((row) => (
                          <article
                            key={`${selectedImpactSelection.key}-${row.label}`}
                            className={cn(
                              "rounded-[1.15rem] border bg-white p-4 shadow-[0_12px_30px_-26px_rgba(244,63,94,0.18)]",
                              row.statusLabel === "mesuré"
                                ? "border-rose-200"
                                : row.statusLabel === "estimé"
                                  ? "border-rose-100"
                                  : "border-slate-200",
                            )}
                          >
                            <div className="flex h-full flex-col gap-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-slate-950">{row.label}</p>
                                  {row.descriptionLabel ? (
                                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                                      {row.descriptionLabel}
                                    </p>
                                  ) : null}
                                </div>
                                <span
                                  className={cn(
                                    "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
                                    row.statusLabel === "mesuré"
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : row.statusLabel === "estimé"
                                        ? "border-amber-200 bg-amber-50 text-amber-700"
                                        : "border-slate-200 bg-slate-50 text-slate-500",
                                  )}
                                >
                                  {row.statusLabel}
                                </span>
                              </div>

                              <p className="text-sm font-semibold text-slate-950">{row.valueLabel}</p>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="col-span-full rounded-[1.15rem] border border-dashed border-rose-200 bg-white p-4 text-sm text-slate-600">
                          {isFrench
                            ? "Aucun poste détaillé disponible."
                            : "No detailed post available."}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[1.15rem] border border-dashed border-rose-200 bg-white px-4 py-6 text-sm font-medium text-slate-600">
                    {isFrench
                      ? "Cliquez sur une portion du graphique pour afficher le détail de contribution."
                      : "Click a chart segment to show the contribution detail."}
                  </div>
                )}
              </section>

              <div className="mt-5 rounded-[1.6rem] border border-rose-200 bg-rose-50/60 p-4 text-sm leading-relaxed text-slate-700">
                {isFrench ? (
                  <>
                    Chaque lecture publique est enregistrée pour conserver l&apos;historique.
                    {" "}
                    {resolvedImpactTotals.generatedAt ? (
                      <span className="font-semibold text-slate-900">
                        Dernière lecture: {new Intl.DateTimeFormat("fr-FR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(resolvedImpactTotals.generatedAt))}
                        .
                      </span>
                    ) : null}
                  </>
                ) : (
                  <>
                    Each public reading is stored to preserve history.
                    {" "}
                    {resolvedImpactTotals.generatedAt ? (
                      <span className="font-semibold text-slate-900">
                        Latest reading: {new Intl.DateTimeFormat("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(resolvedImpactTotals.generatedAt))}
                        .
                      </span>
                    ) : null}
                  </>
                )}
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xl font-black text-slate-950">
                      {isFrench ? "Top contributeurs" : "Top contributors"}
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      {isFrench ? "(hors développement)" : "(excluding development)"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-[1.35rem] border border-slate-200">
                  {topContributors.length > 0 ? (
                    topContributors.map((service, index) => {
                      const visual = getImpactVisual(service.key);
                      const Icon = visual.icon;
                      const sharePercent =
                        totalMonthlyImpact > 0 ? ((service.monthlyKgCo2eProxy ?? 0) / totalMonthlyImpact) * 100 : null;

                      return (
                        <div key={service.key} className="flex items-center gap-3 bg-white px-3 py-3">
                          <div className="w-6 text-sm font-black text-slate-700">{index + 1}</div>
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                            style={{ color: visual.color }}
                          >
                            <Icon size={14} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">{service.label}</p>
                          </div>
                          <p className="text-sm font-black text-slate-700">
                            {formatPercent(sharePercent)}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-3 py-4 text-sm text-slate-500">NA</div>
                  )}
                </div>
              </section>

              <section className="rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)]">
                <h4 className="text-xl font-black text-slate-950">
                  {isFrench ? "Légende" : "Legend"}
                </h4>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span>{isFrench ? "Production web" : "Web production"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-rose-500" />
                    <span>{isFrench ? "Développement" : "Development"}</span>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="impact-services"
      className="rounded-[2.75rem] border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.24)] md:p-8"
    >
      <div className="space-y-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-rose-500/75">
              {isFrench ? "Pilotage des quotas" : "Quota pilot"}
            </p>
            <h3 className="max-w-4xl text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              {title}
            </h3>
            <p className="max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">
              {subtitle}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {TAB_ITEMS.map((tab) => (
              <TabPill
                key={tab.key}
                tab={tab}
                active={tab.key === activeTab}
                onClick={() => setActiveTab(tab.key)}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {displayedServices.map((service) => (
            <ServiceIconCard
              key={service.key}
              service={service}
              selected={service.key === activeKey}
              onSelect={setSelectedKey}
              onHover={setHoveredKey}
            />
          ))}
        </div>

        {githubStats ? (
          <div className="flex justify-end">
            <a
              href={githubStats.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.24)] transition hover:border-slate-300 hover:text-slate-900"
            >
              <ExternalLink size={14} />
              {isFrench ? "Ouvrir le repo GitHub" : "Open GitHub repo"}
            </a>
          </div>
        ) : null}

        <div className="rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50"
                style={{
                  color: selectedService?.accent ?? "#0f172a",
                  boxShadow: selectedService ? `inset 0 0 0 1px ${selectedService.accent}1c` : undefined,
                }}
              >
                <SelectedIcon size={28} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h4 className="text-2xl font-black text-slate-950">
                    {selectedService?.label ?? "NA"}
                  </h4>
                  <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold capitalize", getPlanTone(selectedService?.planType ?? "NA"))}>
                    {selectedService?.planType ?? "NA"}
                  </span>
                  {selectedService?.price && selectedService.price !== "NA" ? (
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700">
                      {selectedService.price}
                    </span>
                  ) : null}
                </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>{isFrench ? "Survolez une carte pour afficher le détail" : "Hover a card to reveal details"}</span>
                <span className="text-slate-300">•</span>
                <span>
                  {isFrench
                      ? "Le clic conserve le dernier service consulté."
                      : "Click keeps the last viewed service."}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold capitalize", getStateTone(selectedService?.state ?? "NA"))}>
                {selectedService?.state === "NA"
                  ? formatFallbackStatusLabel("quota")
                  : selectedService
                    ? formatServiceQuotaStateLabel(selectedService.state)
                    : formatFallbackStatusLabel("quota")}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {selectedService?.service && selectedService.metrics.length > 0 ? (
              <div className="space-y-3">
                {selectedService.metrics.map((metric) => (
                  <QuotaMetricRow key={metric.key} metric={metric} />
                ))}
              </div>
            ) : null}

            {selectedService?.details.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {selectedService.details.map((detail) => (
                    <span
                      key={detail}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600"
                    >
                      {detail}
                    </span>
                  ))}
                </div>

                {selectedService.linkHref ? (
                  <a
                    href={selectedService.linkHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-rose-700 transition hover:bg-rose-100"
                  >
                    <ExternalLink size={14} />
                    {selectedService.linkLabel ?? "Ouvrir le repo"}
                  </a>
                ) : null}
              </div>
            ) : selectedService?.service && selectedService.metrics.length === 0 ? (
              <div className="space-y-4">
                {selectedService.linkHref ? (
                  <a
                    href={selectedService.linkHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-rose-700 transition hover:bg-rose-100"
                  >
                    <ExternalLink size={14} />
                    {selectedService.linkLabel ?? "Ouvrir le repo"}
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-5">
                <p className="text-lg font-black text-slate-950">
                  {formatFallbackStatusLabel("quota")}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {isFrench
                    ? "Aucune donnée de quota n'est branchée pour ce service dans le repo."
                    : "No quota data is connected for this service in the repo."}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="flex items-center gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.24)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-rose-50 text-rose-600">
              <Globe size={28} />
            </div>
            <div>
              <p className="text-sm text-slate-600">{isFrench ? "Services suivis" : "Tracked services"}</p>
              <p className="mt-1 text-4xl font-black text-rose-600">{displayedServices.length}</p>
            </div>
          </article>

          <article className="flex items-center gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.24)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-rose-50 text-rose-600">
              <CreditCard size={28} />
            </div>
            <div>
              <p className="text-sm text-slate-600">{isFrench ? "Plans payants" : "Paid plans"}</p>
              <p className="mt-1 text-4xl font-black text-rose-600">{paidPlansCount}</p>
            </div>
          </article>

          <article className="flex items-center gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.24)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-rose-50 text-rose-600">
              <Bell size={28} />
            </div>
            <div>
              <p className="text-sm text-slate-600">
                {isFrench ? "Services proches d'une limite" : "Services near a limit"}
              </p>
              <p className="mt-1 text-4xl font-black text-rose-600">{nearLimitCount}</p>
            </div>
          </article>
        </div>

        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-600/70">
                {isFrench ? "Documentation consultable" : "Consultable documentation"}
              </p>
              <h4 className="mt-1 text-lg font-black tracking-tight text-slate-950">
                {isFrench ? "Méthodologie de lecture des quotas" : "Quota reading methodology"}
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              {isFrench
                ? "Le document s'ouvre dans le lecteur de documentation du site."
                : "The document opens in the site documentation viewer."}
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-1">
            <a
              href="/docs/plans/rapport_impact/quotas_plans_methodologie.md"
              className="rounded-2xl border border-rose-200 bg-white px-4 py-4 transition hover:border-rose-300 hover:bg-rose-50"
            >
              <p className="text-sm font-black text-slate-950">
                {isFrench ? "Consulter la fiche quota" : "Open the quota guide"}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {isFrench
                  ? "Lecture des plans, des limites réelles et de la règle NA quand la donnée manque."
                  : "Reading of plans, real limits, and the NA rule when data is missing."}
              </p>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-rose-600/70">
                quotas_plans_methodologie.md
              </p>
            </a>
          </div>
        </section>

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
          {isFrench ? (
            <>
              Les services de développement IA restent hors quotas web et doivent apparaître en ACV avec le badge
              {" "}
              <span className="font-semibold text-slate-800">Inclus ACV / Hors production / Hors quotas web</span>.
              {" "}
              Les données absentes restent affichées avec un libellé sobre.
              {" "}
              Le total mensuel affiché ici est
              {" "}
              <span className="font-semibold text-slate-800">{formatImpactKg(totalMonthlyKgCo2eProxy)}</span>.
            </>
          ) : (
            <>
              Development AI services stay outside web quotas and must appear in ACV with the badge
              {" "}
              <span className="font-semibold text-slate-800">Included in LCA / Outside production / Outside web quotas</span>.
              {" "}
              Missing data remains shown with a sober label.
              {" "}
              The monthly total shown here is
              {" "}
              <span className="font-semibold text-slate-800">{formatImpactKg(totalMonthlyKgCo2eProxy)}</span>.
            </>
          )}
        </div>
      </div>
    </section>
  );
}
