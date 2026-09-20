import type { ApiAuthorizationContract } from "./api-authorization-contract.types";

export const accountAnalyticsAuthorizationContract = {
  "account/profile-role": {
    POST: {
      expected: "Retired legacy selector; no self-service role mutation",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess then HTTP 410; role remains server-owned",
      evidence: ["requireAuthenticatedAccess"],
    },
  },
  "account/active-profile": {
    POST: {
      expected:
        "Authenticated current account; ACTIVE_ROLE is constrained by the GRANTED_ROLE selection matrix and drives effective capabilities; GRANTED_ROLE=elu may explicitly select ACTIVE_ROLE=admin, gaining normal admin capabilities without changing GRANTED_ROLE",
      dimensions: ["authentication", "ownership"],
      actual:
        "requireAuthenticatedAccess + getCurrentUserIdentity + getSwitchableProfiles; Clerk update writes only publicMetadata.activeRole",
      evidence: [
        "requireAuthenticatedAccess",
        "getCurrentUserIdentity",
        "getSwitchableProfiles",
        "activeRole",
      ],
    },
  },
  "account/activity-status": {
    PATCH: {
      expected: "Authenticated current account updates only its own activity status",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess + Clerk update scoped to access.userId",
      evidence: ["requireAuthenticatedAccess", "access.userId", "updateUser"],
    },
  },
  "account/promotion-requests": {
    GET: {
      expected: "Authenticated user reads only their own promotion requests",
      dimensions: ["authentication", "ownership"],
      actual: "getSafeAuthSession + current userId passed to the user-scoped promotion request store",
      evidence: ["getSafeAuthSession", "userId", "listPromotionRequestsForUser"],
    },
  },
  "analytics/funnel": {
    POST: {
      expected: "Public-safe validated funnel ingestion with optional current-user attribution",
      dimensions: ["public-safe"],
      actual:
        "Bounded Zod payload; anonymous events remain accepted and auth() is used only when Clerk attribution is available",
      evidence: ["appendFunnelEvent", "resolveFunnelUserId"],
      evidenceScope: "module",
    },
    GET: {
      expected: "Admin-like role for funnel metrics and event-derived snapshot",
      dimensions: ["admin/creator role"],
      actual: "requireAdminAccess before listing funnel events or building the snapshot",
      evidence: ["requireAdminAccess"],
    },
  },
} as const satisfies ApiAuthorizationContract;
