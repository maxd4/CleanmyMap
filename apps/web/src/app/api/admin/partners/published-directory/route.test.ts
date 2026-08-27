import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());
const getPublishedPartnerAnnuaireEntryByIdMock = vi.hoisted(() => vi.fn());
const updatePublishedPartnerAnnuaireEntryPublicationStatusMock = vi.hoisted(
  () => vi.fn(),
);
const updatePartnerOnboardingRequestStatusMock = vi.hoisted(() => vi.fn());
const sendCreatorInboxEmailMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/admin/audit/operation-audit", () => ({
  appendAdminOperationAudit: appendAdminOperationAuditMock,
}));

vi.mock("@/lib/partners/published-annuaire-entries-store", () => ({
  getPublishedPartnerAnnuaireEntryById: getPublishedPartnerAnnuaireEntryByIdMock,
  updatePublishedPartnerAnnuaireEntryPublicationStatus:
    updatePublishedPartnerAnnuaireEntryPublicationStatusMock,
}));

vi.mock("@/lib/partners/onboarding-requests-store", () => ({
  updatePartnerOnboardingRequestStatus: updatePartnerOnboardingRequestStatusMock,
}));

vi.mock("@/lib/community/creator-inbox-email", () => ({
  sendCreatorInboxEmail: sendCreatorInboxEmailMock,
}));

const publishedEntry = {
  id: "onboarded-1",
  sourceRequestId: "request-1",
  name: "Partner record",
  legalIdentity: "Partner legal identity",
  publicationStatus: "pending_admin_review" as const,
  verificationStatus: "en_cours" as const,
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/admin/partners/published-directory", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function auditCalls() {
  return appendAdminOperationAuditMock.mock.calls.map(([call]) => call);
}

describe("POST /api/admin/partners/published-directory", () => {
  beforeEach(() => {
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
    getPublishedPartnerAnnuaireEntryByIdMock.mockResolvedValue(publishedEntry);
    updatePublishedPartnerAnnuaireEntryPublicationStatusMock.mockImplementation(
      async ({ publicationStatus }: { publicationStatus: "accepted" | "rejected" }) => ({
        ...publishedEntry,
        publicationStatus,
        verificationStatus: publicationStatus === "accepted" ? "verifie" : "a_revalider",
      }),
    );
    updatePartnerOnboardingRequestStatusMock.mockResolvedValue(undefined);
    sendCreatorInboxEmailMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([undefined, "nope"]) (
    "rejects an absent or short reason before mutation (%s)",
    async (reason) => {
      const { POST } = await import("./route");
      const response = await POST(
        request({
          id: "onboarded-1",
          publicationStatus: "accepted",
          confirmPhrase: "CONFIRMER PARTENAIRE",
          ...(reason === undefined ? {} : { reason }),
        }),
      );

      expect(response.status).toBe(400);
      expect(getPublishedPartnerAnnuaireEntryByIdMock).not.toHaveBeenCalled();
      expect(updatePublishedPartnerAnnuaireEntryPublicationStatusMock).not.toHaveBeenCalled();
      expect(updatePartnerOnboardingRequestStatusMock).not.toHaveBeenCalled();
    },
  );

  it("keeps malformed JSON, payload and confirmation audits under admin_operation", async () => {
    const { POST } = await import("./route");
    const invalidJsonResponse = await POST(
      new Request("http://localhost/api/admin/partners/published-directory", {
        method: "POST",
        body: "{",
      }),
    );
    expect(invalidJsonResponse.status).toBe(400);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "error",
      details: { operation: "review_partner_publication", reason: "invalid_json" },
    });

    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
    const invalidPayloadResponse = await POST(request({ id: "onboarded-1" }));
    expect(invalidPayloadResponse.status).toBe(400);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "error",
      details: { operation: "review_partner_publication", reason: "invalid_payload" },
    });

    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
    const confirmationResponse = await POST(
      request({
        id: "onboarded-1",
        publicationStatus: "rejected",
        reason: "Motif valide",
        confirmPhrase: "NON",
      }),
    );
    expect(confirmationResponse.status).toBe(409);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "error",
      details: { operation: "review_partner_publication", reason: "confirmation_required" },
    });
  });

  it("accepts with one success audit and exact before/after values", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      request({
        id: "onboarded-1",
        publicationStatus: "accepted",
        confirmPhrase: "CONFIRMER PARTENAIRE",
        reason: "Motif d'acceptation",
      }),
    );

    expect(response.status).toBe(200);
    expect(updatePublishedPartnerAnnuaireEntryPublicationStatusMock).toHaveBeenCalledWith({
      entryId: "onboarded-1",
      publicationStatus: "accepted",
      reviewedByUserId: "admin-1",
    });
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(auditCalls()[0]).toMatchObject({
      actorUserId: "admin-1",
      operationType: "admin_operation",
      outcome: "success",
      targetId: "onboarded-1",
      details: {
        operation: "review_partner_publication",
        reason: "Motif d'acceptation",
        sourceRequestId: "request-1",
        previousValue: {
          publicationStatus: "pending_admin_review",
          verificationStatus: "en_cours",
        },
        newValue: { publicationStatus: "accepted", verificationStatus: "verifie" },
      },
    });
    expect(auditCalls()[0].details).toEqual(
      expect.objectContaining({
        operation: "review_partner_publication",
        reason: "Motif d'acceptation",
      }),
    );
    expect(sendCreatorInboxEmailMock).toHaveBeenCalledTimes(1);
  });

  it("rejects with one admin_operation success audit and never changes Clerk", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      request({
        id: "onboarded-1",
        publicationStatus: "rejected",
        confirmPhrase: "CONFIRMER PARTENAIRE",
        reason: "Motif de refus",
      }),
    );

    expect(response.status).toBe(200);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "success",
      targetId: "onboarded-1",
      details: {
        operation: "review_partner_publication",
        reason: "Motif de refus",
        previousValue: {
          publicationStatus: "pending_admin_review",
          verificationStatus: "en_cours",
        },
        newValue: { publicationStatus: "rejected", verificationStatus: "a_revalider" },
      },
    });
  });

  it("does not change the business result when the secondary email fails", async () => {
    sendCreatorInboxEmailMock.mockRejectedValue(new Error("email failure"));
    const { POST } = await import("./route");

    const response = await POST(
      request({
        id: "onboarded-1",
        publicationStatus: "accepted",
        confirmPhrase: "CONFIRMER PARTENAIRE",
        reason: "Motif d'acceptation",
      }),
    );

    expect(response.status).toBe(200);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
  });

  it("writes an error audit when publication persistence fails", async () => {
    updatePublishedPartnerAnnuaireEntryPublicationStatusMock.mockRejectedValue(
      new Error("storage failure"),
    );
    const { POST } = await import("./route");

    const response = await POST(
      request({
        id: "onboarded-1",
        publicationStatus: "accepted",
        confirmPhrase: "CONFIRMER PARTENAIRE",
        reason: "Motif d'acceptation",
      }),
    );

    expect(response.status).toBe(500);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "error",
      targetId: "onboarded-1",
      details: {
        operation: "review_partner_publication",
        stage: "partner_update",
        partialMutation: false,
        previousValue: {
          publicationStatus: "pending_admin_review",
          verificationStatus: "en_cours",
        },
        newValue: { publicationStatus: "accepted", verificationStatus: "verifie" },
      },
    });
  });

  it("audits a source request sync failure as a partial mutation", async () => {
    const sourceSyncError = "source sync provider detail";
    updatePartnerOnboardingRequestStatusMock.mockRejectedValue(
      new Error(sourceSyncError),
    );
    const { POST } = await import("./route");

    const response = await POST(
      request({
        id: "onboarded-1",
        publicationStatus: "accepted",
        confirmPhrase: "CONFIRMER PARTENAIRE",
        reason: "Motif de synchronisation",
      }),
    );

    expect(response.status).toBe(500);
    expect(updatePublishedPartnerAnnuaireEntryPublicationStatusMock).toHaveBeenCalledTimes(1);
    expect(updatePartnerOnboardingRequestStatusMock).toHaveBeenCalledWith({
      requestId: "request-1",
      status: "accepted",
    });
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(auditCalls()[0]).toMatchObject({
      operationType: "admin_operation",
      outcome: "error",
      targetId: "onboarded-1",
      details: {
        operation: "review_partner_publication",
        reason: "Motif de synchronisation",
        sourceRequestId: "request-1",
        stage: "source_request_sync",
        partialMutation: true,
        previousValue: {
          publicationStatus: "pending_admin_review",
          verificationStatus: "en_cours",
        },
        newValue: { publicationStatus: "accepted", verificationStatus: "verifie" },
      },
    });
    expect(JSON.stringify(auditCalls()[0])).not.toContain(sourceSyncError);
    expect(sendCreatorInboxEmailMock).not.toHaveBeenCalled();
  });

  it("keeps PII and partner content out of audit details", async () => {
    const { POST } = await import("./route");
    await POST(
      request({
        id: "onboarded-1",
        publicationStatus: "accepted",
        confirmPhrase: "CONFIRMER PARTENAIRE",
        reason: "Motif d'acceptation",
      }),
    );

    const serializedAudit = JSON.stringify(auditCalls()[0]);
    expect(serializedAudit).not.toContain("Partner record");
    expect(serializedAudit).not.toContain("Partner legal identity");
    expect(serializedAudit).not.toContain("description");
    expect(serializedAudit).not.toContain("location");
    expect(Object.keys(auditCalls()[0].details)).toEqual([
      "operation",
      "reason",
      "sourceRequestId",
      "previousValue",
      "newValue",
    ]);
  });
});
