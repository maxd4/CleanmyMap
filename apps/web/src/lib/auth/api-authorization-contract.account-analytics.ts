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
        "Authenticated current account; ACTIVE_ROLE is constrained by the GRANTED_ROLE selection matrix and drives effective capabilities; GRANTED_ROLE=elu cannot select ACTIVE_ROLE=admin",
      dimensions: ["authentication", "ownership"],
      actual:
        "requireActionRequestAccess accepts the authenticated web cookie or a bounded Clerk session Bearer; an authenticated distributed rate limit runs before mutation; getCurrentUserIdentity and getSwitchableProfiles preserve ownership and the GRANTED_ROLE/ACTIVE_ROLE matrix; Clerk update is scoped to access.userId and writes only publicMetadata.activeRole",
      evidence: [
        "requireActionRequestAccess",
        "enforceServerRateLimitForAuthenticatedUser",
        "access.userId",
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
      actual: "requireActionRequestAccess accepts the authenticated web cookie or a bounded Clerk session Bearer; Clerk update is scoped to access.userId",
      evidence: ["requireActionRequestAccess", "access.userId", "updateUser"],
    },
  },
  "account/identity": {
    PATCH: {
      expected: "Authenticated owner updates only its own first and last name; Clerk remains the identity authority and Supabase is only a confirmed projection",
      dimensions: ["authentication", "ownership"],
      actual: "requireActionRequestAccess and authenticated rate limit precede a Clerk update scoped to access.userId; syncClerkUserToSupabase confirms the projection or returns a recoverable partial state",
      evidence: ["requireActionRequestAccess", "enforceServerRateLimitForAuthenticatedUser", "access.userId", "updateUser", "syncClerkUserToSupabase"],
    },
  },
  "account/locations": {
    PATCH: {
      expected: "Authenticated owner updates or removes only its own residence/work territoryPreferences without replacing unrelated Clerk metadata",
      dimensions: ["authentication", "ownership"],
      actual: "requireActionRequestAccess and authenticated rate limit precede a targeted Clerk unsafeMetadata patch built from the current owner metadata; the profile projection is confirmed before success",
      evidence: ["requireActionRequestAccess", "enforceServerRateLimitForAuthenticatedUser", "access.userId", "buildClerkMetadataPatch", "syncClerkUserToSupabase"],
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
