import { describe, expect, it } from "vitest";
import type { EnvironmentalImpactInfrastructureMetricKey } from "./types";
import {
  createEnvironmentalImpactServices,
  createEnvironmentalImpactUsage,
} from "./environmental-impact-test-fixtures";
import {
  buildSecondOrderScoreSignals,
  deriveMetricQuantityFromUsage,
} from "./services/infrastructure";

const usage = createEnvironmentalImpactUsage();

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

const services = createEnvironmentalImpactServices("infrastructure");

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
