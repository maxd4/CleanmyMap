import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());
const getLegalContentReportByIdMock = vi.hoisted(() => vi.fn());
const updateLegalContentReportStateMock = vi.hoisted(() => vi.fn());
const appendDecisionMock = vi.hoisted(() => vi.fn());
const updateDecisionStatesMock = vi.hoisted(() => vi.fn());
const updateDecisionNotificationsMock = vi.hoisted(() => vi.fn());
const applyCanonicalLegalContentMutationMock = vi.hoisted(() => vi.fn());
const sendNotifierMock = vi.hoisted(() => vi.fn());
const sendAuthorMock = vi.hoisted(() => vi.fn());
const buildInboxItemMock = vi.hoisted(() => vi.fn((record) => ({
  id: `legal-content-report-${record.id}`,
  source: "legal_content_report",
  sourceRecordId: record.id,
  status: record.creatorState,
})));

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
  getCurrentUserIdentity: getCurrentUserIdentityMock,
}));
vi.mock("@/lib/admin/audit/operation-audit", () => ({
  appendAdminOperationAudit: appendAdminOperationAuditMock,
}));
vi.mock("@/lib/legal-content-report/legal-content-report-store", () => ({
  getLegalContentReportById: getLegalContentReportByIdMock,
  updateLegalContentReportState: updateLegalContentReportStateMock,
}));
vi.mock("@/lib/legal-content-report/legal-content-report-decisions-store", () => ({
  appendLegalContentReportDecision: appendDecisionMock,
  updateLegalContentReportDecisionStates: updateDecisionStatesMock,
  updateLegalContentReportDecisionNotifications: updateDecisionNotificationsMock,
}));
vi.mock("@/lib/admin/moderation/legal-content-moderation", () => ({
  applyCanonicalLegalContentMutation: applyCanonicalLegalContentMutationMock,
}));
vi.mock("@/lib/legal-content-report/legal-content-report-service", () => ({
  sendLegalContentReportDecisionToNotifier: sendNotifierMock,
  sendLegalContentReportDecisionToAuthor: sendAuthorMock,
}));
vi.mock("@/lib/community/creator-inbox", () => ({
  buildLegalContentReportInboxItem: buildInboxItemMock,
}));

import { POST } from "./route";

const baseReport = {
  id: "report-1",
  createdAt: "2026-08-27T10:00:00.000Z",
  submittedByUserId: "reporter-user",
  notifierName: "Reporter Name",
  notifierEmail: "reporter@example.com",
  identityExceptionReason: null,
  contentUrl: "https://cleanmymap.example/actions/action-1",
  contentType: "action",
  contentId: "action-1",
  allegationReason: "Le contenu semble présenter une infraction.",
  goodFaithConfirmed: true as const,
  status: "open" as const,
  creatorState: "new" as const,
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/admin/legal-content-reports/decision", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    reportId: baseReport.id,
    action: "reviewing",
    origin: "received_notification",
    reason: "Examen administratif engagé.",
    automatedMeansUsed: false,
    ...overrides,
  };
}

describe("POST /api/admin/legal-content-reports/decision", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ userId: "admin-1" });
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
    getLegalContentReportByIdMock.mockResolvedValue(baseReport);
    updateLegalContentReportStateMock.mockImplementation(
      async ({ creatorState }: { creatorState: string }) => ({
        ...baseReport,
        creatorState,
        status:
          creatorState === "closed" ? "archived" : creatorState === "reviewing" ? "open" : "treated",
      }),
    );
    appendDecisionMock.mockImplementation(async (input) => ({
      id: "decision-1",
      createdAt: "2026-08-27T10:01:00.000Z",
      ...input,
      notifierNotificationStatus: "not_requested",
      authorNotificationStatus: "not_requested",
      notificationError: null,
    }));
    updateDecisionNotificationsMock.mockResolvedValue(undefined);
    updateDecisionStatesMock.mockImplementation(async ({ decisionId, beforeState, afterState }) => ({
      id: decisionId,
      createdAt: "2026-08-27T10:01:00.000Z",
      reportId: baseReport.id,
      actorAdminUserId: "admin-1",
      action: "content_restricted",
      origin: "received_notification",
      reason: "Examen administratif engagé.",
      automatedMeansUsed: false,
      legalBasis: "Article 16 DSA",
      termsBasis: null,
      contentUrl: baseReport.contentUrl,
      contentId: baseReport.contentId,
      beforeState,
      afterState,
      auditOperationId: "audit-1",
      notifierNotificationStatus: "not_requested",
      authorNotificationStatus: "not_requested",
      notificationError: null,
    }));
    applyCanonicalLegalContentMutationMock.mockResolvedValue({
      supported: true,
      found: true,
      beforeState: { source: "actions", status: "approved", moderationVisibility: "visible" },
      afterState: { source: "actions", status: "approved", moderationVisibility: "hidden" },
      authorEmail: null,
    });
    sendNotifierMock.mockResolvedValue({ status: "sent" });
    sendAuthorMock.mockResolvedValue({ status: "sent" });
  });

  it("requires a clear reason and rejects ambiguous bases", async () => {
    const missingReason = await POST(request(validBody({ reason: "no" })));
    expect(missingReason.status).toBe(400);

    const bothBases = await POST(
      request(
        validBody({
          action: "content_restricted",
          legalBasis: "Article 16 DSA",
          termsBasis: "CGU article 4",
        }),
      ),
    );
    expect(bothBases.status).toBe(400);

    const missingBasis = await POST(
      request(validBody({ action: "content_removed" })),
    );
    expect(missingBasis.status).toBe(400);
    expect(appendDecisionMock).not.toHaveBeenCalled();
  });

  it("records the canonical admin, decision, bounded states and notification", async () => {
    const response = await POST(
      request(
        validBody({
          action: "no_action",
          termsBasis: "Aucune clause des CGU ne justifie une mesure.",
          automatedMeansUsed: true,
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(appendDecisionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorAdminUserId: "admin-1",
        action: "no_action",
        termsBasis: "Aucune clause des CGU ne justifie une mesure.",
        legalBasis: null,
        automatedMeansUsed: true,
        contentUrl: baseReport.contentUrl,
        contentId: baseReport.contentId,
      }),
    );
    const audit = appendAdminOperationAuditMock.mock.calls[0]?.[0];
    expect(audit.actorUserId).toBe("admin-1");
    expect(audit.outcome).toBe("success");
    expect(audit.details.beforeState).toEqual(expect.any(Object));
    expect(audit.details.afterState).toEqual(expect.any(Object));
    expect(audit.details).not.toHaveProperty("notifierEmail");
    expect(audit.details).not.toHaveProperty("allegationReason");
    expect(sendNotifierMock).toHaveBeenCalledTimes(1);
    expect(sendAuthorMock).not.toHaveBeenCalled();
  });

  it("mutates only through the canonical capability and notifies the author without reporter identity", async () => {
    applyCanonicalLegalContentMutationMock.mockResolvedValueOnce({
      supported: true,
      found: true,
      beforeState: { source: "actions", moderationVisibility: "visible" },
      afterState: { source: "actions", moderationVisibility: "hidden" },
      authorEmail: "author@example.com",
    });

    const response = await POST(
      request(
        validBody({
          action: "content_restricted",
          legalBasis: "Article 16 DSA",
          termsBasis: undefined,
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(applyCanonicalLegalContentMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "admin-1", contentId: "action-1" }),
    );
    expect(sendAuthorMock).toHaveBeenCalledWith(
      expect.objectContaining({ authorEmail: "author@example.com" }),
    );
    expect(sendAuthorMock.mock.calls[0]?.[0]).not.toHaveProperty("notifierName");
    expect(sendAuthorMock.mock.calls[0]?.[0]).not.toHaveProperty("notifierEmail");
  });

  it("does not mutate when the requested content action has no canonical capability", async () => {
    applyCanonicalLegalContentMutationMock.mockResolvedValueOnce({
      supported: false,
      found: false,
      beforeState: {},
      afterState: {},
      authorEmail: null,
    });
    getLegalContentReportByIdMock.mockResolvedValueOnce({
      ...baseReport,
      contentType: "profile",
    });
    const response = await POST(
      request(validBody({ action: "content_removed", legalBasis: "Article 16 DSA" })),
    );
    expect(response.status).toBe(409);
    expect(appendDecisionMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "error" }),
    );
  });

  it("records a partial error when notification fails after the decision", async () => {
    sendNotifierMock.mockRejectedValueOnce(new Error("provider failure"));
    const response = await POST(request(validBody()));
    expect(response.status).toBe(207);
    expect(updateDecisionNotificationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        decisionId: "decision-1",
        notifierNotificationStatus: "failed",
      }),
    );
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(2);
    expect(appendAdminOperationAuditMock.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        outcome: "error",
        details: expect.objectContaining({
          stage: "notification",
          partialMutation: true,
        }),
      }),
    );
  });

  it("uses the canonical admin gate before any mutation", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
    const response = await POST(request(validBody()));
    expect(response.status).toBe(403);
    expect(getLegalContentReportByIdMock).not.toHaveBeenCalled();
    expect(applyCanonicalLegalContentMutationMock).not.toHaveBeenCalled();
  });
});
