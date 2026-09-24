import type {
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactInfrastructureServiceKey,
  EnvironmentalImpactUsageProfileEstimate,
} from "./types";

export function createEnvironmentalImpactUsage(): EnvironmentalImpactUsageProfileEstimate {
  return {
    monthlyElectricityKwh: 10,
    monthlyDirectWaterConsumptionLiters: null,
    monthlyEvaporatedWaterLiters: null,
    monthlyPageViews: 101,
    monthlyActiveUsers: 24,
    monthlySessions: 22,
    monthlyEmailsSent: 12,
    monthlyDeployments: 6,
    monthlyPdfExports: 3,
    monthlyMapViews: 5,
    monthlyAiCalls: 4,
    monthlyChatgptConversationHours: 13,
    monthlyCodexSessions: 14,
    monthlyCodexConversationTurns: 15,
    monthlyCodexToolActions: 16,
    monthlyCodexShellCommands: 17,
    monthlyCodexFilesTouched: 18,
    monthlyCodexTestsRun: 19,
    monthlyCodexChangedLines: 20,
    monthlyCodexActiveMinutes: 21,
    monthlyStorageGbMonths: 9,
    monthlyApiRequests: 202,
    monthlyAuthEvents: 8,
    monthlyRealtimeEvents: 10,
    monthlyEgressGb: 11,
    monthlyBandwidthGb: 7,
    monthlyErrorEvents: 23,
    growthRateMonthly: 0,
    seasonalityAmplitude: 0,
    horizonMonths: 12,
    source: "input",
    derivedFrom: [],
    provenance: [],
  };
}

function service(
  key: EnvironmentalImpactInfrastructureServiceKey,
  monthlyKgCo2eProxy: number,
): EnvironmentalImpactInfrastructureServiceEstimate {
  return {
    key,
    label: key,
    description: "",
    sourceNote: "",
    basis: "monthly",
    status: "ready",
    monthlyKgCo2eProxy,
    annualKgCo2eProxy: monthlyKgCo2eProxy * 12,
    sharePercent: 0,
    confidencePercent: 100,
    uncertaintyPercent: 0,
    metricCount: 0,
    referenceMetricCount: 0,
    metricEstimates: [],
  };
}

export function createEnvironmentalImpactServices(
  variant: "infrastructure" | "lifecycle",
): EnvironmentalImpactInfrastructureServiceEstimate[] {
  const keysAndValues = variant === "infrastructure"
    ? ([
        ["vercel", 10], ["supabase", 20], ["resend", 30], ["chatgpt", 40],
        ["codex", 50], ["posthog", 60], ["sentry", 70], ["upstash", 80],
        ["pinecone", 90], ["stripe", 100], ["lwsDomain", 110],
      ] as const)
    : ([
        ["vercel", 10], ["supabase", 20], ["resend", 30], ["chatgpt", 40],
        ["codex", 50], ["clerk", 60], ["posthog", 70], ["sentry", 80],
        ["upstash", 90], ["pinecone", 100], ["stripe", 110], ["lwsDomain", 120],
      ] as const);

  return keysAndValues.map(([key, value]) => service(key, value));
}
