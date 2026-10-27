import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("rejects before resolving route parameters or reading the snapshot", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    const then = vi.fn();
    const response = await GET(new Request("http://localhost"), {
      params: { then } as unknown as Promise<{ id: string }>,
    });

    expect(response.status).toBe(401);
    expect(then).not.toHaveBeenCalled();
    expect(getSnapshotMock).not.toHaveBeenCalled();
  });

  it("returns a structured download from the requested owner snapshot", async () => {
    const response = await invoke();
    expect(response.status).toBe(200);
    expect(getSnapshotMock).toHaveBeenCalledWith(HISTORICAL_REPORT_ID, "user-1");
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Content-Disposition")).toContain(".json");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
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

  defineReportGenerationErrorTests(invoke);
});
