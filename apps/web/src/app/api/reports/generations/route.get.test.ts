import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  reportGenerationMocks,
  setupGetReportGenerationDefaults,
} from "./route.test.helpers";
import { GET } from "./route";

const {
  requireAuthenticatedAccessMock,
  listReportGenerationHistoryPageMock,
  getReportExportAvailabilityMock,
} = reportGenerationMocks;

describe("GET /api/reports/generations", () => {
  beforeEach(() => {
    setupGetReportGenerationDefaults();
  });

  it("returns an owner-scoped page without touching generation quota", async () => {
    const response = await GET(new Request("http://localhost/api/reports/generations?page=2&search=Paris&period=six_months&theme=scientific&sort=asc"));

    expect(response.status).toBe(200);
    expect(listReportGenerationHistoryPageMock).toHaveBeenCalledWith("owner-1", {
      page: 2,
      pageSize: 12,
      search: "Paris",
      periodId: "six_months",
      theme: "scientific",
      sort: "asc",
    });
    expect(getReportExportAvailabilityMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ total: 13, hasPreviousPage: true });
  });

  it("denies anonymous history reads and rejects invalid filters", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    await expect(GET(new Request("http://localhost/api/reports/generations"))).resolves.toHaveProperty("status", 401);

    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: true, userId: "owner-1" });
    const response = await GET(new Request("http://localhost/api/reports/generations?page=0"));
    expect(response.status).toBe(400);
    expect(listReportGenerationHistoryPageMock).not.toHaveBeenCalled();
  });

  it("maps a history store failure without touching quota", async () => {
    listReportGenerationHistoryPageMock.mockRejectedValueOnce(new Error("history unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(new Request("http://localhost/api/reports/generations"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "Historique temporairement indisponible.",
    });
    expect(getReportExportAvailabilityMock).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
