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
      evidence: ["requireActionRequestAccess", "access.userId", "updateUserMetadata"],
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
  "account/age-band": {
    GET: {
      expected: "Authenticated current account reads only its own declared age band",
      dimensions: ["authentication", "ownership"],
      actual: "requireActionRequestAccess scopes the Clerk private metadata read to access.userId; no exact birth date or identity document is read",
      evidence: ["requireActionRequestAccess", "access.userId", "privateMetadata"],
    },
    PATCH: {
      expected: "Authenticated current account updates only its declared age band; parental verification is server-owned",
      dimensions: ["authentication", "ownership"],
      actual: "requireActionRequestAccess scopes a Clerk private metadata update to access.userId; the client cannot write parental verification",
      evidence: ["requireActionRequestAccess", "access.userId", "updateUserMetadata", "privateMetadata"],
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
        "Bounded Zod payload; analytics cookie consent and the age-band gate are required before anonymous or authenticated events are accepted, with Clerk metadata checked for authenticated attribution",
      evidence: ["appendFunnelEvent", "resolveFunnelUserId", "hasAnalyticsConsentCookie", "isOptionalConsentTreatmentAllowedForUser"],
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
