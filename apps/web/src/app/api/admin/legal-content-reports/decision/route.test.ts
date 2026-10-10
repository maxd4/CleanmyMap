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

function lastAuditDetails(): Record<string, unknown> {
  const call = appendAdminOperationAuditMock.mock.calls.at(-1)?.[0];
  return call?.details as Record<string, unknown>;
}

function expectInvariantAuditContext(
  details: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
) {
  expect(details).toMatchObject({
    action: "reviewing",
    origin: "received_notification",
    reason: "Examen administratif engagé.",
    automatedMeansUsed: false,
    legalBasis: null,
    termsBasis: null,
    contentUrl: baseReport.contentUrl,
    contentId: baseReport.contentId,
    ...overrides,
  });
}

function expectLastAudit(
  outcome: "success" | "error",
  details: Record<string, unknown>,
) {
  expect(appendAdminOperationAuditMock).toHaveBeenLastCalledWith(
    expect.objectContaining({
      outcome,
      details: expect.objectContaining(details),
    }),
  );
}

function expectContentMutationAudit(
  outcome: "success" | "error",
  details: Record<string, unknown>,
  contextOverrides: Record<string, unknown>,
) {
  expectLastAudit(outcome, details);
  expectInvariantAuditContext(lastAuditDetails(), contextOverrides);
}

function expectAppliedMutationAudit(outcome: "success" | "error", stage?: string) {
  expectContentMutationAudit(
    outcome,
    {
      ...(stage ? { stage } : {}),
      beforeState: expect.objectContaining({ moderationVisibility: "visible" }),
      afterState: expect.objectContaining({ moderationVisibility: "hidden" }),
      executionStatus: "applied",
      executionErrorCode: null,
      partialMutation: true,
    },
    {
      action: "content_restricted",
      legalBasis: "Article 16 DSA",
    },
  );
}

function mockSuccessfulContentMutation(authorEmail: string | null) {
  applyCanonicalLegalContentMutationMock.mockResolvedValueOnce({
    supported: true,
    found: true,
    beforeState: { source: "actions", moderationVisibility: "visible" },
    afterState: { source: "actions", moderationVisibility: "hidden" },
    authorEmail,
  });
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
    expectLastAudit("error", {
      stage: "capability_check",
      beforeState: expect.objectContaining({ creatorState: "new" }),
      afterState: expect.objectContaining({ creatorState: "new" }),
      executionStatus: "not_applicable",
      executionErrorCode: null,
      partialMutation: false,
    });
    expectInvariantAuditContext(lastAuditDetails(), {
      action: "content_removed",
      legalBasis: "Article 16 DSA",
    });
  });

  it("audits a non-mutative decision with the projected report state", async () => {
    const response = await POST(request(validBody()));

    expect(response.status).toBe(200);
    expect(appendDecisionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "reviewing",
        executionStatus: "not_applicable",
        executionErrorCode: null,
      }),
    );
    expect(applyCanonicalLegalContentMutationMock).not.toHaveBeenCalled();
    expect(updateLegalContentReportStateMock).toHaveBeenCalledWith({
      reportId: "report-1",
      creatorState: "reviewing",
    });
    expect(updateDecisionStatesMock).toHaveBeenCalledWith({
      decisionId: "decision-1",
      beforeState: expect.objectContaining({ creatorState: "new" }),
      afterState: expect.objectContaining({ creatorState: "reviewing" }),
      executionStatus: "not_applicable",
      executionErrorCode: null,
    });
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operationId: expect.any(String),
        actorUserId: "admin-1",
        operationType: "moderation",
        outcome: "success",
        targetId: "report-1",
        details: expect.objectContaining({
          action: "reviewing",
          origin: "received_notification",
          automatedMeansUsed: false,
          beforeState: expect.objectContaining({ creatorState: "new" }),
          afterState: expect.objectContaining({ creatorState: "reviewing" }),
          executionStatus: "not_applicable",
          executionErrorCode: null,
          partialMutation: false,
        }),
      }),
    );
    expect(sendNotifierMock).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: "admin-1" }));
    expect(sendAuthorMock).not.toHaveBeenCalled();
  });

  it("returns a partial result when decision state projection fails after report projection", async () => {
    updateDecisionStatesMock.mockRejectedValueOnce(new Error("decision projection unavailable"));

    const response = await POST(request(validBody()));

    expect(response.status).toBe(207);
    expect(applyCanonicalLegalContentMutationMock).not.toHaveBeenCalled();
    expect(updateLegalContentReportStateMock).toHaveBeenCalledWith(
      expect.objectContaining({ creatorState: "reviewing" }),
    );
    expect(updateDecisionStatesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        beforeState: expect.objectContaining({ creatorState: "new" }),
        afterState: expect.objectContaining({ creatorState: "reviewing" }),
        executionStatus: "not_applicable",
        executionErrorCode: null,
      }),
    );
    expectLastAudit("error", {
      stage: "decision_projection",
      beforeState: expect.objectContaining({ creatorState: "new" }),
      afterState: expect.objectContaining({ creatorState: "reviewing" }),
      executionStatus: "not_applicable",
      executionErrorCode: null,
      partialMutation: false,
    });
    expect(sendNotifierMock).toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      status: "partial",
      item: { status: "reviewing", executionStatus: "not_applicable" },
    });
  });

  it("fails explicitly when the non-mutative decision audit cannot be persisted", async () => {
    appendAdminOperationAuditMock.mockRejectedValueOnce(new Error("audit unavailable"));

    const response = await POST(request(validBody()));

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(sendNotifierMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: "Decision recorded but audit is incomplete.",
    });
  });

  it("audits a decision persistence failure with the unchanged report state", async () => {
    appendDecisionMock.mockRejectedValueOnce(new Error("decision persistence unavailable"));

    const response = await POST(request(validBody()));

    expect(response.status).toBe(500);
    expectLastAudit("error", {
      stage: "decision_persistence",
      beforeState: expect.objectContaining({ creatorState: "new" }),
      afterState: expect.objectContaining({ creatorState: "new" }),
      executionStatus: "not_applicable",
      executionErrorCode: null,
      partialMutation: false,
    });
    expectInvariantAuditContext(lastAuditDetails());
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
    expectLastAudit("error", {
      stage: "execution",
      beforeState: {},
      afterState: {},
      executionStatus: "failed",
      executionErrorCode: "content_not_found",
      partialMutation: false,
    });
    expectInvariantAuditContext(lastAuditDetails(), {
      action: "content_removed",
      legalBasis: "Article 16 DSA",
    });
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
    expectLastAudit("error", {
      stage: "execution",
      executionStatus: "failed",
      executionErrorCode: "mutation_failed",
      partialMutation: false,
    });
    expectInvariantAuditContext(lastAuditDetails(), {
      action: "content_restricted",
      legalBasis: "Article 16 DSA",
    });
    expect(sendAuthorMock).not.toHaveBeenCalled();
  });

  it("keeps the measure applied when report projection fails and returns a partial result", async () => {
    updateLegalContentReportStateMock.mockResolvedValueOnce(null);
    mockSuccessfulContentMutation("author@example.com");

    const response = await POST(
      request(validBody({ action: "content_restricted", legalBasis: "Article 16 DSA" })),
    );

    expect(response.status).toBe(207);
    expect(updateDecisionStatesMock).toHaveBeenCalledTimes(1);
    expect(updateDecisionStatesMock).toHaveBeenCalledWith(
      expect.objectContaining({ executionStatus: "applied" }),
    );
    expect(updateDecisionStatesMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        executionStatus: "failed",
        executionErrorCode: "projection_failed",
      }),
    );
    expect(updateLegalContentReportStateMock).toHaveBeenCalledWith(
      expect.objectContaining({ creatorState: "content_restricted" }),
    );
    expect(sendAuthorMock).toHaveBeenCalledWith(
      expect.objectContaining({ authorEmail: "author@example.com" }),
    );
    expectAppliedMutationAudit("error", "report_projection");
    await expect(response.json()).resolves.toMatchObject({
      status: "partial",
      item: { status: "new", executionStatus: "applied" },
    });
  });

  it("marks successful mutation as applied and then notifies the author", async () => {
    mockSuccessfulContentMutation("author@example.com");

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
    expect(applyCanonicalLegalContentMutationMock).toHaveBeenCalledTimes(1);
    expect(sendAuthorMock).toHaveBeenCalledWith(
      expect.objectContaining({ authorEmail: "author@example.com" }),
    );
    expectAppliedMutationAudit("success");
  });

  it("audits a notification failure with the applied decision state", async () => {
    sendNotifierMock.mockRejectedValueOnce(new Error("notifier unavailable"));

    const response = await POST(request(validBody()));

    expect(response.status).toBe(207);
    expect(updateDecisionNotificationsMock).toHaveBeenCalledWith({
      decisionId: "decision-1",
      notifierNotificationStatus: "failed",
      authorNotificationStatus: "not_requested",
      notificationError: "notifier",
    });
    expectLastAudit("error", {
      stage: "notification",
      beforeState: expect.objectContaining({ creatorState: "new" }),
      afterState: expect.objectContaining({ creatorState: "reviewing" }),
      executionStatus: "not_applicable",
      executionErrorCode: null,
      partialMutation: false,
      notificationError: "notifier",
    });
    expectInvariantAuditContext(lastAuditDetails());
  });

  it("rejects anonymous access before loading or mutating a report", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });

    const response = await POST(request(validBody()));

    expect(response.status).toBe(401);
    expect(getCurrentUserIdentityMock).not.toHaveBeenCalled();
    expect(getLegalContentReportByIdMock).not.toHaveBeenCalled();
    expect(applyCanonicalLegalContentMutationMock).not.toHaveBeenCalled();
  });

  it("keeps the non-admin gate before every decision or mutation", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({ ok: false, status: 403, error: "Forbidden" });

    const response = await POST(request(validBody()));

    expect(response.status).toBe(403);
    expect(getLegalContentReportByIdMock).not.toHaveBeenCalled();
    expect(applyCanonicalLegalContentMutationMock).not.toHaveBeenCalled();
  });
});
