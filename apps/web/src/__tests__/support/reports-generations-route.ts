import { vi } from "vitest";
import {
  createRateLimitModule,
  mockAllowedRateLimit,
  mockRejectedRateLimit,
  rateLimitMocks,
} from "@/app/api/test-helpers";
import { multiInput, validSnapshotPayload } from "@/__tests__/support/reports-generations-fixtures";
import type { requireAuthenticatedAccess } from "@/lib/authz";
import type {
  persistReportGeneration,
  listReportGenerationHistoryPage,
  resolveDirectReportGenerationPersistence,
} from "@/lib/reports/report-generation-history-store";
import type {
  appendAdminOperationAudit,
} from "@/lib/admin/audit/operation-audit";
import type {
  getReportExportAvailability,
  getReportExportQuotaDay,
  reserveReportExportSlot,
  releaseReportExportSlot,
} from "@/lib/reports/report-export-quota";
import type {
  buildSingleActionReportGenerationInput,
} from "@/lib/reports/single-action-report";
import type { buildMultiActionReportGenerationInput } from "@/lib/reports/multi-action-report";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn<typeof requireAuthenticatedAccess>());
const persistReportGenerationMock = vi.hoisted(() => vi.fn<typeof persistReportGeneration>());
const listReportGenerationHistoryPageMock = vi.hoisted(() => vi.fn<typeof listReportGenerationHistoryPage>());
const resolveDirectReportGenerationPersistenceMock = vi.hoisted(() => vi.fn<typeof resolveDirectReportGenerationPersistence>());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn<typeof appendAdminOperationAudit>());
const getReportExportAvailabilityMock = vi.hoisted(() => vi.fn<typeof getReportExportAvailability>());
const getReportExportQuotaDayMock = vi.hoisted(() => vi.fn<typeof getReportExportQuotaDay>());
const reserveReportExportSlotMock = vi.hoisted(() => vi.fn<typeof reserveReportExportSlot>());
const releaseReportExportSlotMock = vi.hoisted(() => vi.fn<typeof releaseReportExportSlot>());
const resolveSingleActionReportContractMock = vi.hoisted(() => vi.fn<(actionId: string) => Promise<unknown>>());
const buildSingleActionReportGenerationInputMock = vi.hoisted(() => vi.fn<typeof buildSingleActionReportGenerationInput>());
const buildMultiActionReportGenerationInputMock = vi.hoisted(() => vi.fn<typeof buildMultiActionReportGenerationInput>());
const SingleActionReportTargetUnavailableErrorMock = vi.hoisted(() =>
  class SingleActionReportTargetUnavailableError extends Error {},
);
const MultiActionReportPeriodInvalidErrorMock = vi.hoisted(() =>
  class MultiActionReportPeriodInvalidError extends Error {},
);
const MultiActionReportScopeUnavailableErrorMock = vi.hoisted(() =>
  class MultiActionReportScopeUnavailableError extends Error {},
);
const MultiActionReportEmptyErrorMock = vi.hoisted(() =>
  class MultiActionReportEmptyError extends Error {},
);
const MultiActionReportSourceUnavailableErrorMock = vi.hoisted(() =>
  class MultiActionReportSourceUnavailableError extends Error {},
);
const ReportAdvancedFilterSourceUnavailableErrorMock = vi.hoisted(() =>
  class ReportAdvancedFilterSourceUnavailableError extends Error {},
);

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
}));

vi.mock("@/lib/reports/report-generation-history-store", () => ({
  persistReportGeneration: persistReportGenerationMock,
  listReportGenerationHistoryPage: listReportGenerationHistoryPageMock,
  resolveDirectReportGenerationPersistence: resolveDirectReportGenerationPersistenceMock,
}));

vi.mock("@/lib/admin/audit/operation-audit", () => ({
  appendAdminOperationAudit: appendAdminOperationAuditMock,
}));

vi.mock("@/lib/reports/report-export-quota", () => ({
  getReportExportAvailability: getReportExportAvailabilityMock,
  getReportExportQuotaDay: getReportExportQuotaDayMock,
  reserveReportExportSlot: reserveReportExportSlotMock,
  releaseReportExportSlot: releaseReportExportSlotMock,
}));

vi.mock("@/lib/reports/single-action-report", () => ({
  resolveSingleActionReportContract: resolveSingleActionReportContractMock,
  buildSingleActionReportGenerationInput: buildSingleActionReportGenerationInputMock,
  SingleActionReportTargetUnavailableError: SingleActionReportTargetUnavailableErrorMock,
}));

vi.mock("@/lib/reports/multi-action-report", () => ({
  buildMultiActionReportGenerationInput: buildMultiActionReportGenerationInputMock,
  MultiActionReportPeriodInvalidError: MultiActionReportPeriodInvalidErrorMock,
  MultiActionReportScopeUnavailableError: MultiActionReportScopeUnavailableErrorMock,
  MultiActionReportEmptyError: MultiActionReportEmptyErrorMock,
  MultiActionReportSourceUnavailableError: MultiActionReportSourceUnavailableErrorMock,
}));

vi.mock("@/lib/reports/report-advanced-filters", async () => ({
  ...(await vi.importActual<typeof import("@/lib/reports/report-advanced-filters")>(
    "@/lib/reports/report-advanced-filters",
  )),
  ReportAdvancedFilterSourceUnavailableError: ReportAdvancedFilterSourceUnavailableErrorMock,
}));

vi.mock("@/lib/rate-limit/server", () => createRateLimitModule());

export const reportGenerationMocks = {
  requireAuthenticatedAccessMock,
  persistReportGenerationMock,
  listReportGenerationHistoryPageMock,
  resolveDirectReportGenerationPersistenceMock,
  appendAdminOperationAuditMock,
  getReportExportAvailabilityMock,
  getReportExportQuotaDayMock,
  reserveReportExportSlotMock,
  releaseReportExportSlotMock,
  resolveSingleActionReportContractMock,
  buildSingleActionReportGenerationInputMock,
  buildMultiActionReportGenerationInputMock,
  SingleActionReportTargetUnavailableErrorMock,
  MultiActionReportPeriodInvalidErrorMock,
  MultiActionReportScopeUnavailableErrorMock,
  MultiActionReportEmptyErrorMock,
  MultiActionReportSourceUnavailableErrorMock,
  ReportAdvancedFilterSourceUnavailableErrorMock,
  mockRejectedRateLimit,
  rateLimitMocks,
};

export function setupPostReportGenerationDefaults() {
  vi.clearAllMocks();
  requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
  persistReportGenerationMock.mockResolvedValue({
    id: "generation-1",
    report: validSnapshotPayload.title,
    period: "Six mois",
    perimeter: "Paris",
    detail: "Par défaut (12 à 16 pages)",
    generatedAt: "27/08/2026 12:30",
  });
  listReportGenerationHistoryPageMock.mockResolvedValue({
    rows: [],
    page: 1,
    pageSize: 12,
    total: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  appendAdminOperationAuditMock.mockResolvedValue(undefined);
  resolveDirectReportGenerationPersistenceMock.mockResolvedValue({ kind: "not_persisted" });
  getReportExportAvailabilityMock.mockResolvedValue("available");
  getReportExportQuotaDayMock.mockReturnValue("2026-08-27");
  reserveReportExportSlotMock.mockResolvedValue({ allowed: true, quotaDay: "2026-08-27" });
  releaseReportExportSlotMock.mockResolvedValue(undefined);
  buildMultiActionReportGenerationInputMock.mockResolvedValue(multiInput);
  mockAllowedRateLimit(5);
}

export function setupGetReportGenerationDefaults() {
  vi.clearAllMocks();
  requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "owner-1" });
  listReportGenerationHistoryPageMock.mockResolvedValue({
    rows: [{
      id: "generation-1",
      report: "Paris",
      period: "Six mois",
      perimeter: "Global",
      detail: "Par défaut",
      generatedAt: "27/08/2026 12:30",
      theme: "scientific",
    }],
    page: 2,
    pageSize: 12,
    total: 13,
    hasNextPage: false,
    hasPreviousPage: true,
  });
}
