import { describe, expect, it, vi } from "vitest";
import { ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION } from "./constants";
import type { EnvironmentalImpactSnapshotRecord } from "./types";
import { loadEnvironmentalImpactDashboard } from "./dashboard-capture";

const listEnvironmentalImpactSnapshotsMock = vi.hoisted(() => vi.fn());
const loadEnvironmentalImpactProjectSignalsMock = vi.hoisted(() => vi.fn());
const computeEnvironmentalImpactEstimateMock = vi.hoisted(() => vi.fn());
const loadGitHubRepositoryStatsMock = vi.hoisted(() => vi.fn());
const upsertEnvironmentalImpactSnapshotMock = vi.hoisted(() => vi.fn());

vi.mock("./snapshot-store", () => ({
  getEnvironmentalImpactSnapshotDate: vi.fn((value: string) => value.slice(0, 10)),
  listEnvironmentalImpactSnapshots: listEnvironmentalImpactSnapshotsMock,
  upsertEnvironmentalImpactSnapshot: upsertEnvironmentalImpactSnapshotMock,
}));

vi.mock("./project-signals", () => ({
  loadEnvironmentalImpactProjectSignals: loadEnvironmentalImpactProjectSignalsMock,
}));

vi.mock("./service", () => ({
  computeEnvironmentalImpactEstimate: computeEnvironmentalImpactEstimateMock,
}));

vi.mock("@/lib/github/github-repository-stats", () => ({
  loadGitHubRepositoryStats: loadGitHubRepositoryStatsMock,
}));

describe("dashboard capture", () => {
  it("uses the latest snapshot before recomputing live signals", async () => {
    const snapshot = {
      version: "snapshot-version",
      model: {
        generatedAt: "2026-06-26T08:00:00.000Z",
        infrastructure: {
          generatedAt: "2026-06-26T08:00:00.000Z",
        },
      },
      signals: {
        generatedAt: "2026-06-26T08:00:00.000Z",
        launchedAt: "2026-01-01T00:00:00.000Z",
      },
    } as EnvironmentalImpactSnapshotRecord;

    listEnvironmentalImpactSnapshotsMock.mockResolvedValueOnce([snapshot]);

    const result = await loadEnvironmentalImpactDashboard({
      userId: null,
      historyLimit: 4,
    });

    expect(result.version).toBe("snapshot-version");
    expect(result.model).toBe(snapshot.model);
    expect(result.signals).toBe(snapshot.signals);
    expect(result.snapshots).toEqual([snapshot]);
    expect(loadEnvironmentalImpactProjectSignalsMock).not.toHaveBeenCalled();
    expect(loadGitHubRepositoryStatsMock).not.toHaveBeenCalled();
  });

  it("falls back to the live recomputation when no snapshot exists", async () => {
    listEnvironmentalImpactSnapshotsMock.mockResolvedValueOnce([]);
    loadGitHubRepositoryStatsMock.mockResolvedValueOnce(null);
    loadEnvironmentalImpactProjectSignalsMock.mockResolvedValueOnce({
      generatedAt: "2026-06-26T08:00:00.000Z",
      launchedAt: null,
      accountCreatedAt: null,
      userId: null,
      periodDays: 30,
      recentWindowDays: 30,
      siteInput: {},
      userInput: {},
      infrastructureInput: {
        usage: {
          monthlyPageViews: 1,
          monthlyActiveUsers: 1,
          monthlySessions: 1,
          monthlyEmailsSent: 0,
          monthlyPdfExports: 0,
          monthlyMapViews: 0,
          monthlyAiCalls: 0,
          monthlyStorageGbMonths: 0.1,
          monthlyApiRequests: 1,
          monthlyAuthEvents: 1,
          monthlyRealtimeEvents: 1,
          monthlyEgressGb: 0.1,
          monthlyBandwidthGb: 0.1,
          monthlyErrorEvents: 0,
          growthRateMonthly: 0,
          seasonalityAmplitude: 0.04,
          horizonMonths: 12,
        },
      },
      codexUsage: null,
      signalBreakdown: undefined,
      highlights: [],
      notes: [],
    });
    computeEnvironmentalImpactEstimateMock.mockReturnValueOnce({
      version: "live-version",
      generatedAt: "2026-06-26T08:00:00.000Z",
      validation: { valid: true, issues: [] },
      methodology: { version: "live-version", generatedAt: "2026-06-26T08:00:00.000Z", hypotheses: [], limitations: [], projectAnchors: [], notes: [] },
      dataGaps: [],
      site: { totalKgCo2eProxy: 1 },
      user: { totalKgCo2eProxy: 1 },
      infrastructure: { totalKgCo2eProxy: 1 },
      lifecycle: { totalKgCo2eProxy: 1 },
    });

    const result = await loadEnvironmentalImpactDashboard({
      userId: null,
      historyLimit: 4,
    });

    expect(result.version).toBe(ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION);
    expect(loadEnvironmentalImpactProjectSignalsMock).toHaveBeenCalledTimes(1);
    expect(loadGitHubRepositoryStatsMock).toHaveBeenCalledWith("maxd4/CleanmyMap");
    expect(computeEnvironmentalImpactEstimateMock).toHaveBeenCalledTimes(1);
  });
});
