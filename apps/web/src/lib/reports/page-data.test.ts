import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  aggregateMonthlyAnalytics: vi.fn(),
  computeReportModel: vi.fn(),
  fetchCachedUnifiedActionContracts: vi.fn(),
  loadCachedReportCommunityEvents: vi.fn(),
  loadPilotageOverview: vi.fn(),
  toActionListItem: vi.fn((item: unknown) => item),
  toActionMapItem: vi.fn((item: unknown) => item),
  getActionOperationalContext: vi.fn(),
}));

vi.mock("@/lib/actions/data-contract", () => ({
  getActionOperationalContext: mocks.getActionOperationalContext,
  toActionListItem: mocks.toActionListItem,
  toActionMapItem: mocks.toActionMapItem,
}));

vi.mock("@/lib/actions/unified-source-cache", () => ({
  fetchCachedUnifiedActionContracts: mocks.fetchCachedUnifiedActionContracts,
}));

vi.mock("@/lib/community/report-events", () => ({
  loadCachedReportCommunityEvents: mocks.loadCachedReportCommunityEvents,
}));

vi.mock("@/lib/pilotage/analytics-data-utils", () => ({
  aggregateMonthlyAnalytics: mocks.aggregateMonthlyAnalytics,
}));

vi.mock("@/lib/pilotage/overview", () => ({
  loadPilotageOverview: mocks.loadPilotageOverview,
}));

vi.mock("@/lib/reports/report-model", () => ({
  computeReportModel: mocks.computeReportModel,
}));

import { loadReportsAnalysisData, loadReportsGenerationData } from "./page-data";

describe("/reports server data budget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadCachedReportCommunityEvents.mockResolvedValue([]);
    mocks.loadPilotageOverview.mockResolvedValue({ contracts: [] });
    mocks.computeReportModel.mockReturnValue({});
    mocks.aggregateMonthlyAnalytics.mockReturnValue([]);
    mocks.fetchCachedUnifiedActionContracts.mockResolvedValue({
      items: [{ id: "action-1" }],
      isTruncated: false,
      sourceHealth: {
        partial: false,
        failedSources: [],
        availableSources: ["actions"],
        warnings: [],
      },
    });
  });

  it("keeps the shared analysis budget centralized without changing its call contract", async () => {
    const result = await loadReportsAnalysisData();

    expect(mocks.loadPilotageOverview).toHaveBeenCalledWith({
      periodDays: 90,
      limit: 2200,
    });
    expect(mocks.loadCachedReportCommunityEvents).toHaveBeenCalledWith(120);
    expect(result.communityEvents).toEqual([]);
    expect(result.communityEventsAvailability).toBe("available");
    expect(mocks.computeReportModel).toHaveBeenCalledWith({
      allItems: [],
      approvedItems: [],
      mapItems: [],
      events: [],
      moderationAvailability: "unavailable",
    });
  });

  it("keeps an empty events array but exposes event loading failure", async () => {
    mocks.loadCachedReportCommunityEvents.mockRejectedValueOnce(
      new Error("community events unavailable"),
    );

    const result = await loadReportsAnalysisData();

    expect(result.communityEvents).toEqual([]);
    expect(result.communityEventsAvailability).toBe("unavailable");
    expect(mocks.loadCachedReportCommunityEvents).toHaveBeenCalledTimes(1);
  });

  it("propagates generation truncation metadata without another read", async () => {
    mocks.fetchCachedUnifiedActionContracts.mockResolvedValueOnce({
      items: [{ id: "action-1" }],
      isTruncated: true,
      sourceHealth: {
        partial: false,
        failedSources: [],
        availableSources: ["actions"],
        warnings: [],
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const result = await loadReportsGenerationData();

    expect(result.isTruncated).toBe(true);
    expect(result.sourceHealth).toEqual({
      partial: false,
      failedSources: [],
      availableSources: ["actions"],
      warnings: [],
    });
    expect(result.contracts).toEqual([{ id: "action-1" }]);
    expect(result.communityEventsAvailability).toBe("available");
    expect(mocks.fetchCachedUnifiedActionContracts).toHaveBeenCalledTimes(1);
    expect(mocks.fetchCachedUnifiedActionContracts).toHaveBeenCalledWith({
      limit: 1000,
      status: "approved",
      floorDate: null,
      requireCoordinates: false,
      types: null,
    });
    vi.unstubAllGlobals();
  });
});
