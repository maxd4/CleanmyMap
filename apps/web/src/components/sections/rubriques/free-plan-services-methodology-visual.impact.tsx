"use client";

import { MoreHorizontal, Sparkles } from "lucide-react";
import type { EnvironmentalImpactInfrastructureServiceEstimate } from "@/lib/environmental-impact-estimator/types";
import { isDevelopmentAiServiceKey } from "@/lib/environmental-impact-estimator/service-risk";
import { TAB_ITEMS, type MethodologyTabKey } from "./free-plan-services-methodology-visual.data";
import { TabPill } from "./free-plan-services-methodology-visual.cards";
import {
  buildImpactDetailRows,
  formatFallbackStatusLabel,
  formatImpactValueLabel,
  formatMaybePercent,
  getImpactDetailBadges,
  getImpactVisual,
  type ImpactSelectionKey,
} from "./free-plan-services-methodology-visual.logic";
import { ImpactContributorsLegend } from "./free-plan-services-methodology-visual.impact.contributors";
import { ImpactContributionVisualization } from "./free-plan-services-methodology-visual.impact.contribution";
import { ImpactSelectionDetail } from "./free-plan-services-methodology-visual.impact.detail";
import { ImpactSummaryCards } from "./free-plan-services-methodology-visual.impact.summary";
import type { ImpactDetailSelection, ImpactSegment, ImpactTotals } from "./free-plan-services-methodology-visual.impact.types";

type Props = {
  services: EnvironmentalImpactInfrastructureServiceEstimate[];
  impactTotals: ImpactTotals;
  isFrench: boolean;
  activeTab: MethodologyTabKey;
  displayMode: "both" | MethodologyTabKey;
  onTabChange: (tab: MethodologyTabKey) => void;
  selectedImpactKey: ImpactSelectionKey | null;
  onSelectImpactKey: (key: ImpactSelectionKey | null) => void;
  sectionId: string;
};

type ImpactViewModel = {
  barSegments: ImpactSegment[];
  developmentLineLabel: string;
  developmentSharePercent: number | null;
  inactiveProductionImpactServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  selectedImpactSelection: ImpactDetailSelection | null;
  topContributors: EnvironmentalImpactInfrastructureServiceEstimate[];
  totalAnnualImpact: number | null;
  totalDevelopmentImpact: number;
  totalLifetimeImpact: number | null;
  totalMonthlyImpact: number;
};

function sortImpactServices(services: EnvironmentalImpactInfrastructureServiceEstimate[]) {
  return services
    .filter((service) => typeof service.monthlyKgCo2eProxy === "number")
    .slice()
    .sort((left, right) => {
      const byCharge = (right.monthlyKgCo2eProxy ?? 0) - (left.monthlyKgCo2eProxy ?? 0);
      return byCharge !== 0 ? byCharge : left.label.localeCompare(right.label, "fr");
    });
}

function buildImpactSegments({
  activeProductionServices,
  developmentServices,
  isFrench,
  totalDevelopmentImpact,
  totalMonthlyImpact,
}: {
  activeProductionServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  developmentServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  isFrench: boolean;
  totalDevelopmentImpact: number;
  totalMonthlyImpact: number;
}): ImpactSegment[] {
  const topProductionServices = activeProductionServices.slice(0, 6);
  const groupedProductionServices = activeProductionServices.slice(topProductionServices.length);
  const topSegments = topProductionServices.map((service) => {
    const visual = getImpactVisual(service.key);
    return {
      key: service.key,
      label: service.label,
      shortLabel: service.label.split(" — ")[0] ?? service.label,
      icon: visual.icon,
      color: visual.color,
      sharePercent:
        totalMonthlyImpact > 0 ? ((service.monthlyKgCo2eProxy ?? 0) / totalMonthlyImpact) * 100 : null,
      monthlyKgCo2eProxy: service.monthlyKgCo2eProxy ?? 0,
      kind: "production" as const,
      services: [service],
    };
  });
  const developmentSegment = totalDevelopmentImpact > 0
    ? [{
        key: "development" as const,
        label: isFrench ? "Développement IA" : "Development AI",
        shortLabel: isFrench ? "Développement" : "Development",
        icon: Sparkles,
        color: "#ef4444",
        sharePercent: (totalDevelopmentImpact / totalMonthlyImpact) * 100,
        monthlyKgCo2eProxy: totalDevelopmentImpact,
        kind: "development" as const,
        services: developmentServices,
      }]
    : [];
  const groupedTotal = groupedProductionServices.reduce(
    (sum, service) => sum + (service.monthlyKgCo2eProxy ?? 0),
    0,
  );
  const otherSegment = groupedProductionServices.length > 0
    ? [{
        key: "other" as const,
        label: isFrench ? "Autres" : "Other",
        shortLabel: isFrench ? "Autres" : "Other",
        icon: MoreHorizontal,
        color: "#e5e7eb",
        sharePercent: totalMonthlyImpact > 0 ? (groupedTotal / totalMonthlyImpact) * 100 : null,
        monthlyKgCo2eProxy: groupedTotal,
        kind: "other" as const,
        services: groupedProductionServices,
      }]
    : [];
  return [...topSegments, ...developmentSegment, ...otherSegment];
}

function buildImpactSelection({
  developmentServices,
  groupedProductionServices,
  isFrench,
  selectedImpactKey,
  segments,
}: {
  developmentServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  groupedProductionServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  isFrench: boolean;
  selectedImpactKey: ImpactSelectionKey | null;
  segments: ImpactSegment[];
}): ImpactDetailSelection | null {
  const selectedSegment = selectedImpactKey
    ? segments.find((segment) => segment.key === selectedImpactKey) ?? null
    : null;
  if (!selectedSegment) return null;

  const serviceRows: ImpactDetailSelection["serviceRows"] = selectedSegment.key === "development"
    ? developmentServices.map((service) => ({
        label: service.label,
        descriptionLabel: isFrench ? "Développement IA" : "AI development",
        valueLabel: service.monthlyKgCo2eProxy === null
          ? isFrench ? "valeur à compléter" : "value to complete"
          : formatImpactValueLabel(service.monthlyKgCo2eProxy),
        statusLabel: service.monthlyKgCo2eProxy === null ? "à compléter" : "estimé",
      }))
    : selectedSegment.key === "other"
      ? groupedProductionServices.map((service) => ({
          label: service.label,
          descriptionLabel: isFrench ? "Contribution faible regroupée dans Autres." : "Low contribution grouped in Other.",
          valueLabel: service.monthlyKgCo2eProxy === null
            ? isFrench ? "contribution négligeable ou non mesurée" : "negligible or unmeasured contribution"
            : formatImpactValueLabel(service.monthlyKgCo2eProxy),
          statusLabel: service.monthlyKgCo2eProxy === null ? "à compléter" : "estimé",
        }))
      : selectedSegment.services[0]
        ? buildImpactDetailRows(selectedSegment.services[0], isFrench)
        : [];

  return {
    key: selectedSegment.key,
    title: selectedSegment.key === "other"
      ? isFrench ? "Autres services" : "Other services"
      : selectedSegment.label,
    subtitle: selectedSegment.key === "other"
      ? isFrench ? "Services regroupés sous la portion négligeable" : "Grouped services under the negligible share"
      : selectedSegment.key === "development"
        ? developmentServices.map((service) => service.label).join(" · ")
        : selectedSegment.label,
    badgeLabels: getImpactDetailBadges(selectedSegment.key, isFrench),
    contributionPercentLabel: formatMaybePercent(selectedSegment.sharePercent),
    contributionValueLabel: formatImpactValueLabel(selectedSegment.monthlyKgCo2eProxy),
    serviceRows,
  };
}

function buildImpactViewModel({
  impactTotals,
  isFrench,
  selectedImpactKey,
  services,
}: {
  impactTotals: ImpactTotals;
  isFrench: boolean;
  selectedImpactKey: ImpactSelectionKey | null;
  services: EnvironmentalImpactInfrastructureServiceEstimate[];
}): ImpactViewModel {
  const impactServices = sortImpactServices(services);
  const developmentServices = impactServices.filter((service) => isDevelopmentAiServiceKey(service.key));
  const productionServices = impactServices.filter((service) => !isDevelopmentAiServiceKey(service.key));
  const activeProductionServices = productionServices.filter((service) => (service.monthlyKgCo2eProxy ?? 0) > 0);
  const inactiveProductionImpactServices = productionServices.filter((service) => (service.monthlyKgCo2eProxy ?? 0) <= 0);
  const totalMonthlyImpact = impactServices.reduce((sum, service) => sum + (service.monthlyKgCo2eProxy ?? 0), 0);
  const totalDevelopmentImpact = developmentServices.reduce((sum, service) => sum + (service.monthlyKgCo2eProxy ?? 0), 0);
  const totalAnnualImpact = impactTotals.annualKgCo2eProxy ?? (impactServices.every((service) => service.annualKgCo2eProxy !== null)
    ? impactServices.reduce((sum, service) => sum + (service.annualKgCo2eProxy ?? 0), 0)
    : null);
  const segments = buildImpactSegments({
    activeProductionServices,
    developmentServices,
    isFrench,
    totalDevelopmentImpact,
    totalMonthlyImpact,
  });
  const groupedProductionServices = activeProductionServices.slice(6);

  return {
    barSegments: segments,
    developmentLineLabel: developmentServices.length > 0
      ? developmentServices.map((service) => service.label).join(" · ")
      : formatFallbackStatusLabel("history"),
    developmentSharePercent: totalMonthlyImpact > 0 ? (totalDevelopmentImpact / totalMonthlyImpact) * 100 : null,
    inactiveProductionImpactServices,
    selectedImpactSelection: buildImpactSelection({
      developmentServices,
      groupedProductionServices,
      isFrench,
      selectedImpactKey,
      segments,
    }),
    topContributors: activeProductionServices.slice(0, 6),
    totalAnnualImpact,
    totalDevelopmentImpact,
    totalLifetimeImpact: impactTotals.totalKgCo2eProxy,
    totalMonthlyImpact,
  };
}

export function FreePlanServicesMethodologyVisualImpact({
  services,
  impactTotals,
  isFrench,
  activeTab,
  displayMode,
  onTabChange,
  selectedImpactKey,
  onSelectImpactKey,
  sectionId,
}: Props) {
  if (activeTab !== "impact") return null;

  const viewModel = buildImpactViewModel({ impactTotals, isFrench, selectedImpactKey, services });
  return (
    <section id={sectionId} className="rounded-[2.75rem] border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.24)] md:p-8">
      <div className="space-y-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="cmm-text-caption font-black uppercase tracking-[0.28em] text-rose-500/75">{isFrench ? "Pilotage de l'impact" : "Impact pilot"}</p>
            <h3 className="max-w-4xl text-3xl font-black tracking-tight text-slate-950 md:text-5xl">{isFrench ? "Impact carbone des services suivis" : "Carbon impact of tracked services"}</h3>
            <p className="cmm-text-body max-w-3xl">{isFrench ? "Lecture linéaire de l'ACV numérique. L'onglet carbone répond à une question précise: quel poste contribue le plus à l'empreinte estimée ?" : "Linear reading of the digital LCA. The carbon tab answers one question: which post contributes the most to the estimated footprint?"}</p>
          </div>
          {displayMode === "both" ? <div className="flex flex-wrap gap-3">{TAB_ITEMS.map((tab) => <TabPill key={tab.key} tab={tab} active={tab.key === activeTab} onClick={() => onTabChange(tab.key)} />)}</div> : null}
        </div>

        <ImpactSummaryCards impactTotals={impactTotals} isFrench={isFrench} totalAnnualImpact={viewModel.totalAnnualImpact} totalLifetimeImpact={viewModel.totalLifetimeImpact} developmentSharePercent={viewModel.developmentSharePercent} />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <ImpactContributionVisualization barSegments={viewModel.barSegments} developmentLineLabel={viewModel.developmentLineLabel} inactiveProductionImpactServices={viewModel.inactiveProductionImpactServices} isFrench={isFrench} onSelectImpactKey={onSelectImpactKey} selectedImpactKey={selectedImpactKey} />
            <ImpactSelectionDetail isFrench={isFrench} onClose={() => onSelectImpactKey(null)} selectedImpactSelection={viewModel.selectedImpactSelection} />
            <div className="mt-5 rounded-[1.6rem] border border-rose-200 bg-rose-50/60 p-4 text-sm leading-relaxed">
              {isFrench ? <>Chaque lecture publique est enregistrée pour conserver l&apos;historique. {impactTotals.generatedAt ? <span className="font-semibold text-slate-900">Dernière lecture: {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(impactTotals.generatedAt))}.</span> : null}</> : <>Each public reading is stored to preserve history. {impactTotals.generatedAt ? <span className="font-semibold text-slate-900">Latest reading: {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(impactTotals.generatedAt))}.</span> : null}</>}
            </div>
          </div>
          <ImpactContributorsLegend isFrench={isFrench} topContributors={viewModel.topContributors} totalMonthlyImpact={viewModel.totalMonthlyImpact} />
        </div>
      </div>
    </section>
  );
}
