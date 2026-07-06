"use client";

import { useMemo, useState } from "react";
import { Bell, Cloud, CreditCard, ExternalLink, Globe, Leaf, MoreHorizontal, PieChart, Sparkles } from "lucide-react";
import type { EnvironmentalImpactInfrastructureServiceEstimate } from "@/lib/environmental-impact-estimator/types";
import type { GitHubRepositoryStats } from "@/lib/github/github-repository-stats";
import { formatServiceQuotaStateLabel, isDevelopmentAiServiceKey } from "@/lib/environmental-impact-estimator/service-risk";
import { cn } from "@/lib/utils";
import { TAB_ITEMS, type MethodologyTabKey, type QuotaDisplayServiceKey } from "./free-plan-services-methodology-visual.data";
import { QuotaMetricRow, ServiceIconCard, TabPill } from "./free-plan-services-methodology-visual.cards";
import {
  buildDisplayedServices,
  buildImpactDetailRows,
  formatFallbackStatusLabel,
  formatImpactKg,
  formatImpactValueLabel,
  formatMaybePercent,
  formatPercent,
  getImpactDetailBadges,
  getImpactVisual,
  getPlanTone,
  getStateTone,
  type ImpactDetailBadge,
  type ImpactDetailMetric,
  type ImpactSelectionKey,
} from "./free-plan-services-methodology-visual.logic";

type ImpactDetailSelection = {
  key: ImpactSelectionKey;
  title: string;
  subtitle: string;
  badgeLabels: ImpactDetailBadge[];
  contributionPercentLabel: string;
  contributionValueLabel: string;
  serviceRows: ImpactDetailMetric[];
};

export { buildImpactDetailRows };

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
