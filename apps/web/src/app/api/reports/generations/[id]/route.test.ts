import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getSnapshotMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/reports/report-generation-history-store", () => ({
  getReportGenerationSnapshotById: getSnapshotMock,
  InvalidReportGenerationIdError: class InvalidReportGenerationIdError extends Error {},
}));

vi.mock("@/lib/reports/report-generation-payload", () => ({
  InvalidReportGenerationSnapshotError: class InvalidReportGenerationSnapshotError extends Error {},
}));

import { GET } from "./route";
import {
  InvalidReportGenerationIdError,
} from "@/lib/reports/report-generation-history-store";
import { InvalidReportGenerationSnapshotError } from "@/lib/reports/report-generation-payload";

const id = "11111111-1111-4111-8111-111111111111";
const generation = {
  id,
  filename: "rapport_reporting_six_months.pdf",
  generatedAt: "2026-08-27T10:30:00.000Z",
  scopeLabel: "Global",
  detailLevel: "default",
  snapshot: {
    title: "Rapport historique",
    rubrique: "reporting",
    periode: "six_months",
    organizationType: "Global",
    data: { generatedAt: "2026-08-27T10:30:00.000Z", summary: ["Historique"] },
  },
};

function request() {
  return new Request(`http://localhost/api/reports/generations/${id}`);
}

describe("GET /api/reports/generations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "user-admin" });
    getSnapshotMock.mockResolvedValue(generation);
  });

  it("requires admin access before loading a snapshot", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    const response = await GET(request(), { params: Promise.resolve({ id }) });

    expect(response.status).toBe(401);
    expect(getSnapshotMock).not.toHaveBeenCalled();
  });

  it("returns only the requested immutable generation snapshot", async () => {
    const response = await GET(request(), { params: Promise.resolve({ id }) });

    expect(response.status).toBe(200);
    expect(getSnapshotMock).toHaveBeenCalledWith(id);
    await expect(response.json()).resolves.toEqual({ generation });
  });

  it("maps invalid IDs, missing rows and invalid snapshots to explicit responses", async () => {
    getSnapshotMock.mockRejectedValueOnce(new InvalidReportGenerationIdError());
    const invalidIdResponse = await GET(request(), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(invalidIdResponse.status).toBe(400);

    getSnapshotMock.mockResolvedValueOnce(null);
    const missingResponse = await GET(request(), { params: Promise.resolve({ id }) });
    expect(missingResponse.status).toBe(404);

    getSnapshotMock.mockRejectedValueOnce(new InvalidReportGenerationSnapshotError());
    const invalidSnapshotResponse = await GET(request(), {
      params: Promise.resolve({ id }),
    });
    expect(invalidSnapshotResponse.status).toBe(422);
  });
});
