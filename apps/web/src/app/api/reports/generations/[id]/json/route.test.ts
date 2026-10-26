import { beforeEach, describe, expect, it } from "vitest";
import {
  getSnapshotMock,
  InvalidReportGenerationIdErrorMock,
  InvalidReportGenerationSnapshotErrorMock,
  requireAuthenticatedAccessMock,
  resetReportGenerationExportMocks,
} from "@/__tests__/support/report-generation-export-route";

import { GET } from "./route";
import {
  HISTORICAL_REPORT_GENERATION,
  HISTORICAL_REPORT_ID,
} from "../historical-export-test-fixtures";

describe("GET historical scientific JSON", () => {
  beforeEach(() => {
    resetReportGenerationExportMocks(HISTORICAL_REPORT_GENERATION);
  });

  const invoke = () => GET(new Request("http://localhost"), { params: Promise.resolve({ id: HISTORICAL_REPORT_ID }) });

  it("keeps the owner guard before the snapshot read", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    const response = await invoke();
    expect(response.status).toBe(401);
    expect(getSnapshotMock).not.toHaveBeenCalled();
  });

  it("returns a structured download from the requested owner snapshot", async () => {
    const response = await invoke();
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

    const response = await invoke();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Rapport historique introuvable." });
  });

  it.each([
    ["invalid id", new InvalidReportGenerationIdErrorMock(), 400, "Identifiant de rapport invalide."],
    ["incompatible snapshot", new InvalidReportGenerationSnapshotErrorMock(), 422, "Le snapshot historique est invalide ou incompatible."],
    ["store failure", new Error("database unavailable"), 503, "Impossible d'exporter le rapport historique."],
  ])("maps %s without returning an export", async (_label, error, status, message) => {
    getSnapshotMock.mockRejectedValueOnce(error);

    const response = await invoke();

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ error: message });
  });
});
