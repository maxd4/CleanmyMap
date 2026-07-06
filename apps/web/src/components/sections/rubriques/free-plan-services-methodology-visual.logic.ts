import type { GitHubRepositoryStats } from "@/lib/github/github-repository-stats";
import type { LucideIcon } from "lucide-react";
import {
  buildServiceQuotaSummary,
  formatServiceQuotaStateLabel,
  isDevelopmentAiServiceKey,
  type ServiceQuotaMetricSummary,
  type ServiceQuotaState,
} from "@/lib/environmental-impact-estimator/service-risk";
import { getServicePlanInfo, type ServicePlanType } from "@/lib/environmental-impact-estimator/service-plan";
import type {
  EnvironmentalImpactInfrastructureMetricKey,
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactInfrastructureServiceKey,
} from "@/lib/environmental-impact-estimator/types";
import {
  DISPLAY_ORDER,
  GITHUB_IMPACT_POSTS,
  LWS_IMPACT_POSTS,
  POSTHOG_IMPACT_POSTS,
  RESEND_IMPACT_POSTS,
  SUPABASE_IMPACT_POSTS,
  VERCEL_IMPACT_POSTS,
  IMPACT_VISUALS,
  type QuotaDisplayServiceKey,
} from "./free-plan-services-methodology-visual.data";

export type ImpactSelectionKey =
  | EnvironmentalImpactInfrastructureServiceKey
  | "other"
  | "development";

export type ImpactDetailBadge = {
  label: string;
  tone: "slate" | "rose";
};

export type ImpactDetailMetric = {
  label: string;
  descriptionLabel?: string;
  valueLabel: string;
  statusLabel: "mesuré" | "estimé" | "à compléter";
};

export type ImpactDetailPostSpec = {
  label: string;
  description: string;
  metricKey?: EnvironmentalImpactInfrastructureMetricKey;
};

export type DisplayService = {
  key: QuotaDisplayServiceKey;
  label: string;
  icon: (typeof DISPLAY_ORDER)[number]["icon"];
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

export function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "NA";
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)}%`;
}

export function formatFallbackStatusLabel(kind: "kpi" | "history" | "quota"): string {
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

export function formatImpactValueLabel(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "valeur à compléter";
  }

  return formatImpactKg(value);
}

export function formatMaybePercent(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "valeur à compléter";
  }

  return formatPercent(value);
}

export function formatImpactKg(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "NA";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  }).format(value)} kg`;
}

export function formatCount(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "NA";
  }

  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
}

export function getPlanTone(planType: ServicePlanType): string {
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

export function getStateTone(state: ServiceQuotaState): string {
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

export function getMetricFillClass(state: ServiceQuotaState): string {
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

export function getTabTone(active: boolean): string {
  return active
    ? "border-rose-300 bg-rose-50 text-rose-700 shadow-[0_12px_30px_-24px_rgba(244,63,94,0.45)]"
    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";
}

export function getTabIconTone(active: boolean): string {
  return active ? "text-rose-500" : "text-slate-500";
}

export function getImpactDetailBadges(key: ImpactSelectionKey, isFrench: boolean): ImpactDetailBadge[] {
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
      const metricKey = "metricKey" in post ? post.metricKey : undefined;
      const metric = metricKey ? metricByKey.get(metricKey) ?? null : null;

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
      const metricKey = "metricKey" in post ? post.metricKey : undefined;
      const metric = metricKey ? metricByKey.get(metricKey) ?? null : null;

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
      const metricKey = "metricKey" in post ? post.metricKey : undefined;
      const metric = metricKey ? metricByKey.get(metricKey) ?? null : null;

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
      const metricKey = "metricKey" in post ? post.metricKey : undefined;
      const metric = metricKey ? metricByKey.get(metricKey) ?? null : null;

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
      const metricKey = "metricKey" in post ? post.metricKey : undefined;
      const metric = metricKey ? metricByKey.get(metricKey) ?? null : null;

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
      const metricKey = "metricKey" in post ? post.metricKey : undefined;
      const metric = metricKey ? metricByKey.get(metricKey) ?? null : null;

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

export function buildDisplayedServices(
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
export { getImpactVisual };
