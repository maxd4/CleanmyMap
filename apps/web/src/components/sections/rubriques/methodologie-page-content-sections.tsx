import type { ReactNode } from "react";
import type { EnvironmentalImpactElectricityEstimate, EnvironmentalImpactInfrastructureServiceEstimate, EnvironmentalImpactSnapshotRecord, EnvironmentalImpactWaterEstimate } from "@/lib/environmental-impact-estimator/types";
import type { GitHubRepositoryStats } from "@/lib/github/github-repository-stats";
import type { PublicLandingActionAggregation } from "@/lib/accueil/action-participant-aggregation";
import { ImpactTerrain2026MethodologySection } from "./impact-terrain-2026-methodology-section";
import { RouteMethodologySection } from "./route-methodology-section";
import { MethodologieCalculationSection, MethodologieDisplayModesSection, MethodologieQuotaSection } from "./methodologie-page-transverse-sections";
import { MethodologieFieldLimitsSection, MethodologieReportCards, MethodologieReportStepsSection } from "./methodologie-page-report-sections";
import { MethodologieTechnicalImpactSection } from "./methodologie-page-technical-impact";
import type { OpenSourceDoc } from "./action-map-methodology-section";

type MethodologyData = {
  formulas: Record<string, string>;
  scope: string;
  version: string;
};

type ImpactTotals = {
  monthlyKgCo2eProxy: number | null;
  annualKgCo2eProxy: number | null;
  totalKgCo2eProxy: number | null;
  generatedAt: string | null;
};

type NavigationProps = {
  actionMapSection: ReactNode;
  includeMapAndRouteContent: boolean;
  includeReportsContent: boolean;
  impactTerrainResults: PublicLandingActionAggregation | null;
  isFrench: boolean;
};

export function MethodologieNavigationSections({ actionMapSection, includeMapAndRouteContent, includeReportsContent, impactTerrainResults, isFrench }: NavigationProps) {
  return (
    <>
      {includeReportsContent ? <ImpactTerrain2026MethodologySection isFrench={isFrench} results={impactTerrainResults} /> : null}
      {includeMapAndRouteContent ? actionMapSection : null}
      {includeMapAndRouteContent ? <RouteMethodologySection /> : null}
    </>
  );
}

type TransverseProps = {
  freePlanServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  githubStats: GitHubRepositoryStats | null;
  impactTotals: ImpactTotals;
  includeTransverseContent: boolean;
  isFrench: boolean;
  locale: "fr" | "en";
  methodology: MethodologyData;
  quotaServicesDoc: OpenSourceDoc;
};

export function MethodologieTransverseSections({ includeTransverseContent, ...props }: TransverseProps) {
  if (!includeTransverseContent) return null;
  return (
    <>
      <MethodologieDisplayModesSection isFrench={props.isFrench} locale={props.locale} />
      <MethodologieCalculationSection isFrench={props.isFrench} methodology={props.methodology} />
      <MethodologieQuotaSection {...props} />
    </>
  );
}

type ReportProps = {
  electricity: EnvironmentalImpactElectricityEstimate;
  freePlanServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  githubStats: GitHubRepositoryStats | null;
  impactDoc: OpenSourceDoc;
  impactGeneratedAt: string | null;
  impactLaunchedAt: string | null;
  impactSnapshots: EnvironmentalImpactSnapshotRecord[];
  impactTotals: ImpactTotals;
  includeReportsContent: boolean;
  isFrench: boolean;
  methodology: MethodologyData;
  sources: Record<string, string>;
  t: (key: string, values?: Record<string, string | number>) => string;
  water: EnvironmentalImpactWaterEstimate;
};

export function MethodologieReportSections({ includeReportsContent, ...props }: ReportProps) {
  if (!includeReportsContent) return null;
  return (
    <>
      <MethodologieReportStepsSection isFrench={props.isFrench} />
      <MethodologieReportCards isFrench={props.isFrench} methodology={props.methodology} sources={props.sources} t={props.t} />
      <MethodologieFieldLimitsSection isFrench={props.isFrench} />
      <MethodologieTechnicalImpactSection
        electricity={props.electricity}
        freePlanServices={props.freePlanServices}
        githubStats={props.githubStats}
        impactDoc={props.impactDoc}
        impactGeneratedAt={props.impactGeneratedAt}
        impactLaunchedAt={props.impactLaunchedAt}
        impactSnapshots={props.impactSnapshots}
        impactTotals={props.impactTotals}
        isFrench={props.isFrench}
        water={props.water}
      />
    </>
  );
}
