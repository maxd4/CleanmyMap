import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: getSupabaseAdminClientMock,
}));

import {
  getReportExportAvailability,
  getReportExportQuotaDay,
  reserveReportExportSlot,
} from "./report-export-quota";

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

  it("reports a used slot without treating missing state as used", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { export_count: 1 }, error: null });
    const eqDay = vi.fn(() => ({ maybeSingle }));
    const eqUser = vi.fn(() => ({ eq: eqDay }));
    const select = vi.fn(() => ({ eq: eqUser }));
    getSupabaseAdminClientMock.mockReturnValue({ from: vi.fn(() => ({ select })) });

    await expect(getReportExportAvailability("user-1")).resolves.toBe("used");
    expect(eqDay).toHaveBeenCalledWith("quota_day", expect.stringMatching(/^2026-09-1[45]$/));
  });
});
