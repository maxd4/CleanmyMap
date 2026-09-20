import type {
  EnvironmentalImpactInfrastructureEstimate,
  EnvironmentalImpactInfrastructureInput,
  EnvironmentalImpactWaterEstimate,
  EnvironmentalImpactElectricityEstimate,
} from "./types-infrastructure";
import type {
  EnvironmentalImpactCodexUsageMonthlyEstimate,
} from "./types-codex";
import type {
  EnvironmentalImpactLifecycleEstimate,
} from "./types-lifecycle";
import type {
  EnvironmentalImpactScopeEstimate,
  EnvironmentalImpactScopeInput,
  EnvironmentalImpactScopeKey,
  EnvironmentalImpactValidationState,
} from "./types-scope";

export type EnvironmentalImpactEstimateInput = {
  generatedAt?: string | null;
  site?: EnvironmentalImpactScopeInput | null;
  user?: EnvironmentalImpactScopeInput | null;
  infrastructure?: EnvironmentalImpactInfrastructureInput | null;
};

export type EnvironmentalImpactProjectAnchor = {
  key: string;
  label: string;
  description: string;
  kWhEquivalent: number | null;
  kgCo2eProxy: number | null;
  waterLitersEquivalent: number | null;
  comparisonNote: string;
};

export type EnvironmentalImpactAccountingStatus =
  | "OBSERVED"
  | "DERIVED"
  | "DECLARED"
  | "ASSUMPTION"
  | "PROXY"
  | "NA";

export type EnvironmentalImpactCanonicalAccounting = {
  statusVocabulary: readonly EnvironmentalImpactAccountingStatus[];
  projectPeriod: string;
  serviceAuditWindow: string;
  pre18MarchServiceUsage: string;
  centralAi: {
    tokenEquivalent: number;
    tokenStatus: readonly ["DECLARED", "ASSUMPTION"];
    energyKwhCalculated: number;
    energyMwhDisplayed: number;
    electricalCo2eKgCalculated: number;
    electricalCo2eTDisplayed: number;
    indirectWaterLitersCalculated: number;
    indirectWaterM3Displayed: number;
    partialLcaCo2eKgCalculated: number;
    partialLcaTDisplayed: number;
    physicalStatus: "PROXY";
    partialLcaStatus: readonly ["ASSUMPTION", "PROXY"];
  };
  chatgpt: {
    exactUsageStatus: "NA";
    environmentalStatus: "NA";
    note: string;
  };
  images: {
    quantity: number;
    quantityStatus: "DECLARED";
    energyStatus: "NA";
    co2eStatus: "NA";
    waterStatus: "NA";
  };
  services: Record<string, Record<string, string | number>>;
  materials: Record<string, string | number>;
};

export type EnvironmentalImpactEstimatorMethodology = {
  version: string;
  generatedAt: string;
  hypotheses: string[];
  limitations: string[];
  projectAnchors: EnvironmentalImpactProjectAnchor[];
  accounting: EnvironmentalImpactCanonicalAccounting;
  notes: string[];
  electricity: EnvironmentalImpactElectricityEstimate;
  water: EnvironmentalImpactWaterEstimate;
};

export type EnvironmentalImpactDataGapNote = {
  key: string;
  title: string;
  detail: string;
  scope: EnvironmentalImpactScopeKey | "infrastructure" | "history";
  severity: "info" | "warn";
};

export type EnvironmentalImpactEstimateModel = {
  version: string;
  generatedAt: string;
  validation: EnvironmentalImpactValidationState;
  methodology: EnvironmentalImpactEstimatorMethodology;
  dataGaps: EnvironmentalImpactDataGapNote[];
  site: EnvironmentalImpactScopeEstimate;
  user: EnvironmentalImpactScopeEstimate;
  infrastructure: EnvironmentalImpactInfrastructureEstimate;
  lifecycle: EnvironmentalImpactLifecycleEstimate;
};

export type EnvironmentalImpactProjectSignal = {
  label: string;
  value: number | string;
  detail: string;
  basis: "all_time" | "recent" | "derived";
};

export type EnvironmentalImpactProjectTrafficSignalBreakdown = {
  pageViewEvents: number;
  legacyPageViewEvents: number;
  distinctRoutes: number;
  topRoutes: Array<{
    path: string;
    count: number;
  }>;
};

export type EnvironmentalImpactProjectCommunitySignalBreakdown = {
  events: number;
  rsvps: number;
  notifications: number;
  unreadNotifications: number;
};

export type EnvironmentalImpactProjectCommunicationSignalBreakdown = {
  emailsSent: number;
  pdfExports: number;
};

export type EnvironmentalImpactProjectSignalBreakdown = {
  traffic: EnvironmentalImpactProjectTrafficSignalBreakdown;
  community: EnvironmentalImpactProjectCommunitySignalBreakdown;
  communication: EnvironmentalImpactProjectCommunicationSignalBreakdown;
};

export type EnvironmentalImpactProjectSignals = {
  generatedAt: string;
  launchedAt: string | null;
  accountCreatedAt: string | null;
  userId: string | null;
  periodDays: number;
  recentWindowDays: number;
  siteInput: EnvironmentalImpactScopeInput;
  userInput: EnvironmentalImpactScopeInput;
  infrastructureInput: EnvironmentalImpactInfrastructureInput;
  codexUsage: EnvironmentalImpactCodexUsageMonthlyEstimate | null;
  signalBreakdown?: EnvironmentalImpactProjectSignalBreakdown;
  highlights: EnvironmentalImpactProjectSignal[];
  notes: string[];
};

export type EnvironmentalImpactSnapshotRecord = {
  id: string;
  snapshotKey: string;
  snapshotDate: string;
  generatedAt: string;
  version: string;
  totalKgCo2eProxy: number | null;
  monthlyKgCo2eProxy: number | null;
  annualKgCo2eProxy: number | null;
  siteKgCo2eProxy: number | null;
  userKgCo2eProxy: number | null;
  confidencePercent: number;
  uncertaintyPercent: number;
  launchedAt: string | null;
  accountCreatedAt: string | null;
  model: EnvironmentalImpactEstimateModel;
  signals: EnvironmentalImpactProjectSignals;
};

export type EnvironmentalImpactDashboardResponse = {
  model: EnvironmentalImpactEstimateModel;
  snapshots: EnvironmentalImpactSnapshotRecord[];
  signals: EnvironmentalImpactProjectSignals;
};
