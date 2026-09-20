import { describe, expect, it } from "vitest";
import type {
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactInfrastructureServiceKey,
  EnvironmentalImpactUsageProfileEstimate,
} from "./types";
import {
  buildLifecycleEstimate,
  buildLifecycleScoreSignals,
} from "./services/lifecycle";

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
  monthlyElectricityKwh: 10,
  growthRateMonthly: 0,
  seasonalityAmplitude: 0,
  horizonMonths: 12,
  source: "input",
  derivedFrom: [],
  provenance: [],
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
  service("clerk", 60),
  service("posthog", 70),
  service("sentry", 80),
  service("upstash", 90),
  service("pinecone", 100),
  service("stripe", 110),
  service("lwsDomain", 120),
];

describe("lifecycle signal and estimate parity", () => {
  it("preserves the complete axis and component signal object", () => {
    expect(buildLifecycleScoreSignals(usage, services)).toEqual({
      energy: 32.46,
      carbon: 33.34,
      water: 25.72,
      materials: 23.36,
      ewaste: 24.34,
      servers: 67.18,
      gpus: 22.26,
      userDevices: 37.92,
      networks: 44.76,
      storage: 12.88,
      maintenance: 27.64,
      renewal: 28.12,
      endOfLife: 44.06,
    });

    expect(
      buildLifecycleScoreSignals(
        {
          ...usage,
          monthlyCodexActiveMinutes: null,
          monthlyCodexTestsRun: null,
          monthlyCodexConversationTurns: null,
          monthlyCodexFilesTouched: null,
        },
        services,
      ),
    ).toMatchObject({
      carbon: 28.72,
      ewaste: 21.1,
      gpus: 14.12,
      endOfLife: 41.18,
    });
  });

  it("preserves measured energy, lifecycle totals, parts and water quantity semantics", () => {
    const estimate = buildLifecycleEstimate(usage, services, 100);

    expect(estimate).toMatchObject({
      totalKgCo2eProxy: 100,
      source: "mixed",
    });
    expect(
      estimate.axisEstimates.map(({ key, quantity, estimatedKgCo2eProxy, sharePercent }) => ({
        key,
        quantity,
        estimatedKgCo2eProxy,
        sharePercent,
      })),
    ).toEqual([
      { key: "energy", quantity: 10, estimatedKgCo2eProxy: 3.5, sharePercent: 3.5 },
      { key: "carbon", quantity: 30.135912, estimatedKgCo2eProxy: 30.135912, sharePercent: 30.135912 },
      { key: "water", quantity: null, estimatedKgCo2eProxy: 23.24822, sharePercent: 23.24822 },
      { key: "materials", quantity: 28.533816, estimatedKgCo2eProxy: 21.115024, sharePercent: 21.115024 },
      { key: "ewaste", quantity: 18.334036, estimatedKgCo2eProxy: 22.000843, sharePercent: 22.000843 },
    ]);
    expect(
      estimate.componentEstimates.map(({ key, quantity, estimatedKgCo2eProxy, sharePercent }) => ({
        key,
        quantity,
        estimatedKgCo2eProxy,
        sharePercent,
      })),
    ).toEqual([
      { key: "servers", quantity: 294.835338, estimatedKgCo2eProxy: 23.586827, sharePercent: 23.586827 },
      { key: "gpus", quantity: 65.12885, estimatedKgCo2eProxy: 7.815462, sharePercent: 7.815462 },
      { key: "userDevices", quantity: 665.6836, estimatedKgCo2eProxy: 13.313672, sharePercent: 13.313672 },
      { key: "networks", quantity: 142865.354545, estimatedKgCo2eProxy: 15.715189, sharePercent: 15.715189 },
      { key: "storage", quantity: 301.476933, estimatedKgCo2eProxy: 4.522154, sharePercent: 4.522154 },
      { key: "maintenance", quantity: 539.131944, estimatedKgCo2eProxy: 9.704375, sharePercent: 9.704375 },
      { key: "renewal", quantity: 197.45804, estimatedKgCo2eProxy: 9.872902, sharePercent: 9.872902 },
      { key: "endOfLife", quantity: 70.315541, estimatedKgCo2eProxy: 15.469419, sharePercent: 15.469419 },
    ]);

    expect(
      estimate.axisEstimates.reduce(
        (total, axis) => total + (axis.estimatedKgCo2eProxy ?? 0),
        0,
      ),
    ).toBeCloseTo(100, 5);
  });

  it("keeps the lifecycle result unavailable without a physical total", () => {
    const estimate = buildLifecycleEstimate(usage, services, null);

    expect(estimate.totalKgCo2eProxy).toBeNull();
    expect(estimate.source).toBe("reference");
    expect(estimate.axisEstimates).toHaveLength(5);
    expect(estimate.componentEstimates).toHaveLength(8);
    expect(estimate.axisEstimates.find((axis) => axis.key === "energy")?.quantity).toBe(10);
    expect(estimate.axisEstimates.find((axis) => axis.key === "water")?.quantity).toBeNull();
    expect(estimate.axisEstimates.every((axis) => axis.estimatedKgCo2eProxy === null)).toBe(true);
    expect(estimate.componentEstimates.every((component) => component.quantity === null)).toBe(true);
  });
});
