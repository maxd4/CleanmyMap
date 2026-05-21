import { describe, expect, it } from "vitest";
import {
  computeEnvironmentalImpactEstimate,
  normalizeEnvironmentalImpactEstimateInput,
} from "./index";

describe("environmental impact estimator", () => {
  it("keeps the estimator transparent when nothing is connected", () => {
    const model = computeEnvironmentalImpactEstimate();

    expect(model.validation.valid).toBe(true);
    expect(model.site.status).toBe("unbound");
    expect(model.user.status).toBe("unbound");
    expect(model.site.totalKgCo2eProxy).toBeNull();
    expect(model.user.totalKgCo2eProxy).toBeNull();
    expect(model.site.coveragePercent).toBe(0);
    expect(model.user.coveragePercent).toBe(0);
    expect(
      model.dataGaps.some((note) => note.scope === "site" && note.title.includes("Pages vues")),
    ).toBe(true);
    expect(
      model.dataGaps.some((note) => note.scope === "infrastructure" && note.title.includes("Vercel")),
    ).toBe(true);
  });

  it("computes a partial estimate when some posts are missing", () => {
    const model = computeEnvironmentalImpactEstimate({
      site: {
        pageViews: 120_000,
        apiRequests: 35_000,
        maps: 480,
      },
      user: {
        pageViews: 820,
        pdfExports: 12,
        storageGbMonths: 3.5,
      },
    });

    expect(model.site.status).toBe("partial");
    expect(model.site.availablePostCount).toBe(3);
    expect(model.site.missingPostCount).toBe(4);
    expect(model.site.totalKgCo2eProxy).toBeGreaterThan(0);
    expect(
      model.site.posts.find((post) => post.key === "storedImages")?.quantity,
    ).toBeNull();
    expect(model.user.status).toBe("partial");
    expect(model.user.totalKgCo2eProxy).toBeGreaterThan(0);
    expect(model.user.posts.find((post) => post.key === "pageViews")?.state).toBe(
      "available",
    );
    expect(
      model.dataGaps.some((note) => note.scope === "site" && note.title.includes("Images stockées")),
    ).toBe(true);
  });

  it("computes a complete estimate when all posts are connected", () => {
    const model = computeEnvironmentalImpactEstimate({
      site: {
        pageViews: 120_000,
        storedImages: 2_000,
        apiRequests: 35_000,
        pdfExports: 220,
        maps: 480,
        storageGbMonths: 42,
        aiCalls: 310,
      },
      user: {
        pageViews: 820,
        storedImages: 9,
        apiRequests: 150,
        pdfExports: 12,
        maps: 21,
        storageGbMonths: 3.5,
        aiCalls: 6,
      },
    });

    expect(model.site.status).toBe("ready");
    expect(model.user.status).toBe("ready");
    expect(model.site.coveragePercent).toBe(100);
    expect(model.user.coveragePercent).toBe(100);
    expect(model.site.totalKgCo2eProxy).toBeGreaterThan(model.user.totalKgCo2eProxy ?? 0);
    expect(model.site.curve.length).toBeGreaterThan(1);
    expect(model.user.curve.length).toBeGreaterThan(1);
    expect(model.site.curve.at(-1)?.cumulativeKgCo2eProxy).toBeCloseTo(
      model.site.totalKgCo2eProxy ?? 0,
      5,
    );
    expect(model.user.curve.at(-1)?.cumulativeKgCo2eProxy).toBeCloseTo(
      model.user.totalKgCo2eProxy ?? 0,
      5,
    );
    expect(model.methodology.version).toContain("environmental-impact-estimator");
  });

  it("builds an auditable infrastructure curve with provider-level estimates", () => {
    const model = computeEnvironmentalImpactEstimate({
      generatedAt: "2026-05-20T00:00:00.000Z",
      site: {
        pageViews: 140_000,
        apiRequests: 48_000,
        pdfExports: 220,
        maps: 520,
        storageGbMonths: 44,
        aiCalls: 120,
      },
      infrastructure: {
        launchedAt: "2025-05-20T00:00:00.000Z",
        referencePeriodMonths: 12,
        usage: {
          monthlyPageViews: 140_000,
          monthlyActiveUsers: 18_000,
          monthlySessions: 27_000,
          monthlyEmailsSent: 4_000,
          monthlyDeployments: 24,
          monthlyPdfExports: 180,
          monthlyMapViews: 520,
          monthlyAiCalls: 120,
          monthlyStorageGbMonths: 44,
          monthlyApiRequests: 48_000,
          monthlyAuthEvents: 20_000,
          monthlyRealtimeEvents: 88_000,
          monthlyEgressGb: 68,
          monthlyBandwidthGb: 172,
          monthlyErrorEvents: 140,
          growthRateMonthly: 0.08,
          seasonalityAmplitude: 0.1,
          horizonMonths: 12,
        },
        metrics: {
          vercelPageViews: 140_000,
          vercelFunctionInvocations: 18_000,
          supabaseDbRequests: 480_000,
          resendEmailsSent: 4_000,
          lwsDomainYears: 1,
        },
      },
    });

    expect(model.infrastructure.mode).toBe("measured");
    expect(model.infrastructure.referencePeriodMonths).toBe(12);
    expect(model.infrastructure.usage.source).toBe("input");
    expect(model.infrastructure.curve).toHaveLength(53);
    expect(model.infrastructure.curve[0].cumulativeKgCo2eProxy).toBe(0);
    expect(model.infrastructure.curve[6].monthlyKgCo2eProxy).toBeGreaterThan(
      model.infrastructure.curve[1].monthlyKgCo2eProxy,
    );
    expect(model.infrastructure.curve[6].weeklyKgCo2eProxy).toBe(
      model.infrastructure.curve[6].monthlyKgCo2eProxy,
    );
    expect(model.infrastructure.curve.at(-1)?.cumulativeKgCo2eProxy).toBe(
      model.infrastructure.totalKgCo2eProxy,
    );
    expect(model.infrastructure.graph.granularity).toBe("week");
    expect(model.infrastructure.graph.mode).toBe("cumulative");
    expect(model.infrastructure.graph.considerations.length).toBeGreaterThan(0);
    expect(model.infrastructure.graph.confidencePercent).toBeGreaterThan(60);
    expect(model.infrastructure.secondOrder.factorEstimates).toHaveLength(5);
    expect(model.infrastructure.secondOrder.totalKgCo2eProxy).toBeCloseTo(
      model.infrastructure.monthlyKgCo2eProxy ?? 0,
      5,
    );
    expect(
      model.infrastructure.notes.some((note) => note.includes("point cliquable par semaine")),
    ).toBe(true);

    const vercel = model.infrastructure.services.find(
      (service) => service.key === "vercel",
    );
    const domain = model.infrastructure.services.find(
      (service) => service.key === "lwsDomain",
    );

    expect(vercel?.status).toBe("partial");
    expect(vercel?.monthlyKgCo2eProxy).toBeGreaterThan(0);
    expect(domain?.monthlyKgCo2eProxy).toBeGreaterThan(0);
    expect(domain?.metricEstimates.find((metric) => metric.key === "lwsDomainYears")?.quantityPerMonth).toBeCloseTo(1 / 12);
    expect(model.infrastructure.hypotheses.length).toBeGreaterThan(0);
    expect(model.methodology.projectAnchors).toHaveLength(3);
    expect(model.methodology.projectAnchors[0].kgCo2eProxy).toBe(20);
    expect(model.methodology.projectAnchors[0].kWhEquivalent).toBe(100);
    expect(model.methodology.projectAnchors[1].comparisonNote).toContain("ordre de grandeur");
    expect(
      model.methodology.projectAnchors.some((anchor) => anchor.label.includes("ChatGPT 5.5")),
    ).toBe(true);
    expect(model.lifecycle.totalKgCo2eProxy).toBe(model.infrastructure.totalKgCo2eProxy);
    expect(model.lifecycle.axisEstimates).toHaveLength(5);
    expect(model.lifecycle.componentEstimates).toHaveLength(8);
    expect(model.lifecycle.axisEstimates[0].label).toBe("Énergie");
    expect(model.lifecycle.componentEstimates.some((item) => item.label === "Serveurs")).toBe(
      true,
    );

    const chatgpt = model.infrastructure.services.find(
      (service) => service.key === "chatgpt",
    );

    expect(chatgpt?.status).toBe("derived");
    expect(chatgpt?.monthlyKgCo2eProxy).toBeGreaterThan(0);
    expect(chatgpt?.sourceNote).toContain("2h de conversation par semaine");
  });

  it("includes Codex weekly journal metrics as a separate infrastructure service", () => {
    const model = computeEnvironmentalImpactEstimate({
      generatedAt: "2026-05-20T00:00:00.000Z",
      site: {
        pageViews: 140_000,
        apiRequests: 48_000,
        pdfExports: 220,
        maps: 520,
        storageGbMonths: 44,
        aiCalls: 120,
      },
      infrastructure: {
        launchedAt: "2025-05-20T00:00:00.000Z",
        referencePeriodMonths: 12,
        usage: {
          monthlyPageViews: 140_000,
          monthlyActiveUsers: 18_000,
          monthlySessions: 27_000,
          monthlyEmailsSent: 4_000,
          monthlyDeployments: 24,
          monthlyPdfExports: 180,
          monthlyMapViews: 520,
          monthlyAiCalls: 120,
          monthlyChatgptConversationHours: 8.6666666667,
          monthlyCodexSessions: 8,
          monthlyCodexConversationTurns: 42,
          monthlyCodexToolActions: 18,
          monthlyCodexShellCommands: 24,
          monthlyCodexFilesTouched: 28,
          monthlyCodexTestsRun: 9,
          monthlyCodexChangedLines: 1_240,
          monthlyCodexActiveMinutes: 540,
          monthlyStorageGbMonths: 44,
          monthlyApiRequests: 48_000,
          monthlyAuthEvents: 20_000,
          monthlyRealtimeEvents: 88_000,
          monthlyEgressGb: 68,
          monthlyBandwidthGb: 172,
          monthlyErrorEvents: 140,
          growthRateMonthly: 0.08,
          seasonalityAmplitude: 0.1,
          horizonMonths: 12,
        },
        metrics: {
          vercelPageViews: 140_000,
          vercelFunctionInvocations: 18_000,
          supabaseDbRequests: 480_000,
          resendEmailsSent: 4_000,
          lwsDomainYears: 1,
        },
      },
    });

    const codex = model.infrastructure.services.find(
      (service) => service.key === "codex",
    );
    const chatgpt = model.infrastructure.services.find(
      (service) => service.key === "chatgpt",
    );

    expect(codex?.status).toBe("derived");
    expect(codex?.monthlyKgCo2eProxy).toBeGreaterThan(0);
    expect(codex?.metricEstimates.every((metric) => metric.source === "derived")).toBe(true);
    expect(codex?.sourceNote).toContain("Journal hebdomadaire");
    expect(chatgpt?.status).toBe("derived");
    expect(chatgpt?.monthlyKgCo2eProxy).toBeGreaterThan(0);
    expect(chatgpt?.sourceNote).toContain("2h de conversation par semaine");
  });

  it("surfaces invalid negative inputs through validation", () => {
    const normalized = normalizeEnvironmentalImpactEstimateInput({
      site: {
        pageViews: -1,
      },
    });

    expect(normalized.validation.valid).toBe(false);
    expect(normalized.validation.issues.length).toBeGreaterThan(0);

    const model = computeEnvironmentalImpactEstimate({
      site: {
        pageViews: -1,
      } as never,
    });

    expect(model.validation.valid).toBe(false);
    expect(model.site.status).toBe("unbound");
  });
});
