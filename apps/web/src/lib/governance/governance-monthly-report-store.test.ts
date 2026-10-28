import { beforeEach, describe, expect, it, vi } from "vitest";

const governanceReportRow = {
  id: 1,
  report_key: "cleanmymap-governance",
  report_month: "2026-05-01",
  generated_at: "2026-05-20T12:00:00.000Z",
  version: "governance-monthly-report-2026.05-v1",
  title: "Rapport mensuel de gouvernance",
  payload: {} as never,
};

const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const canUseSupabaseServerPersistenceMock = vi.hoisted(() => vi.fn(() => true));
const allowLocalFileStoreFallbackMock = vi.hoisted(() => vi.fn(() => false));
const readLocalRecordStoreMock = vi.hoisted(() => vi.fn());
const writeLocalRecordStoreMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
  getSupabaseAdminClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/persistence/runtime-store", () => ({
  canUseSupabaseServerPersistence: canUseSupabaseServerPersistenceMock,
  allowLocalFileStoreFallback: allowLocalFileStoreFallbackMock,
}));
vi.mock("@/lib/persistence/local-record-store", () => ({
  readLocalRecordStore: readLocalRecordStoreMock,
  writeLocalRecordStore: writeLocalRecordStoreMock,
}));

import {
  listGovernanceMonthlyReports,
  loadGovernanceMonthlyReport,
  upsertGovernanceMonthlyReport,
} from "./governance-monthly-report-store";
import { normalizeStoragePayload } from "./governance-monthly-report-storage-normalizer";

function makeQueryBuilder(data: unknown[]) {
  const queryBuilder = {
    eq: vi.fn(() => queryBuilder),
    gte: vi.fn(() => queryBuilder),
    lt: vi.fn(() => queryBuilder),
    order: vi.fn(() => queryBuilder),
    limit: vi.fn(async () => ({ data, error: null })),
  };
  return queryBuilder;
}

function mockSupabaseClient(queryBuilder: ReturnType<typeof makeQueryBuilder>, upsert?: ReturnType<typeof vi.fn>) {
  getSupabaseServerClientMock.mockReturnValue({
    from: vi.fn(() => ({
      select: vi.fn(() => queryBuilder),
      ...(upsert ? { upsert } : {}),
    })),
  });
}

describe("governance monthly report store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canUseSupabaseServerPersistenceMock.mockReturnValue(true);
    allowLocalFileStoreFallbackMock.mockReturnValue(false);
    readLocalRecordStoreMock.mockResolvedValue({ updatedAt: "2026-05-01T00:00:00.000Z", records: [] });
    writeLocalRecordStoreMock.mockResolvedValue(undefined);
  });

  it("loads a specific month with a single Supabase row", async () => {
    const queryBuilder = makeQueryBuilder([governanceReportRow]);

    mockSupabaseClient(queryBuilder);

    const report = await loadGovernanceMonthlyReport("2026-05-17");

    expect(report?.reportMonth).toBe("2026-05-01");
    expect(queryBuilder.eq).toHaveBeenCalledWith("report_key", "cleanmymap-governance");
    expect(queryBuilder.gte).toHaveBeenCalledWith("report_month", "2026-05-01");
    expect(queryBuilder.lt).toHaveBeenCalledWith("report_month", "2026-06-01");
    expect(queryBuilder.order).toHaveBeenCalledWith("report_month", { ascending: false });
    expect(queryBuilder.limit).toHaveBeenCalledWith(1);
  });

  it("loads the latest report with a single ordered Supabase row", async () => {
    const queryBuilder = makeQueryBuilder([governanceReportRow]);

    mockSupabaseClient(queryBuilder);

    const report = await loadGovernanceMonthlyReport();

    expect(report?.reportMonth).toBe("2026-05-01");
    expect(queryBuilder.eq).toHaveBeenCalledWith("report_key", "cleanmymap-governance");
    expect(queryBuilder.gte).not.toHaveBeenCalled();
    expect(queryBuilder.lt).not.toHaveBeenCalled();
    expect(queryBuilder.order).toHaveBeenCalledWith("report_month", { ascending: false });
    expect(queryBuilder.limit).toHaveBeenCalledWith(1);
  });

  it("preserves null and observed zero in impact history on read and write", async () => {
    const payload = {
      impact: {
        serviceBreakdown: [
          {
            key: "supabase",
            label: "Supabase",
            currentKgCo2eProxy: null,
            previousKgCo2eProxy: null,
            deltaKgCo2eProxy: null,
          },
          {
            key: "vercel",
            label: "Vercel",
            currentKgCo2eProxy: 0,
            previousKgCo2eProxy: 0,
            deltaKgCo2eProxy: 0,
          },
        ],
        growthHighlights: [
          {
            label: "Supabase",
            previousKgCo2eProxy: null,
            currentKgCo2eProxy: null,
            deltaKgCo2eProxy: null,
          },
        ],
      },
    };
    const row = { ...governanceReportRow, payload };
    const queryBuilder = makeQueryBuilder([row]);
    const upsert = vi.fn(async () => ({ error: null }));

    mockSupabaseClient(queryBuilder, upsert);

    const loaded = await loadGovernanceMonthlyReport();
    expect(loaded?.payload.impact.serviceBreakdown).toEqual(payload.impact.serviceBreakdown);
    expect(loaded?.payload.impact.growthHighlights).toEqual(payload.impact.growthHighlights);

    await upsertGovernanceMonthlyReport({
      ...governanceReportRow,
      id: "governance-2026-05-01",
      reportKey: "cleanmymap-governance",
      reportMonth: "2026-05-01",
      generatedAt: "2026-05-20T12:00:00.000Z",
      version: "test",
      title: "test",
      payload,
    } as never);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          impact: expect.objectContaining({
            serviceBreakdown: payload.impact.serviceBreakdown,
            growthHighlights: payload.impact.growthHighlights,
          }),
        }),
      }),
      { onConflict: "report_key,report_month" },
    );
  });

  it("normalizes missing storage sections without collapsing zero or unavailable values", () => {
    expect(normalizeStoragePayload(null)).toMatchObject({
      quotaBytes: 0,
      deltaPercent: null,
      businessContributions: { items: [] },
    });

    const normalized = normalizeStoragePayload({
      quotaBytes: 0,
      totalBytes: 12,
      deltaPercent: null,
      businessContributions: {
        previousSnapshotMonth: null,
        historyMonths: [],
        alerts: [],
        items: [{
          id: "pieces_jointes_photo",
          label: "Photos",
          description: "Photos",
          currentBytes: 0,
          currentCount: 0,
          currentSharePercent: 0,
          currentAverageBytes: 0,
          previousBytes: 0,
          previousCount: 0,
          deltaBytes: 0,
          deltaPercent: null,
          deltaCount: 0,
          cumulative3MonthBytes: 0,
          cumulative3MonthPercent: null,
          accelerationBytes: 0,
          accelerationPercent: null,
          history: [],
          topFiles: [],
          mimeSubtypes: [],
          alerts: [],
        }],
      },
    } as never);

    expect(normalized.totalBytes).toBe(12);
    expect(normalized.deltaPercent).toBeNull();
    expect(normalized.businessContributions.items[0]).toMatchObject({
      currentBytes: 0,
      currentSharePercent: 0,
      deltaPercent: null,
    });

    const fallback = normalizeStoragePayload({
      quotaBytes: null,
      quotaLabel: null,
      totalBytes: null,
      totalLabel: null,
      remainingBytes: null,
      remainingLabel: null,
      usagePercent: null,
      objectCount: null,
      snapshotCount: null,
      latestSnapshotMonth: undefined,
      deltaBytes: null,
      deltaPercent: undefined,
      topBucketLabel: undefined,
      topBucketBytes: null,
      topExtensionLabel: undefined,
      topExtensionBytes: null,
      topContributionLabel: undefined,
      topContributionBytes: null,
      topContributionSharePercent: null,
      topContributionDeltaBytes: null,
      topContributionDeltaPercent: undefined,
      fastestGrowingLabel: undefined,
      fastestGrowingBytes: null,
      fastestGrowingDeltaBytes: null,
      fastestGrowingDeltaPercent: undefined,
      growthHighlights: null,
      contributionHighlights: null,
      businessContributions: {
        previousSnapshotMonth: undefined,
        historyMonths: null,
        alerts: null,
        items: [{
          id: "fallback",
          label: "Fallback",
          description: "Fallback",
          currentBytes: 0,
          currentCount: 0,
          currentAverageBytes: null,
          currentSharePercent: null,
          previousBytes: null,
          previousCount: null,
          deltaBytes: null,
          deltaPercent: undefined,
          deltaCount: null,
          cumulative3MonthBytes: null,
          cumulative3MonthPercent: undefined,
          accelerationBytes: null,
          accelerationPercent: undefined,
          history: null,
          topFiles: null,
          mimeSubtypes: null,
          alerts: null,
        }],
      },
    } as never);
    expect(fallback).toMatchObject({ quotaBytes: 0, usagePercent: 0, businessContributions: { previousSnapshotMonth: null, historyMonths: [], alerts: [] } });
    expect(fallback.businessContributions.items[0]).toMatchObject({ currentAverageBytes: 0, previousBytes: 0, deltaPercent: null, history: [], topFiles: [], mimeSubtypes: [], alerts: [] });
  });

  it("normalizes partial project, impact and artifact projections without inventing measurements", async () => {
    const queryBuilder = makeQueryBuilder([{
      ...governanceReportRow,
      payload: {
        projectSignals: {
          traffic: { topRoutes: [{ path: "/", count: 0 }] },
          community: { events: 0 },
          communication: { pdfExports: 0 },
        },
        impact: null,
        storage: null,
        serviceThresholdAlerts: null,
        artifacts: { pdfStoragePath: "reports/2026-05.pdf" },
      },
    }]);
    mockSupabaseClient(queryBuilder);

    const report = await loadGovernanceMonthlyReport();
    expect(report?.payload.projectSignals).toEqual({
      traffic: { pageViewEvents: 0, legacyPageViewEvents: 0, distinctRoutes: 0, topRoutes: [{ path: "/", count: 0 }] },
      community: { events: 0, rsvps: 0, notifications: 0, unreadNotifications: 0 },
      communication: { emailsSent: 0, pdfExports: 0 },
    });
    expect(report?.payload.impact).toMatchObject({
      monthlyKgCo2eProxy: null,
      snapshotCount: 0,
      serviceBreakdown: [],
      growthHighlights: [],
    });
    expect(report?.payload.storage).toMatchObject({ quotaBytes: 0, usagePercent: 0, businessContributions: { items: [] } });
    expect(report?.payload.artifacts).toEqual({ pdfStoragePath: "reports/2026-05.pdf", pdfGeneratedAt: null });
  });

  it("fails closed on Supabase read failures and does not manufacture a report", async () => {
    const failingQuery = makeQueryBuilder([]);
    failingQuery.limit.mockResolvedValue({ data: [] as never, error: { message: "governance read failed" } as never });
    mockSupabaseClient(failingQuery);
    await expect(loadGovernanceMonthlyReport()).resolves.toBeNull();
    await expect(listGovernanceMonthlyReports()).resolves.toEqual([]);

    const failingUpsert = vi.fn(async () => ({ error: { message: "governance write failed" } }));
    mockSupabaseClient(makeQueryBuilder([]), failingUpsert);
    await expect(upsertGovernanceMonthlyReport({ ...governanceReportRow, id: "report-1", reportKey: "cleanmymap-governance", reportMonth: "2026-05-01", generatedAt: "2026-05-20T12:00:00.000Z", version: "v1", title: "test", payload: {} as never } as never)).resolves.toBeUndefined();
    expect(failingUpsert).toHaveBeenCalled();

    getSupabaseServerClientMock.mockImplementation(() => { throw new Error("client unavailable"); });
    await expect(loadGovernanceMonthlyReport()).resolves.toBeNull();
  });

  it("uses the authorized local fallback for list, load and upsert after provider failures", async () => {
    canUseSupabaseServerPersistenceMock.mockReturnValue(true);
    allowLocalFileStoreFallbackMock.mockReturnValue(true);
    getSupabaseServerClientMock.mockImplementation(() => {
      throw new Error("governance provider unavailable");
    });
    const localRecord = {
      id: "local-report",
      reportKey: "cleanmymap-governance",
      reportMonth: "2026-05-01",
      generatedAt: "2026-05-20T12:00:00.000Z",
      version: "local-v1",
      title: "Local report",
      payload: {
        ...({} as never),
        reportMonth: "2026-05-01",
        generatedAt: "2026-05-20T12:00:00.000Z",
        projectSignals: null,
        impact: null,
        storage: null,
        serviceThresholdAlerts: null,
      },
    };
    readLocalRecordStoreMock.mockResolvedValue({
      updatedAt: "2026-05-01T00:00:00.000Z",
      records: [localRecord],
    });

    await expect(listGovernanceMonthlyReports(1)).resolves.toMatchObject([{ id: "local-report" }]);
    await expect(loadGovernanceMonthlyReport("2026-05-17")).resolves.toMatchObject({ id: "local-report" });
    await expect(upsertGovernanceMonthlyReport({
      ...governanceReportRow,
      id: "new-report",
      reportKey: "cleanmymap-governance",
      reportMonth: "2026-06-01",
      generatedAt: "2026-06-20T12:00:00.000Z",
      version: "local-v2",
      title: "New local report",
      payload: {} as never,
    } as never)).resolves.toBeUndefined();
    expect(writeLocalRecordStoreMock).toHaveBeenCalledWith(
      expect.stringContaining("governance_monthly_reports.json"),
      expect.arrayContaining([expect.objectContaining({ id: "new-report" })]),
    );
  });
});
