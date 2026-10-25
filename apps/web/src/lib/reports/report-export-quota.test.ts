import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: getSupabaseAdminClientMock,
}));

import {
  getReportExportAvailability,
  getReportExportQuotaDay,
  releaseReportExportSlot,
  reserveReportExportSlot,
} from "./report-export-quota";
import { isReportPdfShareExpiryValid } from "./report-generation-pdf-share-store";

describe("report export daily quota", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the Europe/Paris civil day", () => {
    expect(getReportExportQuotaDay(new Date("2026-09-15T21:59:59.000Z"))).toBe("2026-09-15");
    expect(getReportExportQuotaDay(new Date("2026-09-15T22:00:00.000Z"))).toBe("2026-09-16");
  });

  it("parses the atomic reservation returned by Supabase", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ allowed: true, quota_day: "2026-09-15" }], error: null });
    getSupabaseAdminClientMock.mockReturnValue({ rpc });

    await expect(reserveReportExportSlot("user-1")).resolves.toEqual({
      allowed: true,
      quotaDay: "2026-09-15",
    });
    expect(rpc).toHaveBeenCalledWith("reserve_report_generation_daily_quota", { p_user_id: "user-1" });
  });

  it.each([
    ["an RPC error", { data: null, error: new Error("rpc unavailable") }],
    ["an invalid RPC payload", { data: [{ allowed: true }], error: null }],
    ["a malformed Supabase envelope", { data: [{ allowed: true, quota_day: "2026-09-15" }] }],
    ["an empty RPC array", { data: [], error: null }],
  ])("rejects %s instead of inventing a reservation", async (_label, result) => {
    const rpc = vi.fn().mockResolvedValue(result);
    getSupabaseAdminClientMock.mockReturnValue({ rpc });

    await expect(reserveReportExportSlot("user-1")).rejects.toThrow();
    expect(rpc).toHaveBeenCalledWith("reserve_report_generation_daily_quota", { p_user_id: "user-1" });
  });

  it("releases a reservation through the owner-scoped RPC and surfaces errors", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: null, error: null });
    getSupabaseAdminClientMock.mockReturnValue({ rpc });

    await expect(releaseReportExportSlot({ userId: "user-1", quotaDay: "2026-09-15" })).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("release_report_generation_daily_quota", {
      p_user_id: "user-1",
      p_quota_day: "2026-09-15",
    });

    rpc.mockResolvedValueOnce({ data: null, error: new Error("release unavailable") });
    await expect(releaseReportExportSlot({ userId: "user-1", quotaDay: "2026-09-15" })).rejects.toThrow("release unavailable");
  });

  it("reports a used slot without treating missing state as used", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { export_count: 1 }, error: null });
    const eqDay = vi.fn(() => ({ maybeSingle }));
    const eqUser = vi.fn(() => ({ eq: eqDay }));
    const select = vi.fn(() => ({ eq: eqUser }));
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ select })) });

    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-09-15T12:00:00+02:00"));
      await expect(getReportExportAvailability("user-1")).resolves.toBe("used");
      expect(eqDay).toHaveBeenCalledWith("quota_day", "2026-09-15");
    } finally {
      vi.useRealTimers();
    }
  });

  it("treats missing quota state as available and propagates read errors", async () => {
    const maybeSingle = vi.fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("quota read unavailable") });
    const eqDay = vi.fn(() => ({ maybeSingle }));
    const eqUser = vi.fn(() => ({ eq: eqDay }));
    const select = vi.fn(() => ({ eq: eqUser }));
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ select })) });

    await expect(getReportExportAvailability("user-1")).resolves.toBe("available");
    await expect(getReportExportAvailability("user-1")).rejects.toThrow("quota read unavailable");
  });

  it.each([
    undefined,
    { data: { export_count: 1 } },
    { error: null },
  ])("rejects malformed quota read responses: %j", async (response) => {
    const maybeSingle = vi.fn().mockResolvedValue(response);
    const eqDay = vi.fn(() => ({ maybeSingle }));
    const eqUser = vi.fn(() => ({ eq: eqDay }));
    const select = vi.fn(() => ({ eq: eqUser }));
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ select })) });

    await expect(getReportExportAvailability("user-1")).rejects.toThrow();
  });

  it.each([
    ["minimum", 60 * 60, true],
    ["maximum", 30 * 24 * 60 * 60, true],
    ["below minimum", 60 * 60 - 1, false],
    ["above maximum", 30 * 24 * 60 * 60 + 1, false],
    ["fractional", 3600.5, false],
  ] as const)("uses the server expiry boundary for %s", (_label, seconds, expected) => {
    expect(isReportPdfShareExpiryValid(seconds)).toBe(expected);
  });

  it("treats an explicit zero export count as available", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { export_count: 0 }, error: null });
    const eqDay = vi.fn(() => ({ maybeSingle }));
    const eqUser = vi.fn(() => ({ eq: eqDay }));
    const select = vi.fn(() => ({ eq: eqUser }));
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ select })) });

    await expect(getReportExportAvailability("owner-9")).resolves.toBe("available");
    expect(eqUser).toHaveBeenCalledWith("user_id", "owner-9");
  });

  it("rejects a false reservation without converting it to an allowed slot", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ allowed: false, quota_day: "2026-09-15" }], error: null });
    getSupabaseAdminClientMock.mockReturnValue({ rpc });

    await expect(reserveReportExportSlot("owner-9")).resolves.toEqual({
      allowed: false,
      quotaDay: "2026-09-15",
    });
  });

  it("uses the supplied civil day when releasing a reservation", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    getSupabaseAdminClientMock.mockReturnValue({ rpc });

    await releaseReportExportSlot({ userId: "owner-9", quotaDay: "2026-09-15" });
    expect(rpc).toHaveBeenCalledWith("release_report_generation_daily_quota", {
      p_user_id: "owner-9",
      p_quota_day: "2026-09-15",
    });
  });
});
