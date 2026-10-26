import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  getSnapshot: vi.fn(),
  InvalidReportGenerationIdError: class extends Error {},
  InvalidReportGenerationSnapshotError: class extends Error {},
}));

export const requireAuthenticatedAccessMock = mocks.requireAuthenticatedAccess;
export const getSnapshotMock = mocks.getSnapshot;
export const InvalidReportGenerationIdErrorMock = mocks.InvalidReportGenerationIdError;
export const InvalidReportGenerationSnapshotErrorMock = mocks.InvalidReportGenerationSnapshotError;

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
