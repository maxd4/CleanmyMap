"use client";

import { useMemo, useState, type LucideIcon } from "react";
import {
  BarChart3,
  Bot,
  Bell,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  CreditCard,
  Database,
  Fingerprint,
  Globe,
  GitBranch,
  Leaf,
  Mail,
  Monitor,
  Megaphone,
  PieChart,
  MoreHorizontal,
  Search,
  Plug,
  Radar,
  ShieldAlert,
  Sparkles,
  Users,
  X,
  Triangle,
  Zap,
  Cloud,
} from "lucide-react";
import type {
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactInfrastructureServiceKey,
} from "@/lib/environmental-impact-estimator/types";
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

type MethodologyTabKey = "overview" | "quota" | "impact";

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
};

type ServiceIconCardProps = {
  service: DisplayService;
  selected: boolean;
  onSelect: (key: QuotaDisplayServiceKey) => void;
};

type ServiceRowProps = {
  service: DisplayService;
  selected: boolean;
  onSelect: (key: QuotaDisplayServiceKey) => void;
};

const TAB_ITEMS = [
  { key: "overview", label: "Vue d'ensemble", icon: BarChart3 },
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

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "NA";
  }

  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)}%`;
}

function formatKg(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "NA";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: value >= 10 ? 0 : 2,
  }).format(value)} kgCO2e`;
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

function getServiceStateRank(state: ServiceQuotaState): number {
  switch (state) {
    case "dépassé":
      return 4;
    case "proche limite":
      return 3;
    case "attention":
      return 2;
    case "ok":
      return 1;
    default:
      return 0;
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

function formatMetricCount(count: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(count)} service${count > 1 ? "s" : ""}`;
}

function getImpactVisual(serviceKey: EnvironmentalImpactInfrastructureServiceKey): {
  icon: LucideIcon;
  color: string;
} {
  return IMPACT_VISUALS[serviceKey];
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
  if (metricKey.includes("resend")) return Mail;
  if (metricKey.includes("posthog")) return BarChart3;
  if (metricKey.includes("lwsDomain")) return Globe;
  if (metricKey.includes("lwsDns")) return Globe;
  return ShieldAlert;
}

function renderMetricIcon(metricKey: string): JSX.Element {
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

function ImpactBadge({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
      {children}
    </span>
  );
}

function ImpactFeedCard({
  service,
  selected,
  onSelect,
}: {
  service: DisplayService;
  selected: boolean;
  onSelect: (key: QuotaDisplayServiceKey) => void;
}) {
  const Icon = service.icon;
  const primaryMetric = service.primaryMetric;
  const impactMonthly = service.service?.monthlyKgCo2eProxy ?? null;
  const impactShare = service.service?.sharePercent ?? null;

  return (
    <button
      type="button"
      onClick={() => onSelect(service.key)}
      className={cn(
        "w-full rounded-[1.6rem] border bg-white p-4 text-left shadow-[0_18px_45px_-34px_rgba(15,23,42,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_-36px_rgba(15,23,42,0.26)]",
        selected ? "border-rose-300 ring-1 ring-rose-200" : "border-slate-200",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50"
          style={{ color: service.accent, boxShadow: `inset 0 0 0 1px ${service.accent}1c` }}
        >
          <Icon size={22} />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="truncate text-base font-black text-slate-950">{service.label}</h5>
            <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize", getPlanTone(service.planType))}>
              {service.planType}
            </span>
            {service.price !== "NA" ? (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                {service.price}
              </span>
            ) : null}
            <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize", getStateTone(service.state))}>
              {formatServiceQuotaStateLabel(service.state)}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-slate-600">
            {service.service?.description ?? "NA"}
          </p>

          <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            <ImpactBadge>
              Part du total {impactShare === null ? "NA" : formatPercent(impactShare)}
            </ImpactBadge>
            <ImpactBadge>
              Impact mensuel {impactMonthly === null ? "NA" : formatKg(impactMonthly)}
            </ImpactBadge>
            <ImpactBadge>
              Quota principal {primaryMetric?.label ?? "NA"}
            </ImpactBadge>
          </div>
        </div>

        <ChevronRight size={16} className="mt-2 shrink-0 text-slate-400" />
      </div>
    </button>
  );
}

function ImpactSummaryCard({
  icon: Icon,
  label,
  value,
  caption,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <article className="flex items-center gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.24)]">
      <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-rose-50 text-rose-600">
        <Icon size={28} />
      </div>
      <div>
        <p className="text-sm text-slate-600">{label}</p>
        <p className="mt-1 text-4xl font-black text-rose-600">{value}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{caption}</p>
      </div>
    </article>
  );
}

function buildDisplayedServices(
  services: EnvironmentalImpactInfrastructureServiceEstimate[],
): DisplayService[] {
  const webServices = services.filter((service) => !isDevelopmentAiServiceKey(service.key));
  const serviceByKey = new Map(webServices.map((service) => [service.key, service] as const));

  return DISPLAY_ORDER.map((definition) => {
    if (definition.key === "github") {
      return {
        ...definition,
        service: null,
        planType: "NA",
        price: "NA",
        state: "NA",
        primaryMetric: null,
        metrics: [],
      };
    }

    const service = serviceByKey.get(definition.key) ?? null;
    const quotaSummary = service ? buildServiceQuotaSummary(service) : null;
    const planInfo = getServicePlanInfo(definition.key);

    return {
      ...definition,
      service,
      planType: planInfo.type,
      price: planInfo.price,
      state: quotaSummary?.state ?? "NA",
      primaryMetric: quotaSummary?.primaryMetric ?? null,
      metrics: quotaSummary?.metrics ?? [],
    };
  });
}

function ServiceIconCard({ service, selected, onSelect }: ServiceIconCardProps) {
  const Icon = service.icon;
  const primaryMetric = service.primaryMetric;
  const primarySummary =
    primaryMetric === null
      ? "NA"
      : `${primaryMetric.label} · ${formatPercent(primaryMetric.consumedPercent)} · ${formatServiceQuotaStateLabel(primaryMetric.state)}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(service.key)}
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
              {formatServiceQuotaStateLabel(service.state)}
            </span>
          </div>

          <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
            {primarySummary}
          </p>
        </div>
      </div>
    </button>
  );
}

function ServiceRow({ service, selected, onSelect }: ServiceRowProps) {
  const Icon = service.icon;
  const primaryMetric = service.primaryMetric;

  return (
    <button
      type="button"
      onClick={() => onSelect(service.key)}
      className={cn(
        "flex w-full items-center gap-4 rounded-[1.35rem] border px-4 py-3 text-left transition",
        selected
          ? "border-rose-300 bg-rose-50 shadow-[0_12px_30px_-24px_rgba(244,63,94,0.5)]"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
          selected ? "border-rose-200 bg-white text-rose-500" : "border-slate-200 bg-slate-50 text-slate-800",
        )}
        style={{
          color: service.accent,
          boxShadow: selected ? `inset 0 0 0 1px ${service.accent}1c` : undefined,
        }}
      >
        <Icon size={22} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{service.label}</p>
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

          <div className="flex shrink-0 items-center gap-2 text-slate-500">
            <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold capitalize", getStateTone(service.state))}>
              {formatServiceQuotaStateLabel(service.state)}
            </span>
            <ChevronRight size={16} className={selected ? "text-rose-500" : "text-slate-400"} />
          </div>
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
          {primaryMetric === null
            ? "NA"
            : `${primaryMetric.label} · ${formatPercent(primaryMetric.consumedPercent)} · ${formatServiceQuotaStateLabel(primaryMetric.state)}`}
        </p>
      </div>
    </button>
  );
}

function QuotaMetricRow({ metric }: { metric: ServiceQuotaMetricSummary }) {
  const width = metric.consumedPercent === null ? 0 : Math.max(2, Math.min(100, metric.consumedPercent));

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
                  ? "NA"
                  : `Réf. ${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
                      metric.referenceMonthlyQuantity,
                    )} ${metric.unitLabel}`}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[13px] font-black text-slate-950">
                {metric.consumedPercent === null ? "NA" : formatPercent(metric.consumedPercent)}
              </p>
              <p className="text-[11px] font-medium text-slate-500">{formatServiceQuotaStateLabel(metric.state)}</p>
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
  isFrench = true,
  initialTab = "impact",
}: {
  services: EnvironmentalImpactInfrastructureServiceEstimate[];
  impactTotals?: {
    monthlyKgCo2eProxy: number | null;
    annualKgCo2eProxy: number | null;
    totalKgCo2eProxy: number | null;
    generatedAt: string | null;
  };
  isFrench?: boolean;
  initialTab?: MethodologyTabKey;
}) {
  const resolvedImpactTotals = impactTotals ?? {
    monthlyKgCo2eProxy: null,
    annualKgCo2eProxy: null,
    totalKgCo2eProxy: null,
    generatedAt: null,
  };
  const displayedServices = useMemo(() => buildDisplayedServices(services), [services]);
  const visibleTabs = TAB_ITEMS.filter((tab) => tab.key !== "overview");
  const initialSelectedKey = displayedServices.find((service) => service.key === "supabase")?.key ?? displayedServices[0]?.key ?? "github";
  const [selectedKey, setSelectedKey] = useState<QuotaDisplayServiceKey>(initialSelectedKey);
  const [activeTab, setActiveTab] = useState<MethodologyTabKey>(initialTab);

  const selectedService =
    displayedServices.find((service) => service.key === selectedKey) ?? displayedServices[0] ?? null;
  const SelectedIcon = selectedService?.icon ?? PieChart;
  const selectedPlanInfo =
    selectedService && selectedService.key !== "github"
      ? getServicePlanInfo(selectedService.key)
      : null;
  const developmentServices = services.filter((service) => isDevelopmentAiServiceKey(service.key));
  const impactServices = displayedServices
    .slice()
    .sort((left, right) => {
      const byState = getServiceStateRank(right.state) - getServiceStateRank(left.state);
      if (byState !== 0) {
        return byState;
      }

      const byImpact = (right.service?.monthlyKgCo2eProxy ?? 0) - (left.service?.monthlyKgCo2eProxy ?? 0);
      if (byImpact !== 0) {
        return byImpact;
      }

      return left.label.localeCompare(right.label, "fr");
    });
  const featuredService = impactServices[0] ?? null;
  const impactFeedServices = [
    selectedService,
    ...impactServices.filter((service) => service.key !== selectedService?.key).slice(0, 3),
  ].filter((service, index, array) => Boolean(service) && array.findIndex((item) => item?.key === service?.key) === index) as DisplayService[];

  const paidPlansCount = displayedServices.filter((service) => service.planType === "payant").length;
  const nearLimitCount = displayedServices.filter(
    (service) => service.state === "proche limite" || service.state === "dépassé",
  ).length;
  const totalMonthlyKgCo2eProxy = displayedServices.reduce(
    (sum, service) => sum + (service.service?.monthlyKgCo2eProxy ?? 0),
    0,
  );
  const totalDevelopmentKgCo2eProxy = developmentServices.reduce(
    (sum, service) => sum + (service.monthlyKgCo2eProxy ?? 0),
    0,
  );

  const title = isFrench ? "Quotas & plans des services web" : "Web services quotas and plans";
  const subtitle = isFrench
    ? "Lecture service par service des limites de plan, sans comparaison trompeuse entre services."
    : "Service-by-service reading of plan limits, without misleading cross-service comparison.";

  if (activeTab === "overview") {
    return (
      <section
        id="impact-services"
        className="rounded-[2.75rem] border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.24)] md:p-8"
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-rose-500/75">
                {isFrench ? "Pilotage des services" : "Service pilot"}
              </p>
              <h3 className="max-w-4xl text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                {isFrench ? "Vue d'ensemble" : "Overview"}
              </h3>
              <p className="max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">
                {isFrench
                  ? "Les services suivis sont exposés sans moyenne trompeuse. Les valeurs absentes restent marquées NA."
                  : "Tracked services are exposed without misleading averages. Missing values remain marked NA."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {visibleTabs.map((tab) => (
                <TabPill
                  key={tab.key}
                  tab={tab}
                  active={tab.key === activeTab}
                  onClick={() => setActiveTab(tab.key)}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <ImpactSummaryCard
              icon={Users}
              label={isFrench ? "Services suivis" : "Tracked services"}
              value={new Intl.NumberFormat("fr-FR").format(displayedServices.length)}
              caption={
                isFrench
                  ? "GitHub reste affiché en NA quand la donnée manque."
                  : "GitHub stays marked NA when data is missing."
              }
            />
            <ImpactSummaryCard
              icon={CreditCard}
              label={isFrench ? "Plans payants" : "Paid plans"}
              value={new Intl.NumberFormat("fr-FR").format(paidPlansCount)}
              caption={isFrench ? "LWS est le seul plan payant documenté." : "LWS is the only documented paid plan."}
            />
            <ImpactSummaryCard
              icon={ShieldAlert}
              label={isFrench ? "Services proches d'une limite" : "Services near a limit"}
              value={new Intl.NumberFormat("fr-FR").format(nearLimitCount)}
              caption={isFrench ? "Seulement les états réellement calculés." : "Only actually computed states are shown."}
            />
          </div>

          <div className="rounded-[2.25rem] border border-slate-200 bg-slate-50 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-rose-500/70">
              {isFrench ? "Lecture synthétique" : "Synthetic reading"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {isFrench
                ? "L'onglet Impact carbone compare les postes qui pèsent réellement dans l'ACV numérique de CleanMyMap. Les services de développement IA sont séparés des quotas web et restent marqués Inclus ACV / Hors production / Hors quotas web."
                : "The Impact carbone tab compares the items that actually weigh in CleanMyMap's digital LCA. Development AI services are separated from web quotas and remain marked Included in LCA / Outside production / Outside web quotas."}
            </p>
          </div>
        </div>
      </section>
    );
  }

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
    const totalMonthlyImpact = impactServices.reduce(
      (sum, service) => sum + (service.monthlyKgCo2eProxy ?? 0),
      0,
    );
    const totalProductionImpact = productionImpactServices.reduce(
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
    const topProductionServices = productionImpactServices.slice(0, 6);
    const otherProductionImpact = productionImpactServices
      .slice(6)
      .reduce((sum, service) => sum + (service.monthlyKgCo2eProxy ?? 0), 0);
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
            },
          ]
        : []),
      ...(otherProductionImpact > 0
        ? [
            {
              key: "other" as const,
              label: isFrench ? "Autres" : "Other",
              shortLabel: isFrench ? "Autres" : "Other",
              icon: MoreHorizontal,
              color: "#e5e7eb",
              sharePercent:
                totalMonthlyImpact > 0 ? (otherProductionImpact / totalMonthlyImpact) * 100 : null,
              monthlyKgCo2eProxy: otherProductionImpact,
              kind: "other" as const,
            },
          ]
        : []),
    ];
    const topContributors = productionImpactServices.slice(0, 6);
    const topContributorCount = topContributors.length;
    const topContributorLabel =
      topContributorCount > 0
        ? topContributors[0]?.label ?? "NA"
        : "NA";
    const developmentLineLabel =
      developmentImpactServices.length > 0
        ? developmentImpactServices
            .map((service) => service.label.split(" — ")[0] ?? service.label)
            .join(" · ")
        : "NA";

    return (
      <section
        id="impact-services"
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
                  ? "Lecture linéaire de l'ACV numérique avec les services réellement calculés dans le repo. Les données manquantes restent en NA."
                  : "Linear reading of the digital LCA with the services actually computed in the repo. Missing data stays NA."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {visibleTabs.map((tab) => (
                <TabPill
                  key={tab.key}
                  tab={tab}
                  active={tab.key === activeTab}
                  onClick={() => setActiveTab(tab.key)}
                />
              ))}
            </div>
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
                    {formatKg(resolvedImpactTotals.monthlyKgCo2eProxy)}
                  </p>
                  <p className="mt-2 text-lg font-medium text-slate-600">
                    {isFrench
                      ? `(${formatKg(totalAnnualImpact)} projetés)`
                      : `(${formatKg(totalAnnualImpact)} projected)`}
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
                    {formatKg(totalLifetimeImpact)}
                  </p>
                  <p className="mt-2 text-lg font-medium text-slate-600">
                    {developmentSharePercent === null
                      ? "NA"
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
            <section className="rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h4 className="text-xl font-black text-slate-950">
                    {isFrench
                      ? "Contribution estimée à l'empreinte carbone (ACV)"
                      : "Estimated contribution to the carbon footprint (LCA)"}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {isFrench
                      ? "La comparaison est pertinente ici car elle additionne les contributions réelles à l'ACV numérique."
                      : "Comparison is relevant here because it sums the real contributions to the digital LCA."}
                  </p>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
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

                    return (
                      <div
                        key={segment.key}
                        className={cn(
                          "flex min-w-[92px] flex-1 flex-col items-center gap-2 rounded-[1.2rem] px-2 py-2 text-center",
                          isDevelopment && "border border-rose-300 border-dashed bg-rose-50/60",
                          isOther && "border border-slate-200 bg-slate-50",
                        )}
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
                          <p
                            className={cn(
                              "text-sm font-black",
                              isDevelopment ? "text-rose-600" : "text-slate-900",
                            )}
                          >
                            {formatPercent(widthPercent)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    NA
                  </div>
                )}
              </div>

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
            {visibleTabs.map((tab) => (
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
              selected={service.key === selectedKey}
              onSelect={setSelectedKey}
            />
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
          <aside className="rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)]">
            <h4 className="text-xl font-black text-slate-950">
              {isFrench ? "Suivi des quotas par service" : "Quota tracking by service"}
            </h4>

            <div className="mt-5 space-y-3">
              {displayedServices.map((service) => (
                <ServiceRow
                  key={service.key}
                  service={service}
                  selected={service.key === selectedKey}
                  onSelect={setSelectedKey}
                />
              ))}
            </div>
          </aside>

          <section className="rounded-[2.25rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)]">
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
                    <span>{isFrench ? "Détail des quotas" : "Quota details"}</span>
                    <span className="text-slate-300">•</span>
                    <span>
                      {isFrench
                        ? "Un service peut comporter plusieurs quotas internes."
                        : "A service can include multiple internal quotas."}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold capitalize", getStateTone(selectedService?.state ?? "NA"))}>
                  {selectedService ? formatServiceQuotaStateLabel(selectedService.state) : "NA"}
                </span>
              </div>
            </div>

            <div className="mt-6">
              {selectedService?.service && selectedService.metrics.length > 0 ? (
                <div className="space-y-3">
                  {selectedService.metrics.map((metric) => (
                    <QuotaMetricRow key={metric.key} metric={metric} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-5">
                  <p className="text-lg font-black text-slate-950">NA</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {isFrench
                      ? "Aucune donnée de quota n'est branchée pour ce service dans le repo."
                      : "No quota data is connected for this service in the repo."}
                  </p>
                </div>
              )}
            </div>
          </section>
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

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
          {isFrench ? (
            <>
              Les services de développement IA restent hors quotas web et doivent apparaître en ACV avec le badge
              {" "}
              <span className="font-semibold text-slate-800">Inclus ACV / Hors production / Hors quotas web</span>.
              {" "}
              Les données absentes restent affichées en <span className="font-semibold text-slate-800">NA</span>.
              {" "}
              Le total mensuel affiché ici est
              {" "}
              <span className="font-semibold text-slate-800">{formatKg(totalMonthlyKgCo2eProxy)}</span>.
            </>
          ) : (
            <>
              Development AI services stay outside web quotas and must appear in ACV with the badge
              {" "}
              <span className="font-semibold text-slate-800">Included in LCA / Outside production / Outside web quotas</span>.
              {" "}
              Missing data remains shown as <span className="font-semibold text-slate-800">NA</span>.
              {" "}
              The monthly total shown here is
              {" "}
              <span className="font-semibold text-slate-800">{formatKg(totalMonthlyKgCo2eProxy)}</span>.
            </>
          )}
        </div>
      </div>
    </section>
  );
}
