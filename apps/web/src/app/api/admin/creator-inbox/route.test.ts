import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireCreatorAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());
const getCommunityBugReportByIdMock = vi.hoisted(() => vi.fn());
const updateCommunityBugReportStatusMock = vi.hoisted(() => vi.fn());
const qualifyCommunityBugReportMock = vi.hoisted(() => vi.fn());
const updateCommunityBugReportTrackingMock = vi.hoisted(() => vi.fn());
const updateCommunityBugReportCreatorStateMock = vi.hoisted(() => vi.fn());
const getPromotionRequestByIdMock = vi.hoisted(() => vi.fn());
const updatePromotionRequestCreatorStateMock = vi.hoisted(() => vi.fn());
const getPartnerOnboardingRequestByIdMock = vi.hoisted(() => vi.fn());
const updatePartnerOnboardingRequestCreatorStateMock = vi.hoisted(() => vi.fn());
const deleteCommunityBugReportMock = vi.hoisted(() => vi.fn());
const deletePartnerOnboardingRequestMock = vi.hoisted(() => vi.fn());
const buildFeedbackInboxItemMock = vi.hoisted(() => vi.fn());
const buildPromotionInboxItemMock = vi.hoisted(() => vi.fn());
const buildPartnerInboxItemMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireCreatorAccess: requireCreatorAccessMock,
  requireAdminAccess: requireCreatorAccessMock,
  getCurrentUserIdentity: getCurrentUserIdentityMock,
}));

vi.mock("@/lib/env", () => ({
  env: { CLERK_IMU_OWNER_USER_ID: "max-owner" },
}));

vi.mock("@/lib/admin/audit/operation-audit", () => ({
  appendAdminOperationAudit: appendAdminOperationAuditMock,
}));

vi.mock("@/lib/community/bug-reports-store", () => ({
  deleteCommunityBugReport: deleteCommunityBugReportMock,
  getCommunityBugReportById: getCommunityBugReportByIdMock,
  updateCommunityBugReportCreatorState: updateCommunityBugReportCreatorStateMock,
  updateCommunityBugReportStatus: updateCommunityBugReportStatusMock,
  qualifyCommunityBugReport: qualifyCommunityBugReportMock,
  updateCommunityBugReportTracking: updateCommunityBugReportTrackingMock,
}));

vi.mock("@/lib/admin/promotion-requests-store", () => ({
  getPromotionRequestById: getPromotionRequestByIdMock,
  updatePromotionRequestCreatorState: updatePromotionRequestCreatorStateMock,
}));

vi.mock("@/lib/partners/onboarding-requests-store", () => ({
  deletePartnerOnboardingRequest: deletePartnerOnboardingRequestMock,
  getPartnerOnboardingRequestById: getPartnerOnboardingRequestByIdMock,
  updatePartnerOnboardingRequestCreatorState:
    updatePartnerOnboardingRequestCreatorStateMock,
}));

vi.mock("@/lib/community/creator-inbox", () => ({
  buildFeedbackInboxItem: buildFeedbackInboxItemMock,
  buildPartnerInboxItem: buildPartnerInboxItemMock,
  buildPromotionInboxItem: buildPromotionInboxItemMock,
}));

const loadCreatorInboxPageMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/community/creator-inbox-loader", () => ({
  loadCreatorInboxPage: loadCreatorInboxPageMock,
  parseCreatorInboxPageCursor: vi.fn(() => ({
    feedback: null,
    promotion: null,
    partner: null,
    legal_content_report: null,
    event: null,
  })),
}));

const feedbackRecord = {
  id: "feedback-1",
  submittedByUserId: "user-1",
  submittedByDisplayName: "Display name",
  submittedByEmail: "person@example.com",
  title: "Message title",
  description: "Message content",
  status: "open" as const,
  creatorState: "new" as const,
};

const promotionRecord = {
  id: "promotion-1",
  submittedByUserId: "promotion-user-1",
  status: "pending_owner_review" as const,
  creatorState: "pending" as const,
};

const partnerRecord = {
  id: "partner-1",
  submittedByUserId: "partner-user-1",
  status: "pending_admin_review" as const,
  creatorState: "pending" as const,
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/creator-inbox", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function auditCalls() {
  return appendAdminOperationAuditMock.mock.calls.map(([call]) => call);
}

describe("PATCH /api/admin/creator-inbox", () => {
  beforeEach(() => {
    requireCreatorAccessMock.mockResolvedValue({ ok: true, userId: "reviewer-1" });
    getCurrentUserIdentityMock.mockResolvedValue({
      userId: "reviewer-1",
      role: "max",
    });
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
    getCommunityBugReportByIdMock.mockResolvedValue(feedbackRecord);
    updateCommunityBugReportCreatorStateMock.mockImplementation(
      async ({ creatorState }: { creatorState: "responded" | "archived" }) => ({
        ...feedbackRecord,
        creatorState,
      }),
    );
    updateCommunityBugReportStatusMock.mockImplementation(
      async ({ status }: { status: "treated" | "archived" }) => ({
        ...feedbackRecord,
        status,
        creatorState: status === "treated" ? "treated" : "archived",
      }),
    );
    qualifyCommunityBugReportMock.mockResolvedValue({
      status: "updated",
      record: {
        ...feedbackRecord,
        id: "550e8400-e29b-41d4-a716-446655440000",
        qualificationStatus: "accepted",
        qualificationReason: "Retour pertinent.",
        qualificationDecidedAt: "2026-10-16T12:00:00.000Z",
        qualificationDecidedByUserId: "max-owner",
        qualificationDuplicateFeedbackId: null,
      },
    });
    updateCommunityBugReportTrackingMock.mockResolvedValue({
      status: "updated",
      record: {
        ...feedbackRecord,
        tracking: {
          status: "shipped",
          publicSummary: "Correction livrée.",
          reference: "2026.10",
          shippedOn: "2026-10-16",
          shippedNotificationAt: "2026-10-16T12:00:00.000Z",
          updatedAt: "2026-10-16T12:00:00.000Z",
          updatedByUserId: "max-owner",
        },
      },
    });
    getPromotionRequestByIdMock.mockResolvedValue(promotionRecord);
    updatePromotionRequestCreatorStateMock.mockImplementation(
      async ({ creatorState }: { creatorState: string }) => ({
        ...promotionRecord,
        creatorState,
      }),
    );
    getPartnerOnboardingRequestByIdMock.mockResolvedValue(partnerRecord);
    updatePartnerOnboardingRequestCreatorStateMock.mockImplementation(
      async ({ creatorState }: { creatorState: string }) => ({
        ...partnerRecord,
        creatorState,
      }),
    );
    deleteCommunityBugReportMock.mockResolvedValue(true);
    deletePartnerOnboardingRequestMock.mockResolvedValue(true);
    buildFeedbackInboxItemMock.mockReturnValue({ id: "feedback-1" });
    buildPromotionInboxItemMock.mockReturnValue({ id: "promotion-1" });
    buildPartnerInboxItemMock.mockReturnValue({ id: "partner-1" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each(["mark_treated", "responded", "archive"] as const)(
    "rejects %s without a valid reason before mutation",
    async (action) => {
      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({ source: "feedback", itemId: "feedback-1", action }),
      );

      expect(response.status).toBe(400);
      expect(getCommunityBugReportByIdMock).not.toHaveBeenCalled();
      expect(updateCommunityBugReportStatusMock).not.toHaveBeenCalled();
      expect(updateCommunityBugReportCreatorStateMock).not.toHaveBeenCalled();
      expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
    },
  );

  it.each(["", "nope", "    "])(
    "rejects a short reason before mutation (%s)",
    async (reason) => {
      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({
          source: "feedback",
          itemId: "feedback-1",
          action: "mark_treated",
          reason,
        }),
      );

      expect(response.status).toBe(400);
      expect(getCommunityBugReportByIdMock).not.toHaveBeenCalled();
      expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
    },
  );

  it("audits feedback mark_treated with one success and canonical targetUserId", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({
        source: "feedback",
        itemId: "feedback-1",
        action: "mark_treated",
        reason: "  Traitement terminé  ",
      }),
    );

    expect(response.status).toBe(200);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(auditCalls()[0]).toMatchObject({
      actorUserId: "reviewer-1",
      operationType: "admin_operation",
      outcome: "success",
      targetId: "feedback-1",
      details: {
        operation: "creator_inbox_update",
        reason: "Traitement terminé",
        targetUserId: "user-1",
        previousValue: {
          source: "feedback",
          status: "open",
          creatorState: "new",
        },
        newValue: {
          source: "feedback",
          status: "treated",
          creatorState: "treated",
        },
      },
    });
    expect(Object.keys(auditCalls()[0].details)).toEqual([
      "operation",
      "reason",
      "targetUserId",
      "previousValue",
      "newValue",
    ]);
  });

  it("audits promotion and partner creator-state changes without changing source status", async () => {
    const { PATCH } = await import("./route");
    const promotionResponse = await PATCH(
      makeRequest({
        source: "promotion",
        itemId: "promotion-1",
        action: "responded",
        reason: "Réponse enregistrée",
      }),
    );
    expect(promotionResponse.status).toBe(200);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "success",
      details: {
        previousValue: {
          source: "promotion",
          status: "pending_owner_review",
          creatorState: "pending",
        },
        newValue: {
          source: "promotion",
          status: "pending_owner_review",
          creatorState: "responded",
        },
      },
    });

    vi.clearAllMocks();
    requireCreatorAccessMock.mockResolvedValue({ ok: true, userId: "reviewer-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ userId: "reviewer-1" });
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
    const partnerResponse = await PATCH(
      makeRequest({
        source: "partner",
        itemId: "partner-1",
        action: "archive",
        reason: "Dossier archivé",
      }),
    );
    expect(partnerResponse.status).toBe(200);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "success",
      details: {
        previousValue: {
          source: "partner",
          status: "pending_admin_review",
          creatorState: "pending",
        },
        newValue: {
          source: "partner",
          status: "pending_admin_review",
          creatorState: "archived",
        },
      },
    });
  });

  it("archives feedback with one canonical status mutation", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({
        source: "feedback",
        itemId: "feedback-1",
        action: "archive",
        reason: "Archivage demandé",
      }),
    );

    expect(response.status).toBe(200);
    expect(updateCommunityBugReportStatusMock).toHaveBeenCalledTimes(1);
    expect(updateCommunityBugReportStatusMock).toHaveBeenCalledWith({
      reportId: "feedback-1",
      status: "archived",
    });
    expect(updateCommunityBugReportCreatorStateMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "success",
      details: {
        previousValue: {
          source: "feedback",
          status: "open",
          creatorState: "new",
        },
        newValue: {
          source: "feedback",
          status: "archived",
          creatorState: "archived",
        },
      },
    });
  });

  it("audits feedback archive persistence failure without claiming a partial mutation", async () => {
    const statusError = "status persistence detail";
    updateCommunityBugReportStatusMock.mockRejectedValueOnce(new Error(statusError));
    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({
        source: "feedback",
        itemId: "feedback-1",
        action: "archive",
        reason: "Archivage demandé",
      }),
    );

    expect(response.status).toBe(500);
    expect(updateCommunityBugReportCreatorStateMock).not.toHaveBeenCalled();
    expect(updateCommunityBugReportStatusMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "error",
      details: {
        stage: "update",
        partialMutation: false,
      },
    });
    expect(JSON.stringify(auditCalls()[0])).not.toContain(statusError);
  });

  it("does not claim feedback archive success when the canonical mutation returns no record", async () => {
    updateCommunityBugReportStatusMock.mockResolvedValueOnce(null);
    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({
        source: "feedback",
        itemId: "feedback-1",
        action: "archive",
        reason: "Archivage demandé",
      }),
    );

    expect(response.status).toBe(500);
    expect(updateCommunityBugReportCreatorStateMock).not.toHaveBeenCalled();
    expect(updateCommunityBugReportStatusMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "error",
      details: {
        operation: "creator_inbox_update",
        reason: "Archivage demandé",
        targetUserId: "user-1",
        stage: "update",
        partialMutation: false,
        previousValue: {
          source: "feedback",
          status: "open",
          creatorState: "new",
        },
        newValue: {
          source: "feedback",
          status: "archived",
          creatorState: "archived",
        },
      },
    });
    expect(JSON.stringify(auditCalls()[0])).not.toContain("Display name");
    expect(JSON.stringify(auditCalls()[0])).not.toContain("person@example.com");
    expect(JSON.stringify(auditCalls()[0])).not.toContain("Message content");
  });

  it("audits feedback delete success with a minimal before value", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({
        source: "feedback",
        itemId: "feedback-1",
        action: "delete",
        reason: "Suppression confirmée",
      }),
    );

    expect(response.status).toBe(200);
    expect(deleteCommunityBugReportMock).toHaveBeenCalledWith("feedback-1");
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "success",
      targetId: "feedback-1",
      details: {
        operation: "creator_inbox_update",
        reason: "Suppression confirmée",
        targetUserId: "user-1",
        previousValue: { source: "feedback", creatorState: "new" },
        newValue: { deleted: true },
      },
    });
    expect(Object.keys(auditCalls()[0].details)).toEqual([
      "operation",
      "reason",
      "targetUserId",
      "previousValue",
      "newValue",
    ]);
    expect(JSON.stringify(auditCalls()[0])).not.toContain("Display name");
    expect(JSON.stringify(auditCalls()[0])).not.toContain("person@example.com");
    expect(JSON.stringify(auditCalls()[0])).not.toContain("Message content");
  });

  it("audits partner delete success with a minimal before value", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({
        source: "partner",
        itemId: "partner-1",
        action: "delete",
        reason: "Dossier supprimé",
      }),
    );

    expect(response.status).toBe(200);
    expect(deletePartnerOnboardingRequestMock).toHaveBeenCalledWith("partner-1");
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "success",
      targetId: "partner-1",
      details: {
        operation: "creator_inbox_update",
        reason: "Dossier supprimé",
        targetUserId: "partner-user-1",
        previousValue: { source: "partner", creatorState: "pending" },
        newValue: { deleted: true },
      },
    });
    expect(Object.keys(auditCalls()[0].details)).toEqual([
      "operation",
      "reason",
      "targetUserId",
      "previousValue",
      "newValue",
    ]);
  });

  it.each([
    ["feedback", "feedback-1"],
    ["partner", "partner-1"],
  ] as const)("audits an identified %s delete returning false as a 404", async (source, itemId) => {
    if (source === "feedback") {
      deleteCommunityBugReportMock.mockResolvedValueOnce(false);
    } else {
      deletePartnerOnboardingRequestMock.mockResolvedValueOnce(false);
    }

    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({ source, itemId, action: "delete", reason: "Suppression introuvable" }),
    );

    expect(response.status).toBe(404);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "error",
      targetId: itemId,
      details: {
        operation: "creator_inbox_update",
        reason: "Suppression introuvable",
        stage: "delete",
        partialMutation: false,
        previousValue: {
          source,
          creatorState: source === "feedback" ? "new" : "pending",
        },
        newValue: { source },
      },
    });
    expect(JSON.stringify(auditCalls()[0])).not.toContain("Display name");
    expect(JSON.stringify(auditCalls()[0])).not.toContain("person@example.com");
    expect(JSON.stringify(auditCalls()[0])).not.toContain("Message content");
  });

  it.each([
    ["feedback", "feedback-1"],
    ["promotion", "promotion-1"],
    ["partner", "partner-1"],
  ] as const)("audits an identified missing %s item as lookup error", async (source, itemId) => {
    if (source === "feedback") {
      getCommunityBugReportByIdMock.mockResolvedValueOnce(null);
    } else if (source === "promotion") {
      getPromotionRequestByIdMock.mockResolvedValueOnce(null);
    } else {
      getPartnerOnboardingRequestByIdMock.mockResolvedValueOnce(null);
    }

    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({ source, itemId, action: "responded", reason: "Recherche ciblée" }),
    );

    expect(response.status).toBe(404);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "error",
      targetId: itemId,
      details: {
        operation: "creator_inbox_update",
        stage: "lookup",
        partialMutation: false,
        previousValue: { source, status: "unknown", creatorState: "unknown" },
        newValue: { source, status: "unknown", creatorState: "unknown" },
      },
    });
  });

  it("keeps accepted partner deletion forbidden and audited without mutation", async () => {
    getPartnerOnboardingRequestByIdMock.mockResolvedValueOnce({
      ...partnerRecord,
      status: "accepted",
      creatorState: "accepted",
    });
    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({
        source: "partner",
        itemId: "partner-1",
        action: "delete",
        reason: "Suppression refusée",
      }),
    );

    expect(response.status).toBe(409);
    expect(deletePartnerOnboardingRequestMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "error",
      targetId: "partner-1",
      details: {
        stage: "delete",
        partialMutation: false,
        previousValue: {
          source: "partner",
          status: "accepted",
          creatorState: "accepted",
        },
        newValue: {
          source: "partner",
          status: "accepted",
          creatorState: "accepted",
        },
      },
    });
  });

  it("keeps promotion deletion forbidden and audited without mutation", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({
        source: "promotion",
        itemId: "promotion-1",
        action: "delete",
        reason: "Suppression refusée",
      }),
    );

    expect(response.status).toBe(409);
    expect(getPromotionRequestByIdMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "error",
      targetId: "promotion-1",
      details: { stage: "delete", partialMutation: false },
    });
  });

  it.each([
    ["feedback", "feedback-1"],
    ["partner", "partner-1"],
  ] as const)("audits delete persistence failure for %s", async (source, itemId) => {
    if (source === "feedback") {
      deleteCommunityBugReportMock.mockRejectedValueOnce(new Error("delete provider detail"));
    } else {
      deletePartnerOnboardingRequestMock.mockRejectedValueOnce(new Error("delete provider detail"));
    }

    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({ source, itemId, action: "delete", reason: "Suppression échouée" }),
    );

    expect(response.status).toBe(500);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "error",
      details: { stage: "delete", partialMutation: false },
    });
    expect(JSON.stringify(auditCalls()[0])).not.toContain("delete provider detail");
  });

  it.each([
    ["feedback", "feedback-1"],
    ["partner", "partner-1"],
  ] as const)("audits lookup failure for %s without raw error data", async (source, itemId) => {
    const lookupError = "private lookup provider detail";
    if (source === "feedback") {
      getCommunityBugReportByIdMock.mockRejectedValueOnce(new Error(lookupError));
    } else {
      getPartnerOnboardingRequestByIdMock.mockRejectedValueOnce(new Error(lookupError));
    }

    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({ source, itemId, action: "delete", reason: "Lookup en erreur" }),
    );

    expect(response.status).toBe(500);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "error",
      targetId: itemId,
      details: {
        stage: "lookup",
        partialMutation: false,
        previousValue: { source, status: "unknown", creatorState: "unknown" },
        newValue: { source, status: "unknown", creatorState: "unknown" },
      },
    });
    expect(JSON.stringify(auditCalls()[0])).not.toContain(lookupError);
  });

  it.each([
    ["promotion", "promotion-1"],
    ["partner", "partner-1"],
  ] as const)("audits creator-state update failure for %s", async (source, itemId) => {
    const updateError = "private update provider detail";
    if (source === "promotion") {
      updatePromotionRequestCreatorStateMock.mockRejectedValueOnce(new Error(updateError));
    } else {
      updatePartnerOnboardingRequestCreatorStateMock.mockRejectedValueOnce(new Error(updateError));
    }

    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({
        source,
        itemId,
        action: "responded",
        reason: "Mise à jour en erreur",
      }),
    );

    expect(response.status).toBe(500);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "error",
      targetId: itemId,
      details: {
        stage: "update",
        partialMutation: false,
      },
    });
    expect(JSON.stringify(auditCalls()[0])).not.toContain(updateError);
  });

  it("does not let a direct responded action mark feedback answered", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({
        source: "feedback",
        itemId: "feedback-1",
        action: "responded",
        reason: "Réponse prétendue",
      }),
    );

    expect(response.status).toBe(409);
    expect(updateCommunityBugReportCreatorStateMock).not.toHaveBeenCalled();
    expect(auditCalls()[0].details).toMatchObject({
      previousValue: { creatorState: "new" },
      newValue: { creatorState: "new" },
    });
  });

  it("refuses creator inbox access when the caller is not an administrator", async () => {
    requireCreatorAccessMock.mockResolvedValueOnce({ ok: false, status: 403 });
    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({
        source: "feedback",
        itemId: "feedback-1",
        action: "mark_treated",
        reason: "Traitement refusé",
      }),
    );

    expect(response.status).toBe(403);
    expect(getCommunityBugReportByIdMock).not.toHaveBeenCalled();
  });

  it("allows only the canonical max identity to qualify feedback", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "max-owner",
      role: "max",
      activeRole: "max",
    });
    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({
        source: "feedback",
        itemId: "550e8400-e29b-41d4-a716-446655440000",
        action: "qualify",
        decision: "accepted",
      }),
    );

    expect(response.status).toBe(200);
    expect(qualifyCommunityBugReportMock).toHaveBeenCalledWith({
      reportId: "550e8400-e29b-41d4-a716-446655440000",
      decision: "accepted",
      reason: null,
      duplicateFeedbackId: null,
      actorUserId: "max-owner",
      operationId: expect.any(String),
    });
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
  });

  it.each([
    { role: "admin", activeRole: "admin" },
    { role: "max", activeRole: "max", userId: "other-user" },
  ] as const)("rejects a non-canonical qualification actor: $role/$userId", async (actor) => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: actor.userId ?? "admin-user",
      role: actor.role,
      activeRole: actor.activeRole,
    });
    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({
        source: "feedback",
        itemId: "550e8400-e29b-41d4-a716-446655440000",
        action: "qualify",
        decision: "accepted",
      }),
    );

    expect(response.status).toBe(403);
    expect(qualifyCommunityBugReportMock).not.toHaveBeenCalled();
    expect(getCommunityBugReportByIdMock).not.toHaveBeenCalled();
  });

  it("requires a reason and duplicate reference for a duplicate decision", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "max-owner",
      role: "max",
      activeRole: "max",
    });
    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({
        source: "feedback",
        itemId: "550e8400-e29b-41d4-a716-446655440000",
        action: "qualify",
        decision: "duplicate",
        reason: "court",
      }),
    );

    expect(response.status).toBe(400);
    expect(qualifyCommunityBugReportMock).not.toHaveBeenCalled();
  });

  it("returns an explicit error when the transactional qualification fails", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "max-owner",
      role: "max",
      activeRole: "max",
    });
    qualifyCommunityBugReportMock.mockRejectedValueOnce(new Error("database failure"));
    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({
        source: "feedback",
        itemId: "550e8400-e29b-41d4-a716-446655440000",
        action: "qualify",
        decision: "accepted",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to update creator inbox item.",
    });
  });

  it("returns a bounded page and its continuation cursor for administrators", async () => {
    loadCreatorInboxPageMock.mockResolvedValueOnce({
      items: [{ id: "feedback-1" }],
      count: 1,
      hasMore: true,
      nextCursor: "next-page",
    });
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/admin/creator-inbox?limit=2"),
    );

    expect(response.status).toBe(200);
    expect(loadCreatorInboxPageMock).toHaveBeenCalledWith({
      limit: 2,
      cursor: {
        feedback: null,
        promotion: null,
        partner: null,
        legal_content_report: null,
        event: null,
      },
    });
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      count: 1,
      hasMore: true,
      nextCursor: "next-page",
    });
  });

  it("allows only the canonical max identity to update product tracking", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "max-owner",
      role: "max",
      activeRole: "max",
    });
    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({
        source: "feedback",
        itemId: "feedback-1",
        action: "update_tracking",
        trackingStatus: "shipped",
        trackingPublicSummary: "Correction livrée.",
        trackingReference: "2026.10",
        trackingShippedOn: "2026-10-16",
      }),
    );

    expect(response.status).toBe(200);
    expect(updateCommunityBugReportTrackingMock).toHaveBeenCalledWith(expect.objectContaining({
      reportId: "feedback-1",
      trackingStatus: "shipped",
      publicSummary: "Correction livrée.",
      shippedOn: "2026-10-16",
      actorUserId: "max-owner",
    }));
  });

  it("rejects tracking updates from a non-canonical administrator", async () => {
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      userId: "admin-1",
      role: "admin",
      activeRole: "admin",
    });
    const { PATCH } = await import("./route");
    const response = await PATCH(
      makeRequest({
        source: "feedback",
        itemId: "feedback-1",
        action: "update_tracking",
        trackingStatus: "planned",
      }),
    );

    expect(response.status).toBe(403);
    expect(updateCommunityBugReportTrackingMock).not.toHaveBeenCalled();
  });

  it("rejects malformed page sizes instead of reading a misleading page", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/admin/creator-inbox?limit=not-a-number"),
    );

    expect(response.status).toBe(400);
    expect(loadCreatorInboxPageMock).not.toHaveBeenCalled();
  });

  it("refuses paginated inbox reads without administrator access", async () => {
    requireCreatorAccessMock.mockResolvedValueOnce({ ok: false, status: 403 });
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/admin/creator-inbox?limit=2"),
    );

    expect(response.status).toBe(403);
    expect(loadCreatorInboxPageMock).not.toHaveBeenCalled();
  });
});
