import { vi } from "vitest";

const creatorInboxMocks = vi.hoisted(() => ({
  requireCreatorAccessMock: vi.fn(),
  getCurrentUserIdentityMock: vi.fn(),
  appendAdminOperationAuditMock: vi.fn(),
  getCommunityBugReportByIdMock: vi.fn(),
  updateCommunityBugReportStatusMock: vi.fn(),
  qualifyCommunityBugReportMock: vi.fn(),
  updateCommunityBugReportTrackingMock: vi.fn(),
  updateCommunityBugReportCreatorStateMock: vi.fn(),
  getPromotionRequestByIdMock: vi.fn(),
  updatePromotionRequestCreatorStateMock: vi.fn(),
  getPartnerOnboardingRequestByIdMock: vi.fn(),
  updatePartnerOnboardingRequestCreatorStateMock: vi.fn(),
  deleteCommunityBugReportMock: vi.fn(),
  deletePartnerOnboardingRequestMock: vi.fn(),
  buildFeedbackInboxItemMock: vi.fn(),
  buildPromotionInboxItemMock: vi.fn(),
  buildPartnerInboxItemMock: vi.fn(),
  canUseSupabaseServerPersistenceMock: vi.fn(() => false),
  loadCreatorInboxPageMock: vi.fn(),
}));

export const requireCreatorAccessMock = creatorInboxMocks.requireCreatorAccessMock;
export const getCurrentUserIdentityMock = creatorInboxMocks.getCurrentUserIdentityMock;
export const appendAdminOperationAuditMock = creatorInboxMocks.appendAdminOperationAuditMock;
export const getCommunityBugReportByIdMock = creatorInboxMocks.getCommunityBugReportByIdMock;
export const updateCommunityBugReportStatusMock = creatorInboxMocks.updateCommunityBugReportStatusMock;
export const qualifyCommunityBugReportMock = creatorInboxMocks.qualifyCommunityBugReportMock;
export const updateCommunityBugReportTrackingMock = creatorInboxMocks.updateCommunityBugReportTrackingMock;
export const updateCommunityBugReportCreatorStateMock = creatorInboxMocks.updateCommunityBugReportCreatorStateMock;
export const getPromotionRequestByIdMock = creatorInboxMocks.getPromotionRequestByIdMock;
export const updatePromotionRequestCreatorStateMock = creatorInboxMocks.updatePromotionRequestCreatorStateMock;
export const getPartnerOnboardingRequestByIdMock = creatorInboxMocks.getPartnerOnboardingRequestByIdMock;
export const updatePartnerOnboardingRequestCreatorStateMock = creatorInboxMocks.updatePartnerOnboardingRequestCreatorStateMock;
export const deleteCommunityBugReportMock = creatorInboxMocks.deleteCommunityBugReportMock;
export const deletePartnerOnboardingRequestMock = creatorInboxMocks.deletePartnerOnboardingRequestMock;
const buildFeedbackInboxItemMock = creatorInboxMocks.buildFeedbackInboxItemMock;
const buildPromotionInboxItemMock = creatorInboxMocks.buildPromotionInboxItemMock;
const buildPartnerInboxItemMock = creatorInboxMocks.buildPartnerInboxItemMock;
export const canUseSupabaseServerPersistenceMock = creatorInboxMocks.canUseSupabaseServerPersistenceMock;

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

export const loadCreatorInboxPageMock = creatorInboxMocks.loadCreatorInboxPageMock;

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

vi.mock("@/lib/persistence/runtime-store", () => ({
  canUseSupabaseServerPersistence: canUseSupabaseServerPersistenceMock,
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

export const partnerRecord = {
  id: "partner-1",
  submittedByUserId: "partner-user-1",
  status: "pending_admin_review" as const,
  creatorState: "pending" as const,
};

export function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/creator-inbox", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
export function auditCalls() {
  return appendAdminOperationAuditMock.mock.calls.map(([call]) => call);
}


export function makeGetRequest(query = ""): Request {
  return new Request(`http://localhost/api/admin/creator-inbox${query}`);
}

export function resetCreatorInboxMocks() {
  vi.clearAllMocks();
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
}
