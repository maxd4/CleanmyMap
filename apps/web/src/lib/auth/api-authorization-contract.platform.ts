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
      expected: "Authenticated coordinateur pilotage access scoped to canonical organized actions",
      dimensions: ["authentication", "business permission"],
      actual: "auth() + getCurrentUserEffectiveAccess().canAccessPilotage + server-resolved organized action scope",
      evidence: ["auth()", "getCurrentUserEffectiveAccess", "canAccessPilotage", "loadPilotageOverview", "forbiddenJsonResponse"],
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
    GET: {
      expected: "Authenticated user may list their own Reports generation history with server pagination and filters",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess before owner-scoped listReportGenerationHistoryPage; reads do not reserve generation quota",
      evidence: ["requireAuthenticatedAccess", "listReportGenerationHistoryPage"],
    },
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
    POST: {
      expected: "Authenticated owner may derive a compatible Reports generation snapshot with the existing daily quota and audit contract",
      dimensions: ["authentication", "ownership", "audit"],
      actual: "requireAuthenticatedAccess + owner-scoped source lookup + atomic daily quota reservation + immutable derived persistence + post-persistence audit",
      evidence: [
        "requireAuthenticatedAccess",
        "getReportGenerationSnapshotById",
        "reserveReportExportSlot",
        "persistDerivedReportGeneration",
        "resolveDerivedReportGenerationPersistence",
        "releaseReportExportSlot",
        "appendAdminOperationAudit",
      ],
    },
  },
  "reports/generations/[id]/pdf": {
    GET: {
      expected: "Authenticated owner may download the immutable PDF artifact for their Reports generation snapshot",
      dimensions: ["authentication", "ownership", "audit"],
      actual: "requireAuthenticatedAccess + owner-scoped snapshot lookup + private Storage artifact claim/read + audit",
      evidenceScope: "module",
      evidence: [
        "requireAuthenticatedAccess",
        "getReportGenerationSnapshotById",
        "claimReportPdfArtifact",
        "REPORT_PDF_ARTIFACT_BUCKET",
        "appendAdminOperationAudit",
      ],
    },
  },
  "reports/generations/[id]/publication": {
    GET: {
      expected: "Authenticated owner may preview the safe public projection of their report",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess + owner-scoped snapshot and artifact lookup + server-side publication projection",
      evidenceScope: "module",
      evidence: ["requireAuthenticatedAccess", "getReportGenerationSnapshotById", "getReportPdfArtifactForOwner", "projectReportPublicationPreview"],
    },
    POST: {
      expected: "Authenticated owner may publish only a ready, safe projection of their report",
      dimensions: ["authentication", "ownership", "audit"],
      actual: "requireAuthenticatedAccess + owner-scoped snapshot/artifact + eligibility check + publication persistence + audit",
      evidenceScope: "module",
      evidence: ["requireAuthenticatedAccess", "getReportGenerationSnapshotById", "assertReportPublicationEligibility", "getReportPdfArtifactForOwner", "createReportPublication", "appendAdminOperationAudit"],
    },
    DELETE: {
      expected: "Authenticated owner may revoke only their own report publication",
      dimensions: ["authentication", "ownership", "audit"],
      actual: "requireAuthenticatedAccess + owner-scoped publication revocation + audit",
      evidenceScope: "module",
      evidence: ["requireAuthenticatedAccess", "revokeReportPublication", "appendAdminOperationAudit"],
    },
  },
  "reports/generations/[id]/json": {
    GET: {
      expected: "Authenticated owner may export the structured JSON projection of their immutable Reports snapshot",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess before owner-scoped snapshot lookup and scientific export projection",
      evidence: ["requireAuthenticatedAccess", "getReportGenerationSnapshotById", "buildReportScientificExport"],
    },
  },
  "reports/generations/[id]/csv": {
    GET: {
      expected: "Authenticated owner may export the tabular CSV projection of their immutable Reports snapshot",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess before owner-scoped snapshot lookup and scientific CSV projection",
      evidence: ["requireAuthenticatedAccess", "getReportGenerationSnapshotById", "buildReportScientificCsv"],
    },
  },
  "reports/generations/[id]/share": {
    GET: {
      expected: "Authenticated owner may inspect the exact PDF variant and the revocable share metadata for their historical generation",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess + owner-scoped snapshot and artifact lookup + owner-scoped share listing",
      evidenceScope: "module",
      evidence: ["requireAuthenticatedAccess", "getReportGenerationSnapshotById", "getReportPdfArtifactForOwner", "listReportPdfSharesForOwner"],
    },
    POST: {
      expected: "Authenticated owner may create a bounded expiring bearer link only for an already-ready private PDF artifact",
      dimensions: ["authentication", "ownership", "audit"],
      actual: "requireAuthenticatedAccess + authenticated rate limit + owner-scoped snapshot/artifact lookup + hashed-token persistence + post-persistence audit",
      evidenceScope: "module",
      evidence: ["requireAuthenticatedAccess", "enforceServerRateLimitForAuthenticatedUser", "getReportGenerationSnapshotById", "getReportPdfArtifactForOwner", "createReportPdfShare", "appendAdminOperationAudit"],
    },
  },
  "reports/generations/[id]/share/[shareId]": {
    DELETE: {
      expected: "Authenticated owner may revoke only their own report share link",
      dimensions: ["authentication", "ownership", "audit"],
      actual: "requireAuthenticatedAccess + owner-scoped share update + revocation audit",
      evidence: ["requireAuthenticatedAccess", "revokeReportPdfShare", "appendAdminOperationAudit"],
    },
  },
  "reports/shared/[token]": {
    GET: {
      expected: "An anonymous bearer may download only the explicitly shared, unexpired, non-revoked PDF variant",
      dimensions: ["bearer token"],
      actual: "anonymous server rate limit + SHA-256 token lookup with expiry/revocation checks + exact artifact/generation/theme/renderer binding + private Storage read",
      evidence: ["enforceServerRateLimit", "hashReportPdfShareToken", "findActiveReportPdfShareByTokenHash", "getReportPdfArtifactById", "downloadReportPdfArtifact"],
      handlerEvidence: ["enforceServerRateLimit", "hashReportPdfShareToken", "findActiveReportPdfShareByTokenHash", "getReportPdfArtifactById"],
    },
  },
  "reports/library": {
    GET: {
      expected: "Anonymous or authenticated visitors may list only active safe report publication metadata",
      dimensions: ["public-safe"],
      actual: "server-side active publication listing without snapshot or Storage access",
      evidence: ["listPublicReportLibraryPage"],
    },
  },
  "reports/library/[id]": {
    GET: {
      expected: "Anonymous or authenticated visitors may inspect only active safe publication metadata",
      dimensions: ["public-safe"],
      actual: "server-side active publication lookup and safe row projection",
      evidence: ["getActiveReportPublicationById", "projectReportPublicationRow"],
    },
  },
  "reports/library/[id]/pdf": {
    GET: {
      expected: "Anonymous or authenticated visitors may download only the active published exact PDF artifact",
      dimensions: ["public-safe"],
      actual: "active publication lookup + exact artifact binding + private Storage server read",
      evidence: ["getActiveReportPublicationById", "getReportPdfArtifactById", "downloadReportPdfArtifact"],
    },
  },
  "reports/elus-dossier": {
    GET: {
      expected: "Any authenticated user may generate the bounded dossier export, subject to the server quota/cache contract",
      dimensions: ["authentication"],
      actual: "requireAuthenticatedAccess + authenticated distributed rate limit before the bounded aggregate export; PDF requests never sign a legacy Storage path and keep the browser export flow",
      evidence: ["requireAuthenticatedAccess", "enforceServerRateLimitForAuthenticatedUser", "buildCachedPdfResponse"],
      evidenceScope: "module",
      handlerEvidence: [
        "requireAuthenticatedAccess",
        "enforceServerRateLimitForAuthenticatedUser",
        "executeDossierExport",
      ],
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
      actual: "requireActionRequestAccess preserves the web cookie and bounded Clerk Bearer transports; public table projection remains globally scoped",
      evidence: ["requireActionRequestAccess", "loadCachedSpots"],
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
      evidenceScope: "method",
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
  "users/profile/leaderboard-opt-in": {
    GET: {
      expected: "Authenticated current-user leaderboard preference read",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess current-user gate + owner-scoped server profile read",
      evidence: ["requireAuthenticatedAccess", "userId", "getSupabaseServerClient", ".eq(\"id\", userId)"],
    },
    PATCH: {
      expected: "Authenticated current-user leaderboard preference write",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess current-user gate + owner-scoped server profile update",
      evidence: ["requireAuthenticatedAccess", "userId", "getSupabaseServerClient", ".eq(\"id\", userId)"],
    },
  },
} as const satisfies ApiAuthorizationContract;
