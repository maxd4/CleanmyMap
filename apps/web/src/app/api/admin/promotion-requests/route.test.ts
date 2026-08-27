import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserRoleLabelMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const getPromotionRequestByIdMock = vi.hoisted(() => vi.fn());
const listPromotionRequestsMock = vi.hoisted(() => vi.fn());
const updatePromotionRequestStatusMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());
const getUserMock = vi.hoisted(() => vi.fn());
const updateUserMock = vi.hoisted(() => vi.fn());
const syncClerkUserToSupabaseMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());
const sendCreatorInboxEmailMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: clerkClientMock,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserRoleLabel: getCurrentUserRoleLabelMock,
  getCurrentUserIdentity: getCurrentUserIdentityMock,
}));

vi.mock("@/lib/admin/promotion-requests-store", () => ({
  getPromotionRequestById: getPromotionRequestByIdMock,
  listPromotionRequests: listPromotionRequestsMock,
  updatePromotionRequestStatus: updatePromotionRequestStatusMock,
}));

vi.mock("@/lib/auth/sync", () => ({
  syncClerkUserToSupabase: syncClerkUserToSupabaseMock,
}));

vi.mock("@/lib/admin/audit/operation-audit", () => ({
  appendAdminOperationAudit: appendAdminOperationAuditMock,
}));

vi.mock("@/lib/community/creator-inbox-email", () => ({
  sendCreatorInboxEmail: sendCreatorInboxEmailMock,
}));

const requestRecord = {
  id: "promotion-1",
  createdAt: "2026-08-26T10:00:00.000Z",
  submittedByUserId: "target-user-1",
  submittedByDisplayName: "Demandeur",
  submittedByEmail: null,
  submittedByRole: "benevole" as const,
  requestedRole: "admin" as const,
  motivation: "Motivation privée de la demande",
  status: "pending_owner_review" as const,
  reviewedAt: null,
  reviewedByUserId: null,
  reviewedByRole: null,
  creatorState: "pending" as const,
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/promotion-requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeUpdated(status: "accepted" | "rejected") {
  return { ...requestRecord, status, creatorState: status };
}

describe("GET/POST /api/admin/promotion-requests", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getCurrentUserRoleLabelMock.mockResolvedValue("max");
    getCurrentUserIdentityMock.mockResolvedValue({
      userId: "reviewer-1",
      displayName: "Reviewer",
      role: "max",
    });
    getPromotionRequestByIdMock.mockResolvedValue(requestRecord);
    listPromotionRequestsMock.mockResolvedValue([requestRecord]);
    updatePromotionRequestStatusMock.mockImplementation(async ({ status }) => makeUpdated(status));
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: getUserMock,
        updateUser: updateUserMock,
      },
    });
    getUserMock.mockResolvedValue({
      id: "target-user-1",
      publicMetadata: { role: "coordinateur" },
      privateMetadata: { role: "benevole" },
    });
    updateUserMock.mockResolvedValue({
      id: "target-user-1",
      publicMetadata: { role: "admin", profile: "admin" },
      privateMetadata: { role: "admin", profile: "admin" },
    });
    syncClerkUserToSupabaseMock.mockResolvedValue({ id: "target-user-1" });
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
    sendCreatorInboxEmailMock.mockResolvedValue(undefined);
  });

  it("keeps GET unchanged", async () => {
    const { GET } = await import("./route");
    const response = await GET();
    const body = (await response.json()) as { status?: string; count?: number; items?: unknown[] };

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok", count: 1, items: [requestRecord] });
    expect(listPromotionRequestsMock).toHaveBeenCalledWith(200);
    expect(getPromotionRequestByIdMock).not.toHaveBeenCalled();
  });

  it.each([
    ["accept", undefined],
    ["accept", "nope"],
    ["reject", undefined],
    ["reject", "nope"],
    ["reject", "    "],
  ] as const)(
    "rejects an absent or short reason before any mutation (%s, %s)",
    async (action, reason) => {
      const { POST } = await import("./route");
      const response = await POST(
        makeRequest({
          requestId: requestRecord.id,
          action,
          ...(reason === undefined ? {} : { reason }),
        }),
      );

      expect(response.status).toBe(400);
      expect(getPromotionRequestByIdMock).not.toHaveBeenCalled();
      expect(getUserMock).not.toHaveBeenCalled();
      expect(updateUserMock).not.toHaveBeenCalled();
      expect(syncClerkUserToSupabaseMock).not.toHaveBeenCalled();
      expect(updatePromotionRequestStatusMock).not.toHaveBeenCalled();
      expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
    },
  );

  it("accepts with the canonical Clerk role and one role-management audit", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        requestId: requestRecord.id,
        action: "accept",
        reason: "  Validated after owner review  ",
      }),
    );

    expect(response.status).toBe(200);
    expect(updateUserMock).toHaveBeenCalledWith(
      "target-user-1",
      expect.objectContaining({
        publicMetadata: expect.objectContaining({ role: "admin", profile: "admin" }),
        privateMetadata: expect.objectContaining({ role: "admin", profile: "admin" }),
      }),
    );
    expect(syncClerkUserToSupabaseMock).toHaveBeenCalledTimes(1);
    expect(updatePromotionRequestStatusMock).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: requestRecord.id, status: "accepted" }),
    );
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "reviewer-1",
        targetId: requestRecord.id,
        operationType: "role_management",
        outcome: "success",
        details: {
          operation: "accept_promotion_request",
          reason: "Validated after owner review",
          targetUserId: "target-user-1",
          requestedRole: "admin",
          previousValue: { role: "coordinateur", requestStatus: "pending_owner_review" },
          newValue: { role: "admin", requestStatus: "accepted" },
        },
      }),
    );
    expect(sendCreatorInboxEmailMock).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0]?.[0])).not.toContain(
      requestRecord.submittedByDisplayName,
    );
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0]?.[0])).not.toContain(
      requestRecord.motivation,
    );
  });

  it("rejects without touching Clerk and writes one admin-operation audit", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        requestId: requestRecord.id,
        action: "reject",
        reason: "Not enough evidence",
      }),
    );

    expect(response.status).toBe(200);
    expect(clerkClientMock).not.toHaveBeenCalled();
    expect(getUserMock).not.toHaveBeenCalled();
    expect(updateUserMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operationType: "admin_operation",
        outcome: "success",
        targetId: requestRecord.id,
        details: {
          operation: "reject_promotion_request",
          reason: "Not enough evidence",
          targetUserId: "target-user-1",
          requestedRole: "admin",
          previousValue: { requestStatus: "pending_owner_review" },
          newValue: { requestStatus: "rejected" },
        },
      }),
    );
  });

  it("keeps the decision successful when the secondary email fails", async () => {
    sendCreatorInboxEmailMock.mockRejectedValueOnce(new Error("email provider detail"));
    const { POST } = await import("./route");

    const response = await POST(
      makeRequest({
        requestId: requestRecord.id,
        action: "reject",
        reason: "Request does not meet criteria",
      }),
    );

    expect(response.status).toBe(200);
    expect(updatePromotionRequestStatusMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["clerk_lookup", () => getUserMock.mockRejectedValueOnce(new Error("Clerk detail"))],
    ["clerk_update", () => updateUserMock.mockRejectedValueOnce(new Error("Clerk detail"))],
    ["supabase_sync", () => syncClerkUserToSupabaseMock.mockRejectedValueOnce(new Error("Supabase detail"))],
    ["request_status_update", () => updatePromotionRequestStatusMock.mockRejectedValueOnce(new Error("Store detail"))],
  ] as const)("audits %s failures without exposing the external error", async (stage, configureFailure) => {
    configureFailure();
    const { POST } = await import("./route");

    const response = await POST(
      makeRequest({
        requestId: requestRecord.id,
        action: "accept",
        reason: "Decision failure test",
      }),
    );

    expect(response.status).toBe(500);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operationType: "role_management",
        outcome: "error",
        targetId: requestRecord.id,
        details: expect.objectContaining({
          stage,
          targetUserId: "target-user-1",
          requestedRole: "admin",
          previousValue: {
            role: stage === "clerk_lookup" ? "unknown" : "coordinateur",
            requestStatus: "pending_owner_review",
          },
          newValue: { role: "admin", requestStatus: "accepted" },
        }),
      }),
    );
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "Clerk detail",
    );
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "Supabase detail",
    );
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "Store detail",
    );
  });

  it("audits reject status failures and never calls Clerk", async () => {
    updatePromotionRequestStatusMock.mockRejectedValueOnce(new Error("Store detail"));
    const { POST } = await import("./route");

    const response = await POST(
      makeRequest({
        requestId: requestRecord.id,
        action: "reject",
        reason: "Reject status failure",
      }),
    );

    expect(response.status).toBe(500);
    expect(clerkClientMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operationType: "admin_operation",
        outcome: "error",
        details: {
          operation: "reject_promotion_request",
          reason: "Reject status failure",
          targetUserId: "target-user-1",
          requestedRole: "admin",
          previousValue: { requestStatus: "pending_owner_review" },
          newValue: { requestStatus: "rejected" },
          stage: "request_status_update",
        },
      }),
    );
  });
});
