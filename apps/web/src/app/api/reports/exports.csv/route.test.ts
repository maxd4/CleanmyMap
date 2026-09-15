import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const reserveReportExportSlotMock = vi.hoisted(() => vi.fn());
const fetchCachedUnifiedActionContractsMock = vi.hoisted(() => vi.fn());
const toReportsExportRowMock = vi.hoisted(() => vi.fn((item: { id: string }) => ({ id: item.id, value: 1 })));

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
}));
vi.mock("@/lib/reports/report-export-quota", () => ({
  reserveReportExportSlot: reserveReportExportSlotMock,
}));
vi.mock("@/lib/actions/unified-source/unified-source-cache", () => ({
  fetchCachedUnifiedActionContracts: fetchCachedUnifiedActionContractsMock,
}));
vi.mock("@/lib/reports/page-data", () => ({
  toReportsExportRow: toReportsExportRowMock,
}));

import { GET } from "./route";

describe("GET /api/reports/exports.csv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    reserveReportExportSlotMock.mockResolvedValue({ allowed: true, quotaDay: "2026-09-15" });
    fetchCachedUnifiedActionContractsMock.mockResolvedValue({
      items: [{ id: "action-1" }, { id: "action-2" }],
      isTruncated: false,
      sourceHealth: { partial: false, failedSources: [], availableSources: ["actions"], warnings: [] },
    });
  });

  it("requires an authenticated account", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(reserveReportExportSlotMock).not.toHaveBeenCalled();
  });

  it("reserves the quota before generating the complete public-safe export", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(reserveReportExportSlotMock).toHaveBeenCalledWith("user-1");
    expect(fetchCachedUnifiedActionContractsMock).toHaveBeenCalledWith({
      limit: null,
      status: "approved",
      floorDate: null,
      requireCoordinates: false,
      types: null,
    });
    await expect(response.text()).resolves.toContain("id;value");
    expect(response.headers.get("Content-Disposition")).toContain("rapport_impact_cmm_");
  });

  it("rejects a second export without reading or generating data", async () => {
    reserveReportExportSlotMock.mockResolvedValueOnce({ allowed: false, quotaDay: "2026-09-15" });

    const response = await GET();

    expect(response.status).toBe(429);
    expect(fetchCachedUnifiedActionContractsMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ quotaDay: "2026-09-15" });
  });

  it("keeps the quota independent between users and civil days", async () => {
    reserveReportExportSlotMock
      .mockResolvedValueOnce({ allowed: true, quotaDay: "2026-09-15" })
      .mockResolvedValueOnce({ allowed: true, quotaDay: "2026-09-16" });

    const first = await GET();
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: true, userId: "user-2" });
    const second = await GET();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(reserveReportExportSlotMock).toHaveBeenNthCalledWith(2, "user-2");
  });

  it("allows at most one of two racing requests when the reservation is atomic", async () => {
    let claimed = false;
    reserveReportExportSlotMock.mockImplementation(async () => {
      if (claimed) return { allowed: false, quotaDay: "2026-09-15" };
      claimed = true;
      return { allowed: true, quotaDay: "2026-09-15" };
    });

    const responses = await Promise.all([GET(), GET()]);

    expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 429)).toHaveLength(1);
  });
});
