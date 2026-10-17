import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getSnapshotMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/reports/report-generation-history-store", () => ({
  getReportGenerationSnapshotById: getSnapshotMock,
  InvalidReportGenerationIdError: class InvalidReportGenerationIdError extends Error {},
}));
vi.mock("@/lib/reports/report-generation-payload", () => ({
  InvalidReportGenerationSnapshotError: class InvalidReportGenerationSnapshotError extends Error {},
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

describe("GET historical scientific JSON", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    getSnapshotMock.mockResolvedValue(generation);
  });

  it("keeps the owner guard before the snapshot read", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(401);
    expect(getSnapshotMock).not.toHaveBeenCalled();
  });

  it("returns a structured download from the requested owner snapshot", async () => {
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(200);
    expect(getSnapshotMock).toHaveBeenCalledWith(id, "user-1");
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Content-Disposition")).toContain(".json");
    await expect(response.json()).resolves.toMatchObject({
      schemaVersion: "reports-scientific-export-v1",
      reference: { generationId: id },
    });
  });
});
