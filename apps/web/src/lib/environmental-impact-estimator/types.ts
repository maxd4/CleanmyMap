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

export type EnvironmentalImpactEstimateInput = {
  generatedAt?: string | null;
  site?: EnvironmentalImpactScopeInput | null;
  user?: EnvironmentalImpactScopeInput | null;
  infrastructure?: EnvironmentalImpactInfrastructureInput | null;
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

export type EnvironmentalImpactInfrastructureServiceKey =
  | "vercel"
  | "supabase"
  | "resend"
  | "clerk"
  | "posthog"
  | "sentry"
  | "upstash"
  | "pinecone"
  | "stripe"
  | "lwsDomain";

export type EnvironmentalImpactGraphGranularity = "day" | "week" | "month";

export type EnvironmentalImpactInfrastructureMetricKey =
  | "vercelPageViews"
  | "vercelFunctionInvocations"
  | "vercelDeployments"
  | "vercelBandwidthGb"
  | "supabaseDbRequests"
  | "supabaseAuthEvents"
  | "supabaseStorageGbMonths"
  | "supabaseRealtimeEvents"
  | "supabaseEgressGb"
  | "resendEmailsSent"
  | "resendBatchRequests"
  | "clerkAuthEvents"
  | "clerkSessionRefreshes"
  | "posthogEvents"
  | "sentryErrorEvents"
  | "upstashOperations"
  | "pineconeQueries"
  | "stripePaymentOperations"
  | "lwsDomainYears"
  | "lwsDnsQueries";

export type EnvironmentalImpactInfrastructureMetricsInput = Partial<
  Record<EnvironmentalImpactInfrastructureMetricKey, number | null>
>;

export type EnvironmentalImpactUsageProfileInput = {
  monthlyPageViews?: number | null;
  monthlyActiveUsers?: number | null;
  monthlySessions?: number | null;
  monthlyEmailsSent?: number | null;
  monthlyDeployments?: number | null;
  monthlyPdfExports?: number | null;
  monthlyMapViews?: number | null;
  monthlyAiCalls?: number | null;
  monthlyStorageGbMonths?: number | null;
  monthlyApiRequests?: number | null;
  monthlyAuthEvents?: number | null;
  monthlyRealtimeEvents?: number | null;
  monthlyEgressGb?: number | null;
  monthlyBandwidthGb?: number | null;
  monthlyErrorEvents?: number | null;
  growthRateMonthly?: number | null;
  seasonalityAmplitude?: number | null;
  horizonMonths?: number | null;
};

export type EnvironmentalImpactInfrastructureInput = {
  launchedAt?: string | null;
  referencePeriodMonths?: number | null;
  metrics?: EnvironmentalImpactInfrastructureMetricsInput | null;
  usage?: EnvironmentalImpactUsageProfileInput | null;
};

export type EnvironmentalImpactInfrastructureMetricDefinition = {
  key: EnvironmentalImpactInfrastructureMetricKey;
  label: string;
  unitLabel: string;
  proxyKgCo2ePerUnit: number;
  referenceMonthlyQuantity: number;
};

export type EnvironmentalImpactInfrastructureServiceDefinition = {
  key: EnvironmentalImpactInfrastructureServiceKey;
  label: string;
  description: string;
  sourceNote: string;
  basis: "monthly" | "annual";
  metricKeys: EnvironmentalImpactInfrastructureMetricKey[];
};

export type EnvironmentalImpactInfrastructureMetricEstimate =
  EnvironmentalImpactInfrastructureMetricDefinition & {
    quantityPerMonth: number | null;
    estimatedKgCo2eProxy: number | null;
    source: "input" | "derived" | "reference";
  };

export type EnvironmentalImpactInfrastructureServiceEstimate = {
  key: EnvironmentalImpactInfrastructureServiceKey;
  label: string;
  description: string;
  sourceNote: string;
  basis: "monthly" | "annual";
  status: "reference" | "derived" | "partial" | "ready";
  monthlyKgCo2eProxy: number | null;
  annualKgCo2eProxy: number | null;
  sharePercent: number;
  confidencePercent: number;
  uncertaintyPercent: number;
  metricCount: number;
  referenceMetricCount: number;
  metricEstimates: EnvironmentalImpactInfrastructureMetricEstimate[];
};

export type EnvironmentalImpactUsageProfileEstimate = {
  monthlyPageViews: number;
  monthlyActiveUsers: number;
  monthlySessions: number;
  monthlyEmailsSent: number;
  monthlyDeployments: number;
  monthlyPdfExports: number;
  monthlyMapViews: number;
  monthlyAiCalls: number;
  monthlyStorageGbMonths: number;
  monthlyApiRequests: number;
  monthlyAuthEvents: number;
  monthlyRealtimeEvents: number;
  monthlyEgressGb: number;
  monthlyBandwidthGb: number;
  monthlyErrorEvents: number;
  growthRateMonthly: number;
  seasonalityAmplitude: number;
  horizonMonths: number;
  source: "input" | "derived";
  derivedFrom: string[];
};

export type EnvironmentalImpactInfrastructureCurvePoint = {
  index: number;
  monthLabel: string;
  date: string;
  monthlyKgCo2eProxy: number;
  cumulativeKgCo2eProxy: number;
  lowerKgCo2eProxy: number;
  upperKgCo2eProxy: number;
  confidencePercent: number;
  breakdown: Partial<Record<EnvironmentalImpactInfrastructureServiceKey, number>>;
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

export type EnvironmentalImpactInfrastructureEstimate = {
  mode: "reference" | "measured";
  generatedAt: string;
  launchedAt: string;
  referencePeriodMonths: number;
  totalKgCo2eProxy: number | null;
  monthlyKgCo2eProxy: number | null;
  annualKgCo2eProxy: number | null;
  confidencePercent: number;
  uncertaintyPercent: number;
  usage: EnvironmentalImpactUsageProfileEstimate;
  services: EnvironmentalImpactInfrastructureServiceEstimate[];
  curve: EnvironmentalImpactInfrastructureCurvePoint[];
  graph: EnvironmentalImpactGraphEstimate;
  hypotheses: string[];
  notes: string[];
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
};

export type EnvironmentalImpactEstimatorMethodology = {
  version: string;
  generatedAt: string;
  hypotheses: string[];
  limitations: string[];
  notes: string[];
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
};

export type EnvironmentalImpactDataGapNote = {
  key: string;
  title: string;
  detail: string;
  scope: EnvironmentalImpactScopeKey | "infrastructure" | "history";
  severity: "info" | "warn";
};

export type EnvironmentalImpactProjectSignal = {
  label: string;
  value: number | string;
  detail: string;
  basis: "all_time" | "recent" | "derived";
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
