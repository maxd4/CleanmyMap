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
      actual: "getCurrentUserActiveRole must resolve max",
      evidence: ["getCurrentUserActiveRole"],
    },
    POST: {
      expected: "ACTIVE_ROLE=max plus operation audit",
      dimensions: ["admin/creator role", "audit"],
      actual: "getCurrentUserActiveRole must resolve max + appendAdminOperationAudit",
      evidence: ["getCurrentUserActiveRole", "appendAdminOperationAudit"],
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
      actual: "requireCreatorAccess checks ACTIVE_ROLE=max",
      evidence: ["requireCreatorAccess"],
    },
    POST: {
      expected: "ACTIVE_ROLE=max plus operation audit and self-target protection; target role is elu or admin only",
      dimensions: ["admin/creator role", "ownership", "audit"],
      actual: "requireCreatorAccess checks ACTIVE_ROLE=max + appendAdminOperationAudit",
      evidence: ["requireCreatorAccess", "appendAdminOperationAudit"],
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
