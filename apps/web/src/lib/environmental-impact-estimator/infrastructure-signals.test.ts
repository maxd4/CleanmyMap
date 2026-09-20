import { describe, expect, it } from "vitest";
import type {
  EnvironmentalImpactInfrastructureMetricKey,
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactInfrastructureServiceKey,
  EnvironmentalImpactUsageProfileEstimate,
} from "./types";
import {
  buildSecondOrderScoreSignals,
  deriveMetricQuantityFromUsage,
} from "./services/infrastructure";

const usage: EnvironmentalImpactUsageProfileEstimate = {
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

const expectedMetricQuantities: Partial<Record<EnvironmentalImpactInfrastructureMetricKey, number | null>> = {
  vercelPageViews: 101,
  vercelFunctionInvocations: 174.16,
  vercelDeployments: 6,
  vercelBandwidthGb: 7,
  githubWorkflowRunsCount30d: null,
  supabaseDbRequests: 242.4,
  supabaseAuthEvents: 8,
  supabaseStorageGbMonths: 9,
  supabaseRealtimeEvents: 10,
  supabaseEgressGb: 11,
  resendEmailsSent: 12,
  resendBatchRequests: 0.6,
  chatgptConversationHours: 13,
  codexSessions: 14,
  codexConversationTurns: 15,
  codexToolActions: 16,
  codexShellCommands: 17,
  codexFilesTouched: 18,
  codexTestsRun: 19,
  codexChangedLines: 20,
  codexActiveMinutes: 21,
  clerkAuthEvents: 8,
  clerkSessionRefreshes: 18.7,
  posthogEvents: 120.9,
  sentryErrorEvents: 23,
  upstashOperations: 86.24,
  pineconeQueries: 14.315,
  stripePaymentOperations: 0.24,
  lwsDomainYears: null,
  lwsDnsQueries: 20_003.27,
};

function service(
  key: EnvironmentalImpactInfrastructureServiceKey,
  monthlyKgCo2eProxy: number | null,
): EnvironmentalImpactInfrastructureServiceEstimate {
  return {
    key,
    label: key,
    description: "",
    sourceNote: "",
    basis: "monthly",
    status: "ready",
    monthlyKgCo2eProxy,
    annualKgCo2eProxy: monthlyKgCo2eProxy === null ? null : monthlyKgCo2eProxy * 12,
    sharePercent: 0,
    confidencePercent: 100,
    uncertaintyPercent: 0,
    metricCount: 0,
    referenceMetricCount: 0,
    metricEstimates: [],
  };
}

const services = [
  service("vercel", 10),
  service("supabase", 20),
  service("resend", 30),
  service("chatgpt", 40),
  service("codex", 50),
  service("posthog", 60),
  service("sentry", 70),
  service("upstash", 80),
  service("pinecone", 90),
  service("stripe", 100),
  service("lwsDomain", 110),
];

describe("infrastructure signal derivations", () => {
  it("keeps every metric resolver and explicit non-derivations numerically stable", () => {
    for (const [metricKey, expected] of Object.entries(expectedMetricQuantities)) {
      expect(
        deriveMetricQuantityFromUsage(metricKey, usage),
        metricKey,
      ).toBe(expected);
    }
  });

  it("keeps second-order signals and nullable Codex fallbacks stable", () => {
    expect(buildSecondOrderScoreSignals(usage, services)).toEqual({
      grossCo2: 83.28,
      electricity: 14.64,
      otherGhgs: 25.06,
      chemicals: 13.88,
      water: 24.64,
    });

    expect(
      buildSecondOrderScoreSignals(
        {
          ...usage,
          monthlyCodexActiveMinutes: null,
          monthlyCodexTestsRun: null,
          monthlyCodexFilesTouched: null,
          monthlyCodexSessions: null,
        },
        services,
      ),
    ).toEqual({
      grossCo2: 83.28,
      electricity: 14.64,
      otherGhgs: 17.36,
      chemicals: 11,
      water: 21.28,
    });
  });
});
