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

describe("GET historical scientific JSON", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    getSnapshotMock.mockResolvedValue(HISTORICAL_REPORT_GENERATION);
  });

  it("keeps the owner guard before the snapshot read", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: HISTORICAL_REPORT_ID }) });
    expect(response.status).toBe(401);
    expect(getSnapshotMock).not.toHaveBeenCalled();
  });

  it("returns a structured download from the requested owner snapshot", async () => {
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: HISTORICAL_REPORT_ID }) });
    expect(response.status).toBe(200);
    expect(getSnapshotMock).toHaveBeenCalledWith(HISTORICAL_REPORT_ID, "user-1");
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Content-Disposition")).toContain(".json");
    await expect(response.json()).resolves.toMatchObject({
      schemaVersion: "reports-scientific-export-v1",
      reference: { generationId: HISTORICAL_REPORT_ID },
    });
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
