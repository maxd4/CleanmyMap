"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Bot,
  CreditCard,
  Database,
  Fingerprint,
  Globe,
  GitBranch,
  Mail,
  PieChart,
  Plug,
  Radar,
  Server,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ServiceStatusInfo } from "@/lib/dashboard/status";
import type {
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactInfrastructureServiceKey,
} from "@/lib/environmental-impact-estimator/types";
import { getServicePlanInfo } from "@/lib/environmental-impact-estimator/service-plan";
import {
  buildPortfolioQuotaSummary,
  buildServiceQuotaSummary,
  buildServiceRiskRows,
  formatServiceQuotaStateLabel,
  formatServiceRiskBandLabel,
  isDevelopmentAiServiceKey,
} from "@/lib/environmental-impact-estimator/service-risk";
import { cn } from "@/lib/utils";

export type FreePlanSelectionKey = "total" | EnvironmentalImpactInfrastructureServiceKey;

export type FreePlanMetricCard = {
  label: string;
  value: number | null;
  unit: "percent" | "kg";
  hint: string;
  tone: "sky" | "emerald" | "amber" | "rose" | "slate";
};

export type FreePlanChartEntry = {
  key: EnvironmentalImpactInfrastructureServiceKey;
  label: string;
  value: number;
  monthlyKgCo2eProxy: number;
  color: string;
  selected: boolean;
};

export type FreePlanDashboardState = {
  selectionKey: FreePlanSelectionKey;
  selectedLabel: string;
  selectedDescription: string;
  selectedBadge: string;
  selectedBand: string;
  selectedHealthState: ServiceStatusInfo["state"] | "total";
  selectedColor: string;
  selectedPrimaryQuotaLabel: string;
  selectedPrimaryQuotaState: string;
  selectedMonthlyKgCo2eProxy: number;
  selectedAnnualKgCo2eProxy: number | null;
  selectedDeltaKgCo2eProxy: number | null;
  totalMonthlyKgCo2eProxy: number;
  totalAnnualKgCo2eProxy: number | null;
  totalDeltaKgCo2eProxy: number | null;
  serviceCount: number;
  quotaCards: FreePlanMetricCard[];
  impactCards: FreePlanMetricCard[];
};

const SERVICE_VISUALS: Record<
  EnvironmentalImpactInfrastructureServiceKey,
  {
    icon: LucideIcon;
    color: string;
    glow: string;
  }
> = {
  vercel: {
    icon: Server,
    color: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.18)",
  },
  supabase: {
    icon: Database,
    color: "#34d399",
    glow: "rgba(52, 211, 153, 0.18)",
  },
  github: {
    icon: GitBranch,
    color: "#1f2937",
    glow: "rgba(31, 41, 55, 0.18)",
  },
  resend: {
    icon: Mail,
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.18)",
  },
  chatgpt: {
    icon: Sparkles,
    color: "#fb7185",
    glow: "rgba(251, 113, 133, 0.18)",
  },
  codex: {
    icon: Bot,
    color: "#a78bfa",
    glow: "rgba(167, 139, 250, 0.18)",
  },
  clerk: {
    icon: Fingerprint,
    color: "#60a5fa",
    glow: "rgba(96, 165, 250, 0.18)",
  },
  posthog: {
    icon: Activity,
    color: "#f97316",
    glow: "rgba(249, 115, 22, 0.18)",
  },
  sentry: {
    icon: ShieldAlert,
    color: "#f43f5e",
    glow: "rgba(244, 63, 94, 0.18)",
  },
  upstash: {
    icon: Plug,
    color: "#22c55e",
    glow: "rgba(34, 197, 94, 0.18)",
  },
  pinecone: {
    icon: Radar,
    color: "#14b8a6",
    glow: "rgba(20, 184, 166, 0.18)",
  },
  stripe: {
    icon: CreditCard,
    color: "#c084fc",
    glow: "rgba(192, 132, 252, 0.18)",
  },
  lwsDomain: {
    icon: Globe,
    color: "#eab308",
    glow: "rgba(234, 179, 8, 0.18)",
  },
};

const TOTAL_VISUAL = {
  icon: PieChart,
  color: "#f59e0b",
  glow: "rgba(245, 158, 11, 0.24)",
};

const CHART_COLORS = [
  "#38bdf8",
  "#34d399",
  "#f59e0b",
  "#fb7185",
  "#a78bfa",
  "#f97316",
  "#22c55e",
  "#f472b6",
  "#60a5fa",
  "#14b8a6",
  "#eab308",
  "#c084fc",
] as const;

function formatNumber(value: number | null | undefined, maximumFractionDigits = 1): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "NA";
  }

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits,
  }).format(value);
}

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "NA";
  }

  return `${formatNumber(value, 0)}%`;
}

function formatKg(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "NA";
  }

  return `${formatNumber(value, 2)} kg CO2e proxy`;
}

function getPreviousServiceCharge(
  previousServices: EnvironmentalImpactInfrastructureServiceEstimate[],
  serviceKey: EnvironmentalImpactInfrastructureServiceKey,
): number | null {
  return previousServices.find((service) => service.key === serviceKey)?.monthlyKgCo2eProxy ?? null;
}

function getGrowthPercent(
  currentKgCo2eProxy: number,
  previousKgCo2eProxy: number,
): number {
  if (currentKgCo2eProxy <= 0) {
    return 0;
  }

  if (previousKgCo2eProxy <= 0) {
    return 100;
  }

  return Math.max(
    0,
    Math.min(100, ((currentKgCo2eProxy - previousKgCo2eProxy) / previousKgCo2eProxy) * 100),
  );
}

function getWeightAverage(values: Array<{ value: number; weight: number }>): number | null {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) {
    return null;
  }

  const weightedSum = values.reduce((sum, item) => sum + item.value * item.weight, 0);
  return weightedSum / totalWeight;
}

function getServiceVisualMeta(
  key: FreePlanSelectionKey,
): { icon: LucideIcon; color: string; glow: string } {
  if (key === "total") {
    return TOTAL_VISUAL;
  }

  return SERVICE_VISUALS[key];
}

export function buildFreePlanChartEntries(params: {
  services: EnvironmentalImpactInfrastructureServiceEstimate[];
  selectedKey: FreePlanSelectionKey;
}): FreePlanChartEntry[] {
  const sortedServices = params.services
    .filter((service) => !isDevelopmentAiServiceKey(service.key))
    .slice()
    .sort((left, right) => {
      const byCharge = (right.monthlyKgCo2eProxy ?? 0) - (left.monthlyKgCo2eProxy ?? 0);
      if (byCharge !== 0) {
        return byCharge;
      }

      return left.label.localeCompare(right.label, "fr");
    });

  return sortedServices.map((service, index) => {
    const meta = SERVICE_VISUALS[service.key];
    return {
      key: service.key,
      label: service.label,
      value: Math.max(0, service.sharePercent ?? 0),
      monthlyKgCo2eProxy: service.monthlyKgCo2eProxy ?? 0,
      color: meta.color ?? CHART_COLORS[index % CHART_COLORS.length],
      selected:
        params.selectedKey === "total" ? true : params.selectedKey === service.key,
    };
  });
}

export function buildFreePlanDashboardState(params: {
  services: EnvironmentalImpactInfrastructureServiceEstimate[];
  previousServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  serviceHealth: Record<string, ServiceStatusInfo>;
  selectedKey: FreePlanSelectionKey;
}): FreePlanDashboardState {
  const quotaServices = params.services.filter((service) => !isDevelopmentAiServiceKey(service.key));
  const previousQuotaServices = params.previousServices.filter(
    (service) => !isDevelopmentAiServiceKey(service.key),
  );
  const serviceByKey = new Map(quotaServices.map((service) => [service.key, service] as const));
  const riskRows = buildServiceRiskRows(quotaServices, previousQuotaServices);
  const riskByKey = new Map(riskRows.map((row) => [row.key, row] as const));

  const totalMonthlyKgCo2eProxy = quotaServices.reduce(
    (sum, service) => sum + (service.monthlyKgCo2eProxy ?? 0),
    0,
  );
  const hasAllAnnualValues = quotaServices.every(
    (service) => service.annualKgCo2eProxy !== null && service.annualKgCo2eProxy !== undefined,
  );
  const totalAnnualKgCo2eProxy = hasAllAnnualValues
    ? quotaServices.reduce((sum, service) => sum + (service.annualKgCo2eProxy ?? 0), 0)
    : null;
  const hasPreviousBaseline = previousQuotaServices.length > 0;
  const totalPreviousKgCo2eProxy = hasPreviousBaseline
    ? previousQuotaServices.reduce(
        (sum, service) => sum + (service.monthlyKgCo2eProxy ?? 0),
        0,
      )
    : null;
  const totalDeltaKgCo2eProxy =
    totalPreviousKgCo2eProxy === null
      ? null
      : totalMonthlyKgCo2eProxy - totalPreviousKgCo2eProxy;

  const totalGrowthPercent =
    totalPreviousKgCo2eProxy === null
      ? null
      : getGrowthPercent(totalMonthlyKgCo2eProxy, totalPreviousKgCo2eProxy);
  const totalConfidencePercent = getWeightAverage(
    params.services.map((service) => ({
      value: service.confidencePercent,
      weight: service.monthlyKgCo2eProxy ?? 0,
    })),
  );
  const totalThresholdProximityPercent = getWeightAverage(
    params.services.map((service) => ({
      value: riskByKey.get(service.key)?.thresholdProximityPercent ?? 0,
      weight: service.monthlyKgCo2eProxy ?? 0,
    })),
  );
  const resolvedSelectedKey =
    params.selectedKey === "total" || serviceByKey.has(params.selectedKey)
      ? params.selectedKey
      : "total";
  const selectedService = resolvedSelectedKey === "total" ? null : serviceByKey.get(resolvedSelectedKey) ?? null;
  const selectedRisk = selectedService ? riskByKey.get(selectedService.key) ?? null : null;
  const selectedHealthState = selectedService
    ? params.serviceHealth[selectedService.key]?.state ?? "missing"
    : "total";
  const selectedBadge =
    resolvedSelectedKey === "total"
      ? "Vue globale"
      : params.serviceHealth[selectedService?.key ?? ""]?.state === "ready"
        ? "Configuré"
        : params.serviceHealth[selectedService?.key ?? ""]?.state === "external"
          ? "Externe"
          : params.serviceHealth[selectedService?.key ?? ""]?.state === "defer"
            ? "Différé"
            : params.serviceHealth[selectedService?.key ?? ""]?.state === "missing"
              ? "Manquant"
              : "Suivi";

  const selectedLabel = resolvedSelectedKey === "total" ? "Total" : selectedService?.label ?? "Total";
  const selectedDescription =
    resolvedSelectedKey === "total"
      ? "Vue globale de tous les services web suivis."
      : selectedService?.description ?? "Service sélectionné.";
  const selectedBand =
    resolvedSelectedKey === "total"
      ? "Agrégé"
      : formatServiceRiskBandLabel(selectedRisk?.band ?? "faible");
  const selectedColor = getServiceVisualMeta(resolvedSelectedKey).color;

  const selectedMonthlyKgCo2eProxy =
    resolvedSelectedKey === "total"
      ? totalMonthlyKgCo2eProxy
      : selectedService?.monthlyKgCo2eProxy ?? 0;
  const selectedAnnualKgCo2eProxy =
    resolvedSelectedKey === "total"
      ? totalAnnualKgCo2eProxy
      : selectedService?.annualKgCo2eProxy ?? null;
  const selectedDeltaKgCo2eProxy =
    resolvedSelectedKey === "total"
      ? totalDeltaKgCo2eProxy
      : selectedService
        ? (() => {
            const previousMonthlyKgCo2eProxy = getPreviousServiceCharge(
              params.previousServices,
              selectedService.key,
            );
            if (previousMonthlyKgCo2eProxy === null) {
              return null;
            }

            return selectedMonthlyKgCo2eProxy - previousMonthlyKgCo2eProxy;
          })()
        : null;
  const selectedThresholdProximityPercent =
    resolvedSelectedKey === "total"
      ? totalThresholdProximityPercent
      : selectedRisk?.thresholdProximityPercent ?? null;
  const selectedGrowthPercent =
    resolvedSelectedKey === "total"
      ? totalGrowthPercent
      : selectedRisk?.growthPercent ?? null;
  const selectedConfidencePercent =
    resolvedSelectedKey === "total"
      ? totalConfidencePercent
      : selectedService?.confidencePercent ?? null;
  const selectedQuotaSummary =
    resolvedSelectedKey === "total"
      ? buildPortfolioQuotaSummary(quotaServices)
      : selectedService
        ? buildServiceQuotaSummary(selectedService)
        : null;
  const selectedPrimaryQuota = selectedQuotaSummary?.primaryMetric ?? null;
  const selectedPrimaryQuotaLabel = selectedPrimaryQuota?.label ?? "NA";
  const selectedPrimaryQuotaState = selectedQuotaSummary?.state ?? "NA";
  const selectedPrimaryQuotaPercent = selectedPrimaryQuota?.consumedPercent ?? null;

  const quotaCards: FreePlanMetricCard[] = [
    {
      label: "Quota principal",
      value: selectedPrimaryQuotaPercent,
      unit: "percent",
      hint:
        selectedPrimaryQuota === null
          ? "NA"
          : `${selectedPrimaryQuotaLabel} · ${formatServiceQuotaStateLabel(selectedPrimaryQuotaState)}`,
      tone: "sky",
    },
    {
      label: "Proximité du seuil",
      value: selectedThresholdProximityPercent,
      unit: "percent",
      hint:
        resolvedSelectedKey === "total"
          ? "Moyenne pondérée des proxys de seuil."
          : "Lecture de la tension sur le quota alloué.",
      tone: "amber",
    },
    {
      label: "Croissance mensuelle",
      value: selectedGrowthPercent,
      unit: "percent",
      hint:
        resolvedSelectedKey === "total"
          ? "Variation du portefeuille total vs mois précédent."
          : "Signal de dérive du service sélectionné.",
      tone: "rose",
    },
    {
      label: "Confiance",
      value: selectedConfidencePercent,
      unit: "percent",
      hint:
        resolvedSelectedKey === "total"
          ? "Moyenne pondérée par la charge mensuelle."
          : "Fiabilité de la lecture du service.",
      tone: "emerald",
    },
  ];

  const impactCards: FreePlanMetricCard[] = [
    {
      label: "Pollution mensuelle",
      value: selectedMonthlyKgCo2eProxy,
      unit: "kg",
      hint:
        resolvedSelectedKey === "total"
          ? "Somme de tous les services suivis."
          : "Charge proxy du service sélectionné.",
      tone: "sky",
    },
    {
      label: "Pollution annuelle",
      value: selectedAnnualKgCo2eProxy,
      unit: "kg",
      hint: "Projection sur douze mois.",
      tone: "emerald",
    },
    {
      label: "Delta vs N-1",
      value: selectedDeltaKgCo2eProxy,
      unit: "kg",
      hint:
        resolvedSelectedKey === "total"
          ? "Écart du portefeuille total par rapport au snapshot précédent."
          : "Écart du service sélectionné par rapport au mois précédent.",
      tone: (selectedDeltaKgCo2eProxy ?? 0) >= 0 ? "rose" : "emerald",
    },
    {
      label: "Total portefeuille",
      value: totalMonthlyKgCo2eProxy,
      unit: "kg",
      hint: `${quotaServices.length} service${quotaServices.length > 1 ? "s" : ""} web suivis.`,
      tone: "amber",
    },
  ];

  return {
    selectionKey: resolvedSelectedKey,
    selectedLabel,
    selectedDescription,
    selectedBadge,
    selectedBand,
    selectedHealthState,
    selectedColor,
    selectedPrimaryQuotaLabel,
    selectedPrimaryQuotaState,
    selectedMonthlyKgCo2eProxy,
    selectedAnnualKgCo2eProxy,
    selectedDeltaKgCo2eProxy,
    totalMonthlyKgCo2eProxy,
    totalAnnualKgCo2eProxy,
    totalDeltaKgCo2eProxy,
    serviceCount: quotaServices.length,
    quotaCards,
    impactCards,
  };
}

function MetricCard({
  card,
}: {
  card: FreePlanMetricCard;
}) {
  return (
    <article
      className={cn(
        "rounded-3xl border p-4 shadow-sm",
        card.tone === "sky" && "border-sky-500/20 bg-sky-500/10 text-sky-100",
        card.tone === "emerald" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
        card.tone === "amber" && "border-amber-500/20 bg-amber-500/10 text-amber-100",
        card.tone === "rose" && "border-rose-500/20 bg-rose-500/10 text-rose-100",
        card.tone === "slate" && "border-white/5 bg-white/5 text-white",
      )}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-60">
        {card.label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">
        {card.unit === "percent"
          ? formatPercent(card.value)
          : formatKg(card.value)}
      </p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
        {card.hint}
      </p>
    </article>
  );
}

function ServiceButton({
  label,
  icon: Icon,
  active,
  onClick,
  color,
  selectedKey,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  color: string;
  selectedKey: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex min-w-[5.75rem] shrink-0 flex-col items-center gap-2 rounded-2xl border px-3 py-2 text-center transition",
        active
          ? "border-white/20 bg-white/10 text-white shadow-lg"
          : "border-white/5 bg-white/5 text-white/60 hover:border-white/10 hover:bg-white/10 hover:text-white",
      )}
      style={{
        boxShadow: active ? `0 0 0 1px ${color}22, 0 14px 30px -18px ${color}` : undefined,
      }}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-2xl border",
          active ? "border-white/20 bg-white/10" : "border-white/10 bg-black/10",
        )}
        style={{
          color,
          boxShadow: selectedKey ? `inset 0 0 0 1px ${color}22` : undefined,
        }}
      >
        <Icon size={18} />
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.18em] leading-none">
        {label}
      </span>
    </button>
  );
}

export function FreePlanServicesVisual({
  services,
  previousServices,
  serviceHealth,
}: {
  services: EnvironmentalImpactInfrastructureServiceEstimate[];
  previousServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  serviceHealth: Record<string, ServiceStatusInfo>;
}) {
  const [selectedKey, setSelectedKey] = useState<FreePlanSelectionKey>("total");
  const [hoveredKey, setHoveredKey] = useState<FreePlanSelectionKey | null>(null);
  const visibleServices = services.filter((service) => !isDevelopmentAiServiceKey(service.key));
  const resolvedSelectedKey =
    selectedKey === "total" || visibleServices.some((service) => service.key === selectedKey)
      ? selectedKey
      : "total";
  const activeKey = hoveredKey ?? resolvedSelectedKey;

  const dashboardState = useMemo(
    () =>
      buildFreePlanDashboardState({
        services: visibleServices,
        previousServices,
        serviceHealth,
        selectedKey: resolvedSelectedKey,
      }),
    [visibleServices, previousServices, serviceHealth, resolvedSelectedKey],
  );

  const chartEntries = useMemo(
    () =>
      buildFreePlanChartEntries({
        services: visibleServices,
        selectedKey: activeKey,
      }),
    [visibleServices, activeKey],
  );

  const selectedService =
    dashboardState.selectionKey === "total"
      ? null
      : visibleServices.find((service) => service.key === dashboardState.selectionKey) ?? null;
  const selectedHealthTone =
    dashboardState.selectedHealthState === "ready"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
      : dashboardState.selectedHealthState === "external"
        ? "border-sky-500/20 bg-sky-500/10 text-sky-100"
        : dashboardState.selectedHealthState === "defer"
          ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
          : dashboardState.selectedHealthState === "missing"
            ? "border-rose-500/20 bg-rose-500/10 text-rose-100"
            : "border-amber-500/20 bg-amber-500/10 text-amber-100";
  const selectedPlanInfo = selectedService ? getServicePlanInfo(selectedService.key) : null;

  return (
    <section className="rounded-[3rem] border border-white/5 bg-white/5 p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
              Lecture centralisée
            </p>
            <h3 className="mt-1 text-2xl font-black text-white">
              Sélecteur des plans gratuits
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
              Clique sur un service ou sur <span className="font-semibold text-white">Total</span> pour
              mettre à jour automatiquement les cartes de quota et de pollution.
            </p>
          </div>
          <div
            className={cn(
              "rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em]",
              selectedHealthTone,
            )}
          >
            {dashboardState.selectedBadge} · {dashboardState.selectedBand}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <ServiceButton
            label="Total"
            icon={TOTAL_VISUAL.icon}
            color={TOTAL_VISUAL.color}
            active={dashboardState.selectionKey === "total"}
            selectedKey={dashboardState.selectionKey === "total"}
            onClick={() => setSelectedKey("total")}
          />
          {visibleServices.map((service) => {
            const meta = SERVICE_VISUALS[service.key];
            const isActive = dashboardState.selectionKey === service.key;
            return (
              <ServiceButton
                key={service.key}
                label={service.label}
                icon={meta.icon}
                color={meta.color}
                active={isActive}
                selectedKey={isActive}
                onClick={() => setSelectedKey(service.key)}
              />
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <article className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-slate-950/35 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                  Plans et quotas
                </p>
                <h4 className="mt-1 text-2xl font-black text-white">
                  Qui pèse le plus
                </h4>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
                  La répartition est lisible uniquement ici, parce qu&apos;elle compare
                  directement les services qui composent l&apos;ACV numérique de CleanMyMap.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
                {dashboardState.selectionKey === "total"
                  ? "Vue totale"
                  : dashboardState.selectedLabel}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {chartEntries.length > 0 ? (
                <>
                  <div className="overflow-hidden rounded-full border border-white/10 bg-white/5">
                    <div className="flex h-14 overflow-hidden rounded-full">
                      {chartEntries.map((entry) => {
                        const isActive = activeKey === entry.key;
                        const isSelected = dashboardState.selectionKey === "total" || entry.selected;
                        return (
                          <button
                            key={entry.key}
                            type="button"
                            onMouseEnter={() => setHoveredKey(entry.key)}
                            onMouseLeave={() => setHoveredKey(null)}
                            onClick={() => {
                              setSelectedKey(entry.key);
                              setHoveredKey(entry.key);
                            }}
                            className={cn(
                              "relative flex h-full min-w-0 items-center justify-center border-r border-black/20 last:border-r-0",
                              isActive ? "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]" : "opacity-80",
                            )}
                            style={{
                              width: `${Math.max(0, entry.value)}%`,
                              backgroundColor: entry.color,
                              opacity: isSelected ? 1 : 0.34,
                            }}
                            title={`${entry.label}: ${formatPercent(entry.value)}`}
                            aria-label={`${entry.label} ${formatPercent(entry.value)} du total`}
                          >
                            {entry.value >= 6 ? (
                              <span className="px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
                                {formatPercent(entry.value)}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                    <span>0%</span>
                    <span>{formatPercent(100)}</span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                        Quota principal
                      </p>
                      <p className="mt-1 text-lg font-black text-white">
                        {dashboardState.selectedPrimaryQuotaState === "NA"
                          ? "NA"
                          : `${dashboardState.selectedPrimaryQuotaLabel} · ${formatPercent(
                              dashboardState.quotaCards[0]?.value ?? null,
                            )}`}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                        État du quota
                      </p>
                      <p className="mt-1 text-lg font-black text-white">
                        {dashboardState.selectedPrimaryQuotaState === "NA"
                          ? "NA"
                          : formatServiceQuotaStateLabel(
                              dashboardState.selectedPrimaryQuotaState as
                                | "ok"
                                | "attention"
                                | "proche limite"
                                | "dépassé"
                                | "NA",
                            )}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-[180px] items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-black/20 text-sm text-white/35">
                  Aucun service disponible pour le moment.
                </div>
              )}
            </div>
          </article>

          <aside className="space-y-3 rounded-[2.5rem] border border-white/5 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                  Légende
                </p>
                <h4 className="mt-1 text-xl font-black text-white">
                  Services principaux
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-white/55">
                  Les services les plus lourds sont listés en premier, puis le bloc
                  autres rassemble le reste de la répartition.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {chartEntries.length > 0 ? (
                <>
                  {chartEntries.slice(0, 5).map((entry) => {
                    const meta = SERVICE_VISUALS[entry.key];
                    const Icon = meta.icon;
                    return (
                      <div
                        key={entry.key}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-3 py-3"
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20"
                          style={{ color: meta.color, boxShadow: `inset 0 0 0 1px ${meta.color}22` }}
                        >
                          <Icon size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {entry.label}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/32">
                            Part de l&apos;impact numérique estimé
                          </p>
                        </div>
                        <p className="text-sm font-black text-white">
                          {formatPercent(entry.value)}
                        </p>
                      </div>
                    );
                  })}

                  {chartEntries.length > 5 ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-3 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-white/60">
                        ...
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          Autres ({chartEntries.length - 5})
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/32">
                          Reste du portefeuille
                        </p>
                      </div>
                      <p className="text-sm font-black text-white">
                        {formatPercent(
                          chartEntries
                            .slice(5)
                            .reduce((sum, item) => sum + (item.value ?? 0), 0),
                        )}
                      </p>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/40">
                  NA
                </div>
              )}
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">
                Vue sélectionnée
              </p>
              <h5 className="mt-1 text-lg font-black text-white">
                {dashboardState.selectedLabel}
              </h5>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                {dashboardState.selectedDescription}
              </p>
              {selectedPlanInfo ? (
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    Plan {selectedPlanInfo.type}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    Prix {selectedPlanInfo.price}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/10 p-4 text-xs leading-relaxed text-white/55">
              {dashboardState.selectionKey !== "total" && selectedService ? (
                selectedService.description
              ) : (
                <>La vue Total agrège tous les services du graphique de comparaison.</>
              )}
            </div>
          </aside>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {dashboardState.quotaCards.map((card) => (
            <MetricCard key={card.label} card={card} />
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {dashboardState.impactCards.map((card) => (
            <MetricCard key={card.label} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
