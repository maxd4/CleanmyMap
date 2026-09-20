import type { ApiAuthorizationContract } from "./api-authorization-contract.types";

export const platformAuthorizationContract = {
  "email/test": {
    POST: {
      expected: "Admin-like role for test email delivery with actor attribution and service audit event",
      dimensions: ["admin/creator role", "audit"],
      actual: "requireAdminAccess + sendEmail(actorUserId), whose service event records the sending outcome",
      evidence: ["requireAdminAccess", "sendEmail", "actorUserId"],
    },
  },
  "recycling/breakdown": {
    GET: {
      expected: "Authenticated user reads the bounded approved recycling breakdown",
      dimensions: ["authentication"],
      actual:
        "requireAuthenticatedAccess before the approved-only snapshot is loaded; no owner or elevated role is required",
      evidence: ["requireAuthenticatedAccess"],
    },
  },
  "route/recommend": {
    POST: {
      expected: "Authenticated user requests a bounded route recommendation using their current location preference",
      dimensions: ["authentication"],
      actual:
        "getSafeAuthSession() + session.userId with unauthorizedJsonResponse when the current user is absent; approved spot candidates are bounded and progression tracking uses the same userId",
      evidence: [
        "getSafeAuthSession",
        "session.userId",
        "if (!userId)",
        "getCurrentUserLocationPreference",
        "trackRouteRecommendationUse",
      ],
    },
  },
  "partners/onboarding-requests": {
    GET: {
      expected: "Creator access",
      dimensions: ["admin/creator role"],
      actual: "requireCreatorAccess",
      evidence: ["requireCreatorAccess"],
    },
    POST: {
      expected: "Authenticated user submits an onboarding request attributed to their account",
      dimensions: ["authentication", "ownership"],
      actual: "auth() + submittedByUserId from current session",
      evidence: ["auth()", "submittedByUserId"],
    },
  },
  "partners/published-directory": {
    GET: {
      expected: "Public accepted-only partner directory",
      dimensions: ["public-safe"],
      actual: "No session gate; publicationStatus is filtered to accepted and metadata stripped",
      evidence: ["publicationStatus", "accepted", "stripPublicationMetadata"],
      evidenceScope: "module",
    },
  },
  "pilotage/overview": {
    GET: {
      expected: "Authenticated coordinateur/admin-like pilotage access",
      dimensions: ["authentication", "business permission"],
      actual: "auth() + getCurrentUserEffectiveAccess().canAccessPilotage",
      evidence: ["auth()", "getCurrentUserEffectiveAccess", "canAccessPilotage", "forbiddenJsonResponse"],
    },
  },
  "reports/actions.csv": {
    GET: {
      expected: "Admin-like role for heavy action export",
      dimensions: ["admin/creator role"],
      actual: "requireAdminAccess",
      evidence: ["requireAdminAccess"],
    },
  },
  "reports/actions.json": {
    GET: {
      expected: "Admin-like role for heavy action export",
      dimensions: ["admin/creator role"],
      actual: "requireAdminAccess",
      evidence: ["requireAdminAccess"],
    },
  },
  "reports/generations": {
    POST: {
      expected: "Authenticated user may persist their own Reports generation snapshot",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess before validating and persisting the generation metadata",
      evidence: ["requireAuthenticatedAccess", "persistReportGeneration"],
    },
  },
  "reports/exports.csv": {
    GET: {
      expected: "Any authenticated user may generate the non-sensitive detailed Reports export once per Europe/Paris civil day",
      dimensions: ["authentication"],
      actual: "requireAuthenticatedAccess before atomic daily quota reservation and public approved contract export",
      evidence: ["requireAuthenticatedAccess", "reserveReportExportSlot", "fetchCachedUnifiedActionContracts"],
    },
  },
  "reports/generations/[id]": {
    GET: {
      expected: "Authenticated user may load an authorized Reports generation snapshot",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess before loading the requested generation snapshot",
      evidence: ["requireAuthenticatedAccess", "getReportGenerationSnapshotById"],
    },
  },
  "reports/elus-dossier": {
    GET: {
      expected: "Any authenticated user, per EffectiveAccess.canExportElusDossier",
      dimensions: ["authentication"],
      actual: "requireAuthenticatedAccess",
      evidence: ["requireAuthenticatedAccess"],
    },
  },
  "reports/governance-monthly": {
    GET: {
      expected: "Admin-like role for governance report",
      dimensions: ["admin/creator role"],
      actual: "requireAdminAccess",
      evidence: ["requireAdminAccess"],
    },
  },
  send: {
    POST: {
      expected: "Admin-like role for outbound send operation",
      dimensions: ["admin/creator role"],
      actual: "requireAdminAccess",
      evidence: ["requireAdminAccess"],
    },
  },
  services: {
    GET: {
      expected: "Admin-like role for service diagnostics",
      dimensions: ["admin/creator role"],
      actual: "requireAdminAccess",
      evidence: ["requireAdminAccess"],
    },
  },
  spots: {
    GET: {
      expected: "Authenticated bounded global spot read",
      dimensions: ["authentication"],
      actual: "requireAuthenticatedAccess; public table projection remains globally scoped",
      evidence: ["requireAuthenticatedAccess", "loadCachedSpots"],
    },
    POST: {
      expected: "Authenticated signalement creation owned by current user",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess + userId passed to createSignalement",
      evidence: ["requireAuthenticatedAccess", "createSignalement", "userId"],
    },
  },
  "users/checklist-progress": {
    GET: {
      expected: "Authenticated current-user checklist read",
      dimensions: ["authentication", "ownership"],
      actual: "auth() + current userId passed to checklist store",
      evidence: ["auth()", "userId"],
    },
    POST: {
      expected: "Authenticated current-user checklist write",
      dimensions: ["authentication", "ownership"],
      actual: "auth() + current userId passed to checklist store",
      evidence: ["auth()", "userId"],
    },
  },
  "users/map-viewport-fallback": {
    GET: {
      expected: "Authenticated current-user territory preference read",
      dimensions: ["authentication", "ownership"],
      actual: "resolveMapViewportFallbackUserId auth() gate + current-user preference loader",
      evidence: ["resolveMapViewportFallbackUserId", "auth()", "getCurrentUserTerritoryLocationPreference"],
      evidenceScope: "module",
    },
  },
  "users/profile/display-name-mode": {
    GET: {
      expected: "Authenticated current-user profile preference read",
      dimensions: ["authentication", "ownership"],
      actual: "auth()/identity current-user gate",
      evidence: ["auth()", "getCurrentUserIdentity"],
    },
    PATCH: {
      expected: "Authenticated current-user profile preference write",
      dimensions: ["authentication", "ownership"],
      actual: "getCurrentUserIdentity current-user gate",
      evidence: ["getCurrentUserIdentity", "unauthorizedJsonResponse"],
    },
  },
  "users/profile/handle": {
    PATCH: {
      expected: "Authenticated current-user handle write",
      dimensions: ["authentication", "ownership"],
      actual: "auth() + update constrained by current userId",
      evidence: ["auth()", "userId", "neq"],
    },
  },
} as const satisfies ApiAuthorizationContract;
