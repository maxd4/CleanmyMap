"use client";

import { useMemo, useState } from "react";
import type { EnvironmentalImpactInfrastructureServiceEstimate } from "@/lib/environmental-impact-estimator/types";
import type { GitHubRepositoryStats } from "@/lib/github/github-repository-stats";
import { type MethodologyTabKey, type QuotaDisplayServiceKey } from "./free-plan-services-methodology-visual.data";
import { FreePlanServicesMethodologyImpactView } from "./free-plan-services-methodology-visual.impact";
import { FreePlanServicesMethodologyQuotaView } from "./free-plan-services-methodology-visual.quotas";
import {
  buildDisplayedServices,
  buildImpactDetailRows,
  type ImpactSelectionKey,
} from "./free-plan-services-methodology-visual.logic";

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
  const initialSelectedKey =
    displayedServices.find((service) => service.key === "supabase")?.key ??
    displayedServices[0]?.key ??
    "github";
  const [selectedKey, setSelectedKey] = useState<QuotaDisplayServiceKey>(initialSelectedKey);
  const [hoveredKey, setHoveredKey] = useState<QuotaDisplayServiceKey | null>(null);
  const initialDisplayTab = displayMode === "both" ? initialTab : displayMode;
  const [activeTab, setActiveTab] = useState<MethodologyTabKey>(initialDisplayTab);
  const [selectedImpactKey, setSelectedImpactKey] = useState<ImpactSelectionKey | null>(null);

  return activeTab === "impact" ? (
    <FreePlanServicesMethodologyImpactView
      services={services}
      impactTotals={resolvedImpactTotals}
      isFrench={isFrench}
      sectionId={sectionId}
      activeTab={activeTab}
      showTabs={displayMode === "both"}
      onTabChange={setActiveTab}
      selectedImpactKey={selectedImpactKey}
      onSelectImpact={setSelectedImpactKey}
    />
  ) : (
    <FreePlanServicesMethodologyQuotaView
      displayedServices={displayedServices}
      githubStats={githubStats}
      isFrench={isFrench}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      selectedKey={selectedKey}
      hoveredKey={hoveredKey}
      onSelectService={setSelectedKey}
      onHoverService={setHoveredKey}
    />
  );
}
