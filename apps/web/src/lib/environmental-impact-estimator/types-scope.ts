export type EnvironmentalImpactScopeKey = "site" | "user";

export type EnvironmentalImpactPostKey =
  | "pageViews"
  | "storedImages"
  | "apiRequests"
  | "pdfExports"
  | "maps"
  | "storageGbMonths"
  | "aiCalls";

export type EnvironmentalImpactScopeStatus =
  | "unbound"
  | "partial"
  | "ready";

export type EnvironmentalImpactValidationIssue = {
  path: string;
  message: string;
};

export type EnvironmentalImpactValidationState = {
  valid: boolean;
  issues: EnvironmentalImpactValidationIssue[];
};

export type EnvironmentalImpactScopeInput = {
  pageViews?: number | null;
  storedImages?: number | null;
  apiRequests?: number | null;
  pdfExports?: number | null;
  maps?: number | null;
  storageGbMonths?: number | null;
  aiCalls?: number | null;
  accountCreatedAt?: string | null;
  measuredAt?: string | null;
};

export type EnvironmentalImpactPostDefinition = {
  key: EnvironmentalImpactPostKey;
  label: string;
  description: string;
  unitLabel: string;
  proxyKgCo2ePerUnit: number;
  proxyRationale: string;
};

export type EnvironmentalImpactPostEstimate = EnvironmentalImpactPostDefinition & {
  quantity: number | null;
  estimatedKgCo2eProxy: number | null;
  state: "available" | "missing";
};

export type EnvironmentalImpactGraphGranularity = "day" | "week" | "month";

export type EnvironmentalImpactCurveDriverKey =
  | "pageView"
  | "community"
  | "notifications"
  | "actions"
  | "pdf"
  | "ia"
  | "codex";

export type EnvironmentalImpactCurveDriverBreakdown = Record<
  EnvironmentalImpactCurveDriverKey,
  number
>;

export type EnvironmentalImpactScopeCurvePoint = {
  index: number;
  weekLabel: string;
  date: string;
  weeklyKgCo2eProxy: number;
  cumulativeKgCo2eProxy: number;
  lowerKgCo2eProxy: number;
  upperKgCo2eProxy: number;
  confidencePercent: number;
  breakdown: Partial<Record<EnvironmentalImpactPostKey, number>>;
  driverBreakdown: EnvironmentalImpactCurveDriverBreakdown;
};

export type EnvironmentalImpactGraphEstimate = {
  title: string;
  mode: "cumulative";
  granularity: EnvironmentalImpactGraphGranularity;
  xAxisLabel: string;
  yAxisLabel: string;
  confidencePercent: number;
  uncertaintyPercent: number;
  coveragePercent: number;
  considerations: string[];
};

export type EnvironmentalImpactScopeEstimate = {
  key: EnvironmentalImpactScopeKey;
  label: string;
  periodLabel: string;
  accountCreatedAt: string | null;
  measuredAt: string | null;
  status: EnvironmentalImpactScopeStatus;
  totalKgCo2eProxy: number | null;
  availablePostCount: number;
  missingPostCount: number;
  coveragePercent: number;
  posts: EnvironmentalImpactPostEstimate[];
  curve: EnvironmentalImpactScopeCurvePoint[];
};
