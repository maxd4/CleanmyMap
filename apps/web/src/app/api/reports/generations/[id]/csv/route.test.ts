import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getSnapshotMock = vi.hoisted(() => vi.fn());
const InvalidReportGenerationIdErrorMock = vi.hoisted(() => class extends Error {});
const InvalidReportGenerationSnapshotErrorMock = vi.hoisted(() => class extends Error {});

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/reports/report-generation-history-store", () => ({
  getReportGenerationSnapshotById: getSnapshotMock,
  InvalidReportGenerationIdError: InvalidReportGenerationIdErrorMock,
}));
vi.mock("@/lib/reports/report-generation-payload", () => ({
  InvalidReportGenerationSnapshotError: InvalidReportGenerationSnapshotErrorMock,
}));

import { GET } from "./route";
import {
  HISTORICAL_REPORT_GENERATION,
  HISTORICAL_REPORT_ID,
} from "../historical-export-test-fixtures";

describe("GET historical scientific CSV", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    getSnapshotMock.mockResolvedValue(HISTORICAL_REPORT_GENERATION);
  });

  it("rejects an unauthenticated request without reading the snapshot", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: HISTORICAL_REPORT_ID }) });
    expect(response.status).toBe(401);
    expect(getSnapshotMock).not.toHaveBeenCalled();
  });

  it("returns CSV with explicit missing-data status and download headers", async () => {
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: HISTORICAL_REPORT_ID }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain(".csv");
    const body = await response.text();
    expect(body).toContain("generation_id");
    expect(body).toContain("DECLARED");
    expect(body).toContain("NA");
  });

  it("returns 404 when the owner-scoped snapshot is absent", async () => {
    getSnapshotMock.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: HISTORICAL_REPORT_ID }) });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Rapport historique introuvable." });
  });

  it.each([
    ["invalid id", new InvalidReportGenerationIdErrorMock(), 400, "Identifiant de rapport invalide."],
    ["incompatible snapshot", new InvalidReportGenerationSnapshotErrorMock(), 422, "Le snapshot historique est invalide ou incompatible."],
    ["store failure", new Error("database unavailable"), 503, "Impossible d'exporter le rapport historique."],
  ])("maps %s without returning an export", async (_label, error, status, message) => {
    getSnapshotMock.mockRejectedValueOnce(error);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: HISTORICAL_REPORT_ID }) });

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ error: message });
  });
});
