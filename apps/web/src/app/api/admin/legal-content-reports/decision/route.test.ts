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
  id: "legal-content-report-" + record.id,
  source: "legal_content_report",
  sourceRecordId: record.id,
  status: record.creatorState,
  executionStatus: record.latestDecision?.executionStatus,
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

let currentDecision: Record<string, unknown>;

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
    currentDecision = {};
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ userId: "admin-1" });
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
    getLegalContentReportByIdMock.mockResolvedValue(baseReport);
    updateLegalContentReportStateMock.mockImplementation(
      async ({ creatorState }: { creatorState: string }) => ({
        ...baseReport,
        creatorState,
        status: creatorState === "closed" ? "archived" : creatorState === "reviewing" ? "open" : "treated",
      }),
    );
    appendDecisionMock.mockImplementation(async (input) => {
      currentDecision = {
        id: "decision-1",
        createdAt: "2026-08-27T10:01:00.000Z",
        ...input,
        notifierNotificationStatus: "not_requested",
        authorNotificationStatus: "not_requested",
        notificationError: null,
      };
      return currentDecision;
    });
    updateDecisionStatesMock.mockImplementation(async (input) => {
      currentDecision = { ...currentDecision, ...input };
      return currentDecision;
    });
    updateDecisionNotificationsMock.mockResolvedValue(undefined);
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
    expect((await POST(request(validBody({ reason: "no" })))).status).toBe(400);
    expect(
      (
        await POST(
          request(
            validBody({
              action: "content_restricted",
              legalBasis: "Article 16 DSA",
              termsBasis: "CGU article 4",
            }),
          ),
        )
      ).status,
    ).toBe(400);
    expect((await POST(request(validBody({ action: "content_removed" })))).status).toBe(400);
    expect(appendDecisionMock).not.toHaveBeenCalled();
  });

  it("does not create a decision when no canonical capability exists", async () => {
    getLegalContentReportByIdMock.mockResolvedValueOnce({ ...baseReport, contentType: "profile" });

    const response = await POST(
      request(validBody({ action: "content_removed", legalBasis: "Article 16 DSA" })),
    );

    expect(response.status).toBe(409);
    expect(appendDecisionMock).not.toHaveBeenCalled();
    expect(applyCanonicalLegalContentMutationMock).not.toHaveBeenCalled();
  });

  it("marks a decision without mutation as not_applicable", async () => {
    const response = await POST(
      request(validBody({ action: "no_action", termsBasis: "Aucune clause des CGU ne justifie une mesure." })),
    );

    expect(response.status).toBe(200);
    expect(appendDecisionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "no_action",
        executionStatus: "not_applicable",
        executionErrorCode: null,
      }),
    );
    expect(updateDecisionStatesMock).not.toHaveBeenCalled();
    expect(sendAuthorMock).not.toHaveBeenCalled();
  });

  it("marks a missing action as failed and keeps the report state unchanged", async () => {
    applyCanonicalLegalContentMutationMock.mockResolvedValueOnce({
      supported: true,
      found: false,
      beforeState: {},
      afterState: {},
      authorEmail: "author@example.com",
    });

    const response = await POST(
      request(validBody({ action: "content_removed", legalBasis: "Article 16 DSA" })),
    );

    expect(response.status).toBe(500);
    expect(updateDecisionStatesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        executionStatus: "failed",
        executionErrorCode: "content_not_found",
      }),
    );
    expect(updateLegalContentReportStateMock).not.toHaveBeenCalled();
    expect(sendAuthorMock).not.toHaveBeenCalled();
  });

  it("marks a mutation exception as failed", async () => {
    applyCanonicalLegalContentMutationMock.mockRejectedValueOnce(new Error("provider failure"));

    const response = await POST(
      request(validBody({ action: "content_restricted", legalBasis: "Article 16 DSA" })),
    );

    expect(response.status).toBe(500);
    expect(updateDecisionStatesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        executionStatus: "failed",
        executionErrorCode: "mutation_failed",
      }),
    );
    expect(sendAuthorMock).not.toHaveBeenCalled();
  });

  it("marks a projection failure as failed without projecting the creator state", async () => {
    updateLegalContentReportStateMock.mockResolvedValueOnce(null);
    applyCanonicalLegalContentMutationMock.mockResolvedValueOnce({
      supported: true,
      found: true,
      beforeState: { source: "actions", moderationVisibility: "visible" },
      afterState: { source: "actions", moderationVisibility: "hidden" },
      authorEmail: "author@example.com",
    });

    const response = await POST(
      request(validBody({ action: "content_restricted", legalBasis: "Article 16 DSA" })),
    );

    expect(response.status).toBe(500);
    expect(updateDecisionStatesMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ executionStatus: "applied" }),
    );
    expect(updateDecisionStatesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        executionStatus: "failed",
        executionErrorCode: "projection_failed",
      }),
    );
    expect(sendAuthorMock).not.toHaveBeenCalled();
  });

  it("marks successful mutation as applied and then notifies the author", async () => {
    applyCanonicalLegalContentMutationMock.mockResolvedValueOnce({
      supported: true,
      found: true,
      beforeState: { source: "actions", moderationVisibility: "visible" },
      afterState: { source: "actions", moderationVisibility: "hidden" },
      authorEmail: "author@example.com",
    });

    const response = await POST(
      request(validBody({ action: "content_restricted", legalBasis: "Article 16 DSA" })),
    );

    expect(response.status).toBe(200);
    expect(appendDecisionMock).toHaveBeenCalledWith(
      expect.objectContaining({ executionStatus: "pending" }),
    );
    expect(updateDecisionStatesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        executionStatus: "applied",
        executionErrorCode: null,
      }),
    );
    expect(updateLegalContentReportStateMock).toHaveBeenCalledWith(
      expect.objectContaining({ creatorState: "content_restricted" }),
    );
    expect(sendAuthorMock).toHaveBeenCalledWith(
      expect.objectContaining({ authorEmail: "author@example.com" }),
    );
  });

  it("keeps the admin gate before every decision or mutation", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({ ok: false, status: 403, error: "Forbidden" });

    const response = await POST(request(validBody()));

    expect(response.status).toBe(403);
    expect(getLegalContentReportByIdMock).not.toHaveBeenCalled();
    expect(applyCanonicalLegalContentMutationMock).not.toHaveBeenCalled();
  });
});
