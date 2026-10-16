import type { ApiAuthorizationContract } from "./api-authorization-contract.types";

export const adminCommunityAuthorizationContract = {
  "admin/codex-usage": {
    GET: {
      expected: "Admin-like role",
      dimensions: ["admin/creator role"],
      actual: "requireAdminAccess",
      evidence: ["requireAdminAccess"],
    },
    POST: {
      expected: "Admin-like role",
      dimensions: ["admin/creator role"],
      actual: "requireAdminAccess",
      evidence: ["requireAdminAccess"],
    },
  },
  "admin/creator-inbox": {
    GET: {
      expected: "Admin-like access",
      dimensions: ["admin/creator role"],
      actual: "requireAdminAccess",
      evidence: ["requireAdminAccess"],
    },
    PATCH: {
      expected: "Admin-like access with admin-operation audit",
      dimensions: ["admin/creator role", "audit"],
      actual: "requireAdminAccess + appendDecisionAudit (encapsulates appendAdminOperationAudit)",
      evidence: ["requireAdminAccess", "appendDecisionAudit"],
    },
  },
  "admin/legal-content-reports/decision": {
    POST: {
      expected: "Décision de modération réservée à un admin canonique et auditée",
      dimensions: ["admin/creator role", "audit"],
      actual: "requireAdminAccess + getCurrentUserIdentity + appendDecisionAudit",
      evidence: [
        "requireAdminAccess",
        "getCurrentUserIdentity",
        "appendDecisionAudit",
      ],
    },
  },
  "admin/environmental-impact": {
    POST: {
      expected: "Admin-like role",
      dimensions: ["admin/creator role"],
      actual: "requireAdminAccess",
      evidence: ["requireAdminAccess"],
    },
  },
  "admin/free-plan-services": {
    GET: {
      expected: "Admin-like role",
      dimensions: ["admin/creator role"],
      actual: "requireAdminAccess",
      evidence: ["requireAdminAccess"],
    },
    POST: {
      expected: "Admin-like role",
      dimensions: ["admin/creator role"],
      actual: "Delegates to GET, preserving requireAdminAccess",
      evidence: ["requireAdminAccess"],
      evidenceScope: "module",
      delegatesTo: "GET",
    },
  },
  "admin/moderation": {
    POST: {
      expected: "Admin-like role plus confirmation/reason and mandatory operation audit",
      dimensions: ["admin/creator role", "audit"],
      actual: "requireAdminAccess + appendAdminOperationAudit/action moderation audit",
      evidence: ["requireAdminAccess", "appendAdminOperationAudit"],
    },
  },
  "admin/operations": {
    GET: {
      expected: "Admin-like role for audit-log read",
      dimensions: ["admin/creator role", "audit"],
      actual: "requireAdminAccess + listAdminOperationAudit",
      evidence: ["requireAdminAccess", "listAdminOperationAudit"],
    },
  },
  "admin/partners/published-directory": {
    POST: {
      expected: "Admin-like role plus confirmation/reason and operation audit",
      dimensions: ["admin/creator role", "audit"],
      actual: "requireAdminAccess + appendAdminOperationAudit",
      evidence: ["requireAdminAccess", "appendAdminOperationAudit"],
    },
  },
  "admin/promotion-requests": {
    GET: {
      expected: "ACTIVE_ROLE=max",
      dimensions: ["admin/creator role"],
      actual: "getCurrentUserIdentity must resolve canonical max with activeRole=max and the exact IMU owner id via isImuOwnerIdentity; authenticated distributed rate limit is enforced before listing",
      evidence: ["getCurrentUserIdentity", "isImuOwnerIdentity", "enforceServerRateLimitForAuthenticatedUser"],
    },
    POST: {
      expected: "ACTIVE_ROLE=max plus operation audit",
      dimensions: ["admin/creator role", "audit"],
      actual: "getCurrentUserIdentity must resolve canonical max with activeRole=max and the exact IMU owner id via isImuOwnerIdentity + authenticated distributed rate limit + appendAdminOperationAudit",
      evidence: ["getCurrentUserIdentity", "isImuOwnerIdentity", "enforceServerRateLimitForAuthenticatedUser", "appendAdminOperationAudit"],
      evidenceScope: "module",
      handlerEvidence: [
        "getCurrentUserIdentity",
        "isImuOwnerIdentity",
        "enforceServerRateLimitForAuthenticatedUser",
        "respondToPromotionRejection",
        "respondToPromotionAcceptance",
      ],
    },
  },
  "admin/referrals.csv": {
    GET: {
      expected: "Admin-like role",
      dimensions: ["admin/creator role"],
      actual: "requireAdminAccess",
      evidence: ["requireAdminAccess"],
    },
  },
  "admin/role-accounts": {
    GET: {
      expected: "ACTIVE_ROLE=max for the dedicated privileged-role management surface",
      dimensions: ["admin/creator role"],
      actual: "requireCreatorAccess checks ACTIVE_ROLE=max and an authenticated distributed rate limit is enforced before listing",
      evidence: ["requireCreatorAccess", "enforceServerRateLimitForAuthenticatedUser"],
    },
    POST: {
      expected: "ACTIVE_ROLE=max plus operation audit and self-target protection; target role is elu or admin only",
      dimensions: ["admin/creator role", "ownership", "audit"],
      actual: "requireCreatorAccess checks ACTIVE_ROLE=max + authenticated distributed rate limit + appendAdminOperationAudit",
      evidence: ["requireCreatorAccess", "enforceServerRateLimitForAuthenticatedUser", "appendAdminOperationAudit"],
      evidenceScope: "method",
    },
  },
  "admin/storage-usage": {
    GET: {
      expected: "Admin-like role",
      dimensions: ["admin/creator role"],
      actual: "requireAdminAccess",
      evidence: ["requireAdminAccess"],
    },
    POST: {
      expected: "Admin-like role",
      dimensions: ["admin/creator role"],
      actual: "requireAdminAccess",
      evidence: ["requireAdminAccess"],
    },
  },
  "community/bug-reports": {
    GET: {
      expected: "Authenticated owner-only feedback history with minimal projection",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess + server-bound submittedByUserId + bounded keyset pagination",
      evidence: ["requireAuthenticatedAccess", "submittedByUserId", "listCommunityBugReportsForUser"],
    },
    POST: {
      expected: "Authenticated user submits a report attributed to their current identity",
      dimensions: ["authentication", "ownership"],
      actual: "auth() + submittedByUserId from current session",
      evidence: ["auth()", "submittedByUserId"],
    },
    PATCH: {
      expected: "Max role plus operation audit for status moderation",
      dimensions: ["admin/creator role", "audit"],
      actual: "getCurrentUserActiveRole must resolve max + appendAdminOperationAudit",
      evidence: ["getCurrentUserActiveRole", "appendAdminOperationAudit"],
    },
  },
  "community/bug-reports/[reportId]/screenshot": {
    GET: {
      expected: "Feedback screenshot read by its owner or an authorized admin, with a short-lived signed URL",
      dimensions: ["authentication", "ownership", "admin/creator role"],
      actual: "requireActionRequestAccess + getBugReportScreenshot owner/admin check",
      evidence: ["requireActionRequestAccess", "getBugReportScreenshot"],
    },
    DELETE: {
      expected: "Screenshot deletion by the feedback owner only",
      dimensions: ["authentication", "ownership"],
      actual: "requireActionRequestAccess + deleteBugReportScreenshot owner check",
      evidence: ["requireActionRequestAccess", "deleteBugReportScreenshot"],
    },
  },
  "community/bug-reports/[reportId]/screenshot/intent": {
    POST: {
      expected: "Bug feedback owner receives a bounded signed upload intent",
      dimensions: ["authentication", "ownership"],
      actual: "requireActionRequestAccess + createBugReportScreenshotUploadIntent owner and server-side file validation",
      evidence: ["requireActionRequestAccess", "createBugReportScreenshotUploadIntent"],
    },
  },
  "community/bug-reports/[reportId]/screenshot/finalize": {
    POST: {
      expected: "Bug feedback owner finalizes only after server-side Storage content verification",
      dimensions: ["authentication", "ownership"],
      actual: "requireActionRequestAccess + finalizeBugReportScreenshot storage verification",
      evidence: ["requireActionRequestAccess", "finalizeBugReportScreenshot"],
    },
  },
  "community/events/ops": {
    POST: {
      expected: "Admin-like role",
      dimensions: ["admin/creator role"],
      actual: "requireAdminAccess",
      evidence: ["requireAdminAccess"],
    },
  },
  "community/events": {
    GET: {
      expected: "Public-safe community read with optional current-user RSVP context",
      dimensions: ["public-safe", "ownership"],
      actual: "getSafeAuthSession() with nullable userId; public counts remain available and personal RSVP/ownership context is optional",
      evidence: ["getSafeAuthSession", "loadCachedCommunityEvents", "userId", "myRsvpStatus", "canEditOwnOps"],
      evidenceScope: "module",
    },
    POST: {
      expected: "Authenticated user creates an event owned by current user",
      dimensions: ["authentication", "ownership"],
      actual: "auth() + organizer_clerk_id from current session",
      evidence: ["auth()", "organizer_clerk_id"],
    },
  },
  "community/funnel.csv": {
    GET: {
      expected: "Admin-like role",
      dimensions: ["admin/creator role"],
      actual: "requireAdminAccess",
      evidence: ["requireAdminAccess"],
    },
  },
  "community/promotion-requests": {
    POST: {
      expected: "Authenticated user requests promotion for their own account; elevated roles are rejected",
      dimensions: ["authentication", "ownership", "business permission"],
      actual: "auth() + current identity/role checks + submittedByUserId from session",
      evidence: ["auth()", "getCurrentUserRoleLabel", "submittedByUserId"],
    },
  },
  "community/rsvps": {
    POST: {
      expected: "Authenticated user writes only their own RSVP",
      dimensions: ["authentication", "ownership"],
      actual: "auth() + current userId used for RSVP ownership",
      evidence: ["auth()", "userId"],
    },
  },
} as const satisfies ApiAuthorizationContract;
