export type ApiHttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type ApiAuthorizationDimension =
  | "public-safe"
  | "authentication"
  | "admin/creator role"
  | "business permission"
  | "ownership"
  | "admin override"
  | "audit";

export type ApiAuthorizationContractEntry = {
  expected: string;
  dimensions: readonly ApiAuthorizationDimension[];
  actual: string;
  evidence?: readonly string[];
  evidenceScope?: "method" | "module";
  delegatesTo?: ApiHttpMethod;
};

type ApiAuthorizationContract = Record<
  string,
  Partial<Record<ApiHttpMethod, ApiAuthorizationContractEntry>>
>;

/**
 * Handler-level authorization contract for the protected API families.
 *
 * The inventory test derives the route/method keys from route.ts files and
 * requires every non-public entry to expose the guard evidence listed here.
 * This keeps the proxy family list separate from the authorization decision
 * made by each handler.
 */
export const API_AUTHORIZATION_CONTRACT = {
  "account/active-profile": {
    POST: {
      expected: "Authenticated current account; active persona is limited by the real role and never changes authorization",
      dimensions: ["authentication", "ownership"],
      actual:
        "requireAuthenticatedAccess + getCurrentUserRoleLabel + getSwitchableProfiles; Clerk update writes only publicMetadata.activeProfile",
      evidence: [
        "requireAuthenticatedAccess",
        "getCurrentUserRoleLabel",
        "getSwitchableProfiles",
        "activeProfile",
      ],
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
  "actions/group-join": {
    GET: {
      expected: "Public joinable approved/pre-action read; private history only with session context",
      dimensions: ["public-safe", "ownership"],
      actual: "No mandatory handler gate; joinable read is public-safe and history is filtered by the optional current user",
      evidence: ["loadJoinableActions", "loadUserParticipationHistory"],
      evidenceScope: "module",
    },
    POST: {
      expected: "Authenticated user creates or reuses only their own participation",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess + userId passed to joinActionParticipation",
      evidence: ["requireAuthenticatedAccess", "joinActionParticipation"],
    },
  },
  "actions/import": {
    POST: {
      expected: "Admin-like role plus mandatory import audit",
      dimensions: ["admin/creator role", "audit"],
      actual: "requireAdminAccess + import success/failure audit",
      evidence: ["requireAdminAccess", "auditImportFailure"],
    },
  },
  "actions/map/initial-nearest": {
    GET: {
      expected: "Public bounded validated/cleaned map read",
      dimensions: ["public-safe"],
      actual: "No session gate; bounded public-safe source projection",
      evidence: ["loadInitialPollutionItems"],
      evidenceScope: "module",
    },
  },
  "actions/map": {
    GET: {
      expected: "Public approved and visible actions plus validated/cleaned spots map read",
      dimensions: ["public-safe"],
      actual:
        "No session gate; status is normalized to approved and both snapshot/API and RPC projections enforce the public map boundary",
      evidence: [
        "parseMapActionsParams",
        "filterPublicMapResponse",
        "loadOrRefreshPublicSurfaceSnapshot",
        "actions_map_feed",
      ],
      evidenceScope: "module",
    },
  },
  "actions/prefill": {
    GET: {
      expected: "Authenticated user reads only their own prefill history",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess + user-scoped fetchRecentActionsByUser",
      evidence: ["requireAuthenticatedAccess", "fetchRecentActionsByUser"],
      evidenceScope: "module",
    },
  },
  actions: {
    GET: {
      expected: "Public approved view; non-public statuses require central moderation permission",
      dimensions: ["public-safe", "authentication", "business permission"],
      actual: "Public snapshot for safe status; requireGlobalActionsModerationAccess for pending/rejected/all",
      evidence: [
        "requireGlobalActionsModerationAccess",
        "requireAuthenticatedAccess",
        "canModerateAnyAction",
      ],
      evidenceScope: "module",
    },
    POST: {
      expected: "Authenticated creation owned by current user; admin-like auto-approval remains explicit",
      dimensions: ["authentication", "ownership", "admin override"],
      actual: "requireAuthenticatedAccess + canAutoApproveOwnAction/canUseAdminOverride",
      evidence: [
        "requireAuthenticatedAccess",
        "canAutoApproveOwnAction",
        "canUseAdminOverride",
      ],
    },
  },
  "actions/[actionId]/audit": {
    GET: {
      expected: "Authenticated creator/organizer/admin-like action-audit read",
      dimensions: ["authentication", "business permission", "ownership", "audit"],
      actual: "requireAuthenticatedAccess + canViewActionAudit, with canViewModerationAudit or creator/organizer ownership",
      evidence: [
        "requireAuthenticatedAccess",
        "canViewActionAudit",
        "canViewModerationAudit",
      ],
      evidenceScope: "module",
    },
  },
  "actions/[actionId]/group-join": {
    PATCH: {
      expected: "Authenticated creator/organizer/admin-like participant-review permission; admin override is audited",
      dimensions: ["authentication", "business permission", "ownership", "admin override", "audit"],
      actual: "requireAuthenticatedAccess + canReviewActionParticipants/canUseAdminOverride + appendActionModerationAudit",
      evidence: [
        "requireAuthenticatedAccess",
        "canReviewActionParticipants",
        "canUseAdminOverride",
        "appendActionModerationAudit",
      ],
      evidenceScope: "module",
    },
    GET: {
      expected: "Public action shell; participant queue/search is conditional on reviewer permission",
      dimensions: ["public-safe", "authentication", "business permission", "ownership", "admin override"],
      actual: "Optional current-user context; queue/search is returned only after resolveReviewerAccess",
      evidence: [
        "resolveReviewerAccess",
        "canReviewActionParticipants",
        "canUseAdminOverride",
      ],
      evidenceScope: "module",
    },
    POST: {
      expected: "Authenticated creator/organizer/admin-like participant-review permission; admin override is audited",
      dimensions: ["authentication", "business permission", "ownership", "admin override", "audit"],
      actual: "requireAuthenticatedAccess + canReviewActionParticipants/canUseAdminOverride + appendActionModerationAudit",
      evidence: [
        "requireAuthenticatedAccess",
        "canReviewActionParticipants",
        "canUseAdminOverride",
        "appendActionModerationAudit",
      ],
      evidenceScope: "module",
    },
    DELETE: {
      expected: "Authenticated user cancels only their own participation",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess + current userId passed to cancelActionParticipation",
      evidence: ["requireAuthenticatedAccess", "cancelActionParticipation"],
    },
  },
  "actions/[actionId]": {
    GET: {
      expected: "Authenticated creator/organizer/admin-like action-management read",
      dimensions: ["authentication", "business permission", "ownership"],
      actual: "requireAuthenticatedAccess + canManageAction",
      evidence: ["requireAuthenticatedAccess", "canManageAction"],
    },
    PATCH: {
      expected: "Authenticated creator/organizer/admin-like action-management write; admin override is audited",
      dimensions: ["authentication", "business permission", "ownership", "admin override", "audit"],
      actual: "requireAuthenticatedAccess + canManageAction/canUseAdminOverride + appendActionModerationAudit",
      evidence: [
        "requireAuthenticatedAccess",
        "canManageAction",
        "canUseAdminOverride",
        "appendActionModerationAudit",
      ],
    },
  },
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
      expected: "Creator access",
      dimensions: ["admin/creator role"],
      actual: "requireCreatorAccess",
      evidence: ["requireCreatorAccess"],
    },
    PATCH: {
      expected: "Creator access with admin-operation audit",
      dimensions: ["admin/creator role", "audit"],
      actual: "requireCreatorAccess + appendDecisionAudit (encapsulates appendAdminOperationAudit)",
      evidence: ["requireCreatorAccess", "appendDecisionAudit"],
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
      expected: "Max role",
      dimensions: ["admin/creator role"],
      actual: "getCurrentUserRoleLabel must resolve max",
      evidence: ["getCurrentUserRoleLabel"],
    },
    POST: {
      expected: "Max role plus operation audit",
      dimensions: ["admin/creator role", "audit"],
      actual: "getCurrentUserRoleLabel must resolve max + appendAdminOperationAudit",
      evidence: ["getCurrentUserRoleLabel", "appendAdminOperationAudit"],
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
      expected: "Max role",
      dimensions: ["admin/creator role"],
      actual: "getCurrentUserRoleLabel must resolve max",
      evidence: ["getCurrentUserRoleLabel"],
    },
    POST: {
      expected: "Max role plus operation audit and self-target protection",
      dimensions: ["admin/creator role", "ownership", "audit"],
      actual: "getCurrentUserRoleLabel must resolve max + appendAdminOperationAudit",
      evidence: ["getCurrentUserRoleLabel", "appendAdminOperationAudit"],
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
      actual: "getCurrentUserRoleLabel must resolve max + appendAdminOperationAudit",
      evidence: ["getCurrentUserRoleLabel", "appendAdminOperationAudit"],
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
      actual: "getSafeAuthSession() with nullable userId; public counts remain available and personal RSVP context is optional",
      evidence: ["getSafeAuthSession", "loadCachedCommunityEvents", "userId", "myRsvpStatus"],
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
  chat: {
    GET: {
      expected:
        "Authenticated member; channel access is checked server-side, with DM/feedback reads scoped to the current identity and admin/elu channel restricted by role",
      dimensions: [
        "authentication",
        "business permission",
        "ownership",
        "admin/creator role",
      ],
      actual:
        "auth() + getCurrentUserIdentity + canAccessChatChannel; DM and feedback queries bind sender/recipient filters to the current user and use Clerk-RLS",
      evidence: [
        "auth()",
        "getCurrentUserIdentity",
        "canAccessChatChannel",
        "sender_id",
      ],
    },
    POST: {
      expected:
        "Authenticated member; channel access is checked server-side, with current-user message ownership and role-gated admin/elu channel",
      dimensions: [
        "authentication",
        "business permission",
        "ownership",
        "admin/creator role",
      ],
      actual:
        "auth() + getCurrentUserIdentity + canAccessChatChannel; inserted sender_id is the current user and sensitive reads/writes use Clerk-RLS",
      evidence: [
        "auth()",
        "getCurrentUserIdentity",
        "canAccessChatChannel",
        "sender_id",
      ],
    },
  },
  "chat/inbox": {
    GET: {
      expected: "Authenticated user reads only their own DM inbox",
      dimensions: ["authentication", "ownership"],
      actual:
        "getAuthenticatedRlsClient authenticates the current user and delegates to list_my_dm_conversations through Clerk-RLS",
      evidence: ["auth()", "getCurrentUserIdentity", "list_my_dm_conversations"],
      evidenceScope: "module",
    },
    PATCH: {
      expected: "Authenticated user marks only their own DM conversation as read",
      dimensions: ["authentication", "ownership"],
      actual:
        "getAuthenticatedRlsClient authenticates the current user and delegates the peer update to mark_my_dm_conversation_read through Clerk-RLS",
      evidence: ["auth()", "getCurrentUserIdentity", "mark_my_dm_conversation_read"],
      evidenceScope: "module",
    },
  },
  "chat/polls/[messageId]/vote": {
    POST: {
      expected:
        "Authenticated community member votes on an existing community poll; the vote is owned by the current user",
      dimensions: ["authentication", "business permission", "ownership"],
      actual:
        "upsertVote authenticates, loadVisiblePoll restricts the target to a community poll, and the upsert writes user_id from auth()",
      evidence: ["auth()", "loadVisiblePoll", "userId"],
      evidenceScope: "module",
    },
    PUT: {
      expected:
        "Authenticated community member changes their vote on an existing community poll; the vote is owned by the current user",
      dimensions: ["authentication", "business permission", "ownership"],
      actual:
        "upsertVote authenticates, validates the community poll and option, and upserts the current user's vote only",
      evidence: ["auth()", "loadVisiblePoll", "userId"],
      evidenceScope: "module",
    },
    DELETE: {
      expected:
        "Authenticated community member removes only their own vote from an existing community poll",
      dimensions: ["authentication", "business permission", "ownership"],
      actual:
        "auth() + loadVisiblePoll; delete is filtered by message_id and user_id from the current session",
      evidence: ["auth()", "loadVisiblePoll", "userId"],
      evidenceScope: "module",
    },
  },
  "chat/users": {
    GET: {
      expected: "Authenticated member directory/search with requester-scoped exclusion and cache",
      dimensions: ["authentication"],
      actual:
        "auth() + fetchCachedChatUsers(userId, ...); the shared search excludes the current profile and uses Clerk-RLS",
      evidence: ["auth()", "fetchCachedChatUsers", "userId"],
    },
  },
  "chat/search": {
    GET: {
      expected:
        "Authenticated chat search with channel-specific role, ownership and profile-derived territory boundaries",
      dimensions: [
        "authentication",
        "admin/creator role",
        "business permission",
        "ownership",
      ],
      actual:
        "auth() + current identity role gate; Clerk-RLS app_messages queries scope community/topics, DM participants, admin_elu roles, profile territory/neighbors and current-user bug reports",
      evidence: [
        "auth()",
        "getCurrentUserIdentity",
        "getSupabaseClerkRlsClient",
        "loadCurrentProfile",
        "canAccessChatChannel",
        "getTerritoryFilter",
        "sender_id",
        "recipient_id",
      ],
    },
  },
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
      expected: "Authenticated coordinateur/max pilotage access",
      dimensions: ["authentication", "business permission"],
      actual: "auth() + getCurrentUserRoleLabel restricted to coordinateur or max",
      evidence: ["auth()", "getCurrentUserRoleLabel", "forbiddenJsonResponse"],
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
      expected: "Admin-like role for persisting a successful Reports generation snapshot",
      dimensions: ["admin/creator role"],
      actual: "requireAdminAccess before validating and persisting the generation metadata",
      evidence: ["requireAdminAccess", "persistReportGeneration"],
    },
  },
  "reports/generations/[id]": {
    GET: {
      expected: "Admin-like role for loading a persisted Reports generation snapshot",
      dimensions: ["admin/creator role"],
      actual: "requireAdminAccess before loading the requested generation snapshot",
      evidence: ["requireAdminAccess", "getReportGenerationSnapshotById"],
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
