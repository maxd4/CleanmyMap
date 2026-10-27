import { beforeEach, describe, expect, it, vi } from "vitest";

const canUseSupabaseServerPersistenceMock = vi.hoisted(() => vi.fn(() => false));
const allowLocalFileStoreFallbackMock = vi.hoisted(() => vi.fn(() => true));
const readLocalRecordStoreMock = vi.hoisted(() => vi.fn());
const writeLocalRecordStoreMock = vi.hoisted(() => vi.fn(async () => undefined));
const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/runtime-store", () => ({ canUseSupabaseServerPersistence: canUseSupabaseServerPersistenceMock, allowLocalFileStoreFallback: allowLocalFileStoreFallbackMock }));
vi.mock("@/lib/persistence/local-record-store", () => ({ readLocalRecordStore: readLocalRecordStoreMock, writeLocalRecordStore: writeLocalRecordStoreMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: getSupabaseAdminClientMock }));

import { listGovernanceMonthlyReports, loadGovernanceMonthlyReport, upsertGovernanceMonthlyReport, type GovernanceMonthlyReportRecord } from "./governance-monthly-report-store";

const report = (month: string, id = month): GovernanceMonthlyReportRecord => ({
  id,
  reportKey: "cleanmymap-governance",
  reportMonth: month,
  generatedAt: `${month}T12:00:00.000Z`,
  version: "v1",
  title: "Report",
  payload: {} as never,
});

describe("governance report local fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canUseSupabaseServerPersistenceMock.mockReturnValue(false);
    allowLocalFileStoreFallbackMock.mockReturnValue(true);
    readLocalRecordStoreMock.mockResolvedValue({ records: [report("2026-04-01"), report("2026-05-01"), { ...report("2026-03-01"), reportKey: "other" }] });
  });

  it("upserts a bounded local report set and preserves one report per month", async () => {
    await upsertGovernanceMonthlyReport(report("2026-05-01", "replacement"));
    expect(writeLocalRecordStoreMock).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([expect.objectContaining({ id: "replacement" })]));
    await upsertGovernanceMonthlyReport(report("2026-06-01"));
    expect(writeLocalRecordStoreMock).toHaveBeenCalledTimes(2);
  });

  it("lists and loads the newest or requested normalized month from local records", async () => {
    await expect(listGovernanceMonthlyReports(1)).resolves.toMatchObject([{ reportMonth: "2026-05-01" }]);
    await expect(loadGovernanceMonthlyReport()).resolves.toMatchObject({ reportMonth: "2026-05-01" });
    await expect(loadGovernanceMonthlyReport("2026-05-17")).resolves.toMatchObject({ reportMonth: "2026-05-01" });
    await expect(loadGovernanceMonthlyReport("not-a-date")).resolves.toBeNull();
  });

  it("falls back to local records after a Supabase read exception when explicitly allowed", async () => {
    canUseSupabaseServerPersistenceMock.mockReturnValue(true);
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(async () => ({ data: null, error: { message: "unavailable" } })) })) })) })) })) });
    await expect(listGovernanceMonthlyReports()).resolves.toHaveLength(2);
    await expect(loadGovernanceMonthlyReport()).resolves.toMatchObject({ reportMonth: "2026-05-01" });
  });
});
