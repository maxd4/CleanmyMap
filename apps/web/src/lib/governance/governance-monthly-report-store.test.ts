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
}));

vi.mock("@/lib/persistence/runtime-store", () => ({
  canUseSupabaseServerPersistence: canUseSupabaseServerPersistenceMock,
  allowLocalFileStoreFallback: allowLocalFileStoreFallbackMock,
}));

import { loadGovernanceMonthlyReport } from "./governance-monthly-report-store";

describe("governance monthly report store", () => {
  it("loads a specific month with a single Supabase row", async () => {
    const queryBuilder = {
      eq: vi.fn(() => queryBuilder),
      gte: vi.fn(() => queryBuilder),
      lt: vi.fn(() => queryBuilder),
      order: vi.fn(() => queryBuilder),
      limit: vi.fn(async () => ({
        data: [governanceReportRow],
        error: null,
      })),
    };

    getSupabaseServerClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => queryBuilder),
      })),
    });

    const report = await loadGovernanceMonthlyReport("2026-05-17");

    expect(report?.reportMonth).toBe("2026-05-01");
    expect(queryBuilder.eq).toHaveBeenCalledWith("report_key", "cleanmymap-governance");
    expect(queryBuilder.gte).toHaveBeenCalledWith("report_month", "2026-05-01");
    expect(queryBuilder.lt).toHaveBeenCalledWith("report_month", "2026-06-01");
    expect(queryBuilder.order).toHaveBeenCalledWith("report_month", { ascending: false });
    expect(queryBuilder.limit).toHaveBeenCalledWith(1);
  });

  it("loads the latest report with a single ordered Supabase row", async () => {
    const queryBuilder = {
      eq: vi.fn(() => queryBuilder),
      gte: vi.fn(() => queryBuilder),
      lt: vi.fn(() => queryBuilder),
      order: vi.fn(() => queryBuilder),
      limit: vi.fn(async () => ({
        data: [governanceReportRow],
        error: null,
      })),
    };

    getSupabaseServerClientMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => queryBuilder),
      })),
    });

    const report = await loadGovernanceMonthlyReport();

    expect(report?.reportMonth).toBe("2026-05-01");
    expect(queryBuilder.eq).toHaveBeenCalledWith("report_key", "cleanmymap-governance");
    expect(queryBuilder.gte).not.toHaveBeenCalled();
    expect(queryBuilder.lt).not.toHaveBeenCalled();
    expect(queryBuilder.order).toHaveBeenCalledWith("report_month", { ascending: false });
    expect(queryBuilder.limit).toHaveBeenCalledWith(1);
  });
});
