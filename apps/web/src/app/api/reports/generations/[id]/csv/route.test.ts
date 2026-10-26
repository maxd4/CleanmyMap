import { beforeEach, describe, expect, it } from "vitest";
import {
  getSnapshotMock,
  requireAuthenticatedAccessMock,
  resetReportGenerationExportMocks,
  defineReportGenerationErrorTests,
} from "@/__tests__/support/report-generation-export-route";

import { GET } from "./route";
import {
  HISTORICAL_REPORT_GENERATION,
  HISTORICAL_REPORT_ID,
} from "../historical-export-test-fixtures";

describe("GET historical scientific CSV", () => {
  beforeEach(() => {
    resetReportGenerationExportMocks(HISTORICAL_REPORT_GENERATION);
  });

  const invoke = () => GET(new Request("http://localhost"), { params: Promise.resolve({ id: HISTORICAL_REPORT_ID }) });

  it("rejects an unauthenticated request without reading the snapshot", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    const response = await invoke();
    expect(response.status).toBe(401);
    expect(getSnapshotMock).not.toHaveBeenCalled();
  });

  it("returns CSV with explicit missing-data status and download headers", async () => {
    const response = await invoke();
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

    const response = await invoke();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Rapport historique introuvable." });
  });

  defineReportGenerationErrorTests(invoke);
});
