import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  getSnapshot: vi.fn(),
  InvalidReportGenerationIdError: class extends Error {},
  InvalidReportGenerationSnapshotError: class extends Error {},
}));

export const requireAuthenticatedAccessMock = mocks.requireAuthenticatedAccess;
export const getSnapshotMock = mocks.getSnapshot;
const InvalidReportGenerationIdErrorMock = mocks.InvalidReportGenerationIdError;
const InvalidReportGenerationSnapshotErrorMock = mocks.InvalidReportGenerationSnapshotError;

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/reports/report-generation-history-store", () => ({
  getReportGenerationSnapshotById: mocks.getSnapshot,
  InvalidReportGenerationIdError: mocks.InvalidReportGenerationIdError,
}));
vi.mock("@/lib/reports/report-generation-payload", () => ({
  InvalidReportGenerationSnapshotError: mocks.InvalidReportGenerationSnapshotError,
}));

export function resetReportGenerationExportMocks(generation: unknown): void {
  vi.clearAllMocks();
  requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
  getSnapshotMock.mockResolvedValue(generation);
}

export function defineReportGenerationErrorTests(
  invoke: () => Promise<Response>,
): void {
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
}
