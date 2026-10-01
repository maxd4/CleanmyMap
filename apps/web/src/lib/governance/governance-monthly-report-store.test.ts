import { describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
  getSupabaseAdminClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/persistence/runtime-store", () => ({
  canUseSupabaseServerPersistence: canUseSupabaseServerPersistenceMock,
  allowLocalFileStoreFallback: allowLocalFileStoreFallbackMock,
}));

import {
  loadGovernanceMonthlyReport,
  upsertGovernanceMonthlyReport,
} from "./governance-monthly-report-store";

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
});
