import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const getCurrentUserActiveRoleMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());
const getCommunityBugReportByIdMock = vi.hoisted(() => vi.fn());
const updateCommunityBugReportStatusMock = vi.hoisted(() => vi.fn());
const updateCommunityBugReportStatusTransactionalMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
  getCurrentUserActiveRole: getCurrentUserActiveRoleMock,
}));

vi.mock("@/lib/admin/audit/operation-audit", () => ({
  appendAdminOperationAudit: appendAdminOperationAuditMock,
}));

vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => new Response("unauthorized", { status: 401 }),
}));

vi.mock("@/lib/community/bug-reports-store", () => ({
  appendCommunityBugReport: vi.fn(),
  getCommunityBugReportById: getCommunityBugReportByIdMock,
  updateCommunityBugReportStatus: updateCommunityBugReportStatusMock,
  updateCommunityBugReportStatusTransactional: updateCommunityBugReportStatusTransactionalMock,
}));

vi.mock("@/lib/community/creator-inbox-email", () => ({
  sendCreatorInboxEmail: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/community/discussion-rate-limit", () => ({
  reserveDiscussionMessageSlot: vi.fn(),
  toDiscussionRateLimitErrorPayload: vi.fn(),
}));

vi.mock("@/lib/rate-limit/server", () => ({
  createServerRateLimitResponse: vi.fn(),
  verifyRateLimit: vi.fn(),
}));

vi.mock("@/lib/security/validation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/security/validation")>()),
  createPublicRateLimitResponse: vi.fn(),
  hasHoneypotSignal: vi.fn(),
  hasRecentSubmission: vi.fn(),
}));

vi.mock("@/lib/logging/failure-log", () => ({
  logWarning: vi.fn(),
}));

const report = {
  id: "report-1",
  createdAt: "2026-08-27T09:00:00.000Z",
  submittedByUserId: "user-1",
  submittedByDisplayName: "private-display-name",
  submittedByEmail: null,
  submittedByRole: "benevole",
  reportType: "bug" as const,
  title: "private-title",
  description: "private-description",
  pagePath: "/private-path",
  source: "feedback_section" as const,
  status: "open" as const,
  creatorState: "new" as const,
};

function patchRequest(body: unknown): Request {
  return new Request("http://localhost/api/community/bug-reports", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function updatedReport(status: "open" | "treated" | "archived") {
  return {
    ...report,
    status,
    creatorState: status === "open" ? "new" : status,
  };
}

describe("PATCH /api/community/bug-reports", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getCurrentUserActiveRoleMock.mockResolvedValue("max");
    getCurrentUserIdentityMock.mockResolvedValue({
      userId: "reviewer-1",
      displayName: "private-reviewer",
      email: null,
      role: "max",
    });
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
    getCommunityBugReportByIdMock.mockResolvedValue(report);
    updateCommunityBugReportStatusMock.mockImplementation(async ({ status }) =>
      updatedReport(status),
    );
    updateCommunityBugReportStatusTransactionalMock.mockImplementation(async ({ status }) => ({
      status: "updated",
      record: updatedReport(status),
      auditPersisted: true,
    }));
  });

  it.each([undefined, "", "nope", "    "]) (
    "rejects a missing or short reason (%j) before any mutation",
    async (reason) => {
      const { PATCH } = await import("./route");

      const response = await PATCH(
        patchRequest({ reportId: "report-1", status: "treated", reason }),
      );

      expect(response.status).toBe(400);
      expect(getCommunityBugReportByIdMock).not.toHaveBeenCalled();
       expect(updateCommunityBugReportStatusMock).not.toHaveBeenCalled();
       expect(updateCommunityBugReportStatusTransactionalMock).not.toHaveBeenCalled();
      expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
    },
  );

  it("requires a canonical reviewer identity before mutation", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce(null);
    const { PATCH } = await import("./route");

    const response = await PATCH(
      patchRequest({ reportId: "report-1", status: "treated", reason: "Valid reason" }),
    );

    expect(response.status).toBe(401);
    expect(getCommunityBugReportByIdMock).not.toHaveBeenCalled();
    expect(updateCommunityBugReportStatusMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
  });

  it("rejects a role other than max before loading or mutating the feedback", async () => {
    getCurrentUserActiveRoleMock.mockResolvedValueOnce("admin");
    const { PATCH } = await import("./route");

    const response = await PATCH(
      patchRequest({ reportId: "report-1", status: "treated", reason: "Rôle insuffisant" }),
    );

    expect(response.status).toBe(403);
    expect(getCommunityBugReportByIdMock).not.toHaveBeenCalled();
    expect(updateCommunityBugReportStatusMock).not.toHaveBeenCalled();
    expect(updateCommunityBugReportStatusTransactionalMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
  });

  it.each(["open", "treated", "archived"] as const)(
    "uses the transactional mutation for %s without a second success audit",
    async (status) => {
    const { PATCH } = await import("./route");

    const response = await PATCH(
      patchRequest({
        reportId: "report-1",
        status,
        reason: "  Traitement terminé  ",
      }),
    );

    expect(response.status).toBe(200);
     expect(updateCommunityBugReportStatusTransactionalMock).toHaveBeenCalledWith({
      reportId: "report-1",
      status,
       reason: "Traitement terminé",
      actorUserId: "reviewer-1",
      operationId: expect.stringMatching(/^feedback-status-/),
      expectedStatus: "open",
      expectedCreatorState: "new",
    });
    expect(updateCommunityBugReportStatusMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
    },
  );

  it("does not add a second audit when the transaction is unchanged", async () => {
    updateCommunityBugReportStatusTransactionalMock.mockResolvedValueOnce({
      status: "unchanged",
      record: report,
      auditPersisted: true,
    });
    const { PATCH } = await import("./route");

    const response = await PATCH(
      patchRequest({ reportId: "report-1", status: "treated", reason: "Déjà traité" }),
    );

    expect(response.status).toBe(200);
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
    expect(updateCommunityBugReportStatusMock).not.toHaveBeenCalled();
  });

  it("rejects an overlong reason before loading or mutating the feedback", async () => {
    const { PATCH } = await import("./route");

    const response = await PATCH(
      patchRequest({ reportId: "report-1", status: "treated", reason: "a".repeat(501) }),
    );

    expect(response.status).toBe(400);
    expect(getCommunityBugReportByIdMock).not.toHaveBeenCalled();
    expect(updateCommunityBugReportStatusTransactionalMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
  });

  it("returns 409 without an extra audit when the transaction detects a conflict", async () => {
    updateCommunityBugReportStatusTransactionalMock.mockResolvedValueOnce({
      status: "conflict",
      record: { ...report, status: "treated", creatorState: "treated" },
      auditPersisted: true,
    });
    const { PATCH } = await import("./route");

    const response = await PATCH(
      patchRequest({ reportId: "report-1", status: "archived", reason: "Conflit détecté" }),
    );

    expect(response.status).toBe(409);
    expect(updateCommunityBugReportStatusMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the transaction reports a missing feedback", async () => {
    updateCommunityBugReportStatusTransactionalMock.mockResolvedValueOnce({
      status: "not_found",
      record: null,
      auditPersisted: true,
    });
    const { PATCH } = await import("./route");

    const response = await PATCH(
      patchRequest({ reportId: "report-1", status: "archived", reason: "Feedback absent" }),
    );

    expect(response.status).toBe(404);
    expect(updateCommunityBugReportStatusMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
  });

  it("returns the transactional archive result without a second success audit", async () => {
    const { PATCH } = await import("./route");

    const response = await PATCH(
      patchRequest({ reportId: "report-1", status: "archived", reason: "Archive validée" }),
    );

    expect(response.status).toBe(200);
    expect(updateCommunityBugReportStatusTransactionalMock).toHaveBeenCalledTimes(1);
    expect(updateCommunityBugReportStatusMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
  });

  it("audits a not-found lookup as one bounded error", async () => {
    getCommunityBugReportByIdMock.mockResolvedValueOnce(null);
    const { PATCH } = await import("./route");

    const response = await PATCH(
      patchRequest({ reportId: "missing-report", status: "treated", reason: "Lookup validé" }),
    );

    expect(response.status).toBe(404);
    expect(updateCommunityBugReportStatusMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock.mock.calls[0]?.[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "error",
      targetId: "missing-report",
      details: {
        operation: "update_bug_report_status",
        reason: "Lookup validé",
        stage: "lookup",
        partialMutation: false,
        previousValue: { status: "unknown", creatorState: "unknown" },
        newValue: { status: "treated", creatorState: "treated" },
      },
    });
  });

  it("audits a lookup failure without exposing its error", async () => {
    getCommunityBugReportByIdMock.mockRejectedValueOnce(new Error("private lookup failure"));
    const { PATCH } = await import("./route");

    const response = await PATCH(
      patchRequest({ reportId: "report-1", status: "treated", reason: "Lookup échoué" }),
    );

    expect(response.status).toBe(500);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    const audit = appendAdminOperationAuditMock.mock.calls[0]?.[0];
    expect(audit.details).toMatchObject({ stage: "lookup", partialMutation: false });
    expect(JSON.stringify(audit.details)).not.toContain("private lookup failure");
  });

  it.each([
    ["throws", () => updateCommunityBugReportStatusTransactionalMock.mockRejectedValueOnce(new Error("private update failure"))],
  ])("audits an update %s as one bounded error", async (_label, configure) => {
    configure();
    const { PATCH } = await import("./route");

    const response = await PATCH(
      patchRequest({ reportId: "report-1", status: "treated", reason: "Mise à jour échouée" }),
    );

    expect(response.status).toBe(500);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    const audit = appendAdminOperationAuditMock.mock.calls[0]?.[0];
    expect(audit).toMatchObject({
      operationType: "admin_operation",
      outcome: "error",
      targetId: "report-1",
      details: {
        operation: "update_bug_report_status",
        reason: "Mise à jour échouée",
        targetUserId: "user-1",
        previousValue: { status: "open", creatorState: "new" },
        newValue: { status: "treated", creatorState: "treated" },
        stage: "update",
        partialMutation: false,
      },
    });
    expect(JSON.stringify(audit.details)).not.toContain("private update failure");
    expect(updateCommunityBugReportStatusMock).not.toHaveBeenCalled();
  });

  it("omits a non-canonical target user id from audit details", async () => {
    getCommunityBugReportByIdMock.mockResolvedValueOnce({ ...report, submittedByUserId: "unknown" });
    const { PATCH } = await import("./route");

    const response = await PATCH(
      patchRequest({ reportId: "report-1", status: "treated", reason: "Sans cible canonique" }),
    );

    expect(response.status).toBe(200);
    expect(updateCommunityBugReportStatusTransactionalMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "reviewer-1" }),
    );
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
  });
});
