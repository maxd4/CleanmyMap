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

const id = "11111111-1111-4111-8111-111111111111";
const generation = {
  id,
  filename: "rapport_reporting_six_months.pdf",
  generatedAt: "2026-08-27T10:30:00.000Z",
  scopeKind: "global",
  scopeValue: "",
  scopeLabel: "Global",
  detailLevel: "default",
  snapshot: {
    title: "Rapport historique",
    rubrique: "reporting",
    periode: "six_months",
    organizationType: "Global",
    data: {
      generatedAt: "2026-08-27T10:30:00.000Z",
      rows: [{ Masse_Kg: 2, Megots: null }],
      columns: [{ key: "Masse_Kg", label: "Masse (kg)" }, { key: "Megots", label: "Mégots" }],
    },
  },
};

describe("GET historical scientific CSV", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    getSnapshotMock.mockResolvedValue(generation);
  });

  it("rejects an unauthenticated request without reading the snapshot", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(401);
    expect(getSnapshotMock).not.toHaveBeenCalled();
  });

  it("returns CSV with explicit missing-data status and download headers", async () => {
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain(".csv");
    const body = await response.text();
    expect(body).toContain("generation_id");
    expect(body).toContain("DECLARED");
    expect(body).toContain("NA");
  });

  it.each([
    ["invalid id", new InvalidReportGenerationIdErrorMock(), 400, "Identifiant de rapport invalide."],
    ["incompatible snapshot", new InvalidReportGenerationSnapshotErrorMock(), 422, "Le snapshot historique est invalide ou incompatible."],
    ["store failure", new Error("database unavailable"), 503, "Impossible d'exporter le rapport historique."],
  ])("maps %s without returning an export", async (_label, error, status, message) => {
    getSnapshotMock.mockRejectedValueOnce(error);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id }) });

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ error: message });
  });
});
