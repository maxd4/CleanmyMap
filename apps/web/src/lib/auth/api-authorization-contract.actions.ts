import type { ApiAuthorizationContract } from "./api-authorization-contract.types";

export const actionsAuthorizationContract = {
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
      expected: "ACTIVE_ROLE=admin|max plus mandatory import audit",
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
  "actions/map/pollution-score-references": {
    GET: {
      expected: "Public weekly pollution-score reference snapshot read",
      dimensions: ["public-safe"],
      actual:
        "No session gate; bounded persisted reference is served through the public map contract",
      evidence: ["loadPollutionScoreReferencesForMap"],
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
  "actions/organizers": {
    GET: {
      expected: "Authenticated type-scoped organizer suggestions",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess + type-scoped directory read; the service client is explicit after authentication",
      evidence: ["requireAuthenticatedAccess", "searchOrganizerDirectory"],
      evidenceScope: "module",
    },
  },
  actions: {
    GET: {
      expected: "Public approved view; non-public statuses require central moderation permission",
      dimensions: ["public-safe", "authentication", "business permission"],
      actual: "Public snapshot for safe status; requireGlobalActionsModerationAccess for pending/rejected/all, backed by canModerateActionsGlobally",
      evidence: [
        "requireGlobalActionsModerationAccess",
        "requireAuthenticatedAccess",
        "canModerateActionsGlobally",
      ],
      evidenceScope: "module",
    },
    POST: {
      expected: "Authenticated creation owned by current user; every role follows the normal moderation flow",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess + creator ownership + explicit organizer fallback only",
      evidence: [
        "requireAuthenticatedAccess",
        "canManageActionsGlobally",
      ],
    },
  },
  "actions/[actionId]/audit": {
    GET: {
      expected: "Authenticated creator/organizer or admin/max action-audit read",
      dimensions: ["authentication", "business permission", "ownership", "audit"],
      actual: "requireAuthenticatedAccess + minimized owner/organizer history or full canViewActionModerationAudit journal",
      evidence: [
        "requireAuthenticatedAccess",
        "canViewActionAudit",
        "canViewActionModerationAudit",
      ],
      evidenceScope: "module",
    },
  },
  "actions/[actionId]/cancel": {
    POST: {
      expected: "ACTIVE_ROLE=admin|max may cancel only a published future pre-action after explicit confirmation",
      dimensions: ["authentication", "admin/creator role", "business permission", "audit"],
      actual: "requireAdminAccess + future pre-action cancellation guard + appendActionModerationAudit",
      evidence: ["requireAdminAccess", "cancelFutureAction", "appendActionModerationAudit"],
      evidenceScope: "module",
    },
  },
  "actions/[actionId]/group-join": {
    PATCH: {
      expected: "Authenticated creator/organizer or admin/max participant-review permission; admin participant override is audited",
      dimensions: ["authentication", "business permission", "ownership", "participant override", "audit"],
      actual: "requireAuthenticatedAccess + canReviewActionParticipants/canOverrideActionParticipants + appendActionModerationAudit",
      evidence: [
        "requireAuthenticatedAccess",
        "canReviewActionParticipants",
        "canOverrideActionParticipants",
        "appendActionModerationAudit",
      ],
      evidenceScope: "module",
    },
    GET: {
      expected: "Public action shell; participant queue/search is conditional on reviewer permission",
      dimensions: ["public-safe", "authentication", "business permission", "ownership"],
      actual: "Optional current-user context; queue/search is returned only after resolveReviewerAccess",
      evidence: [
        "resolveReviewerAccess",
        "canReviewActionParticipants",
        "canOverrideActionParticipants",
      ],
      evidenceScope: "module",
    },
    POST: {
      expected: "Authenticated creator/organizer or admin/max participant-review permission; admin participant override is audited",
      dimensions: ["authentication", "business permission", "ownership", "participant override", "audit"],
      actual: "requireAuthenticatedAccess + canReviewActionParticipants/canOverrideActionParticipants + appendActionModerationAudit",
      evidence: [
        "requireAuthenticatedAccess",
        "canReviewActionParticipants",
        "canOverrideActionParticipants",
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
  "actions/[actionId]/participation-claim": {
    POST: {
      expected: "Authenticated user creates or reuses only their own eligible post-action claim",
      dimensions: ["authentication", "ownership", "business permission", "audit"],
      actual: "requireAuthenticatedAccess + server-side finished-public action eligibility + user-scoped action_participants mutation + moderation audit",
      evidence: [
        "requireAuthenticatedAccess",
        "claimFinishedActionParticipation",
        "appendActionModerationAudit",
      ],
    },
  },
  "actions/[actionId]/participant-impact": {
    PATCH: {
      expected: "Authenticated action organizer or admin/max records an individual measurement only for a confirmed target participation; ordinary participants are denied",
      dimensions: ["authentication", "business permission", "ownership", "participant override", "audit"],
      actual: "requireAuthenticatedAccess + shared resolveReviewerAccess + confirmed participant guard + appendActionModerationAudit",
      evidence: [
        "requireAuthenticatedAccess",
        "resolveReviewerAccess",
        "participation_status !== \"confirmed\"",
        "appendActionModerationAudit",
      ],
      evidenceScope: "module",
    },
  },
  "actions/[actionId]": {
    GET: {
      expected: "Authenticated creator/organizer or admin/max action-management read",
      dimensions: ["authentication", "business permission", "ownership"],
      actual: "requireAuthenticatedAccess + canManageAction",
      evidence: ["requireAuthenticatedAccess", "canManageAction"],
    },
    PATCH: {
      expected: "Authenticated creator/organizer normal edit; admin/max validated-impact correction is explicit, reasoned and audited",
      dimensions: ["authentication", "business permission", "ownership", "validated impact correction", "audit"],
      actual: "requireAuthenticatedAccess + canManageAction; approved impact changes require canEditValidatedImpact, a reason and appendActionModerationAudit",
      evidence: [
        "requireAuthenticatedAccess",
        "canManageAction",
        "canManageActionsGlobally",
        "canEditValidatedImpact",
        "appendActionModerationAudit",
      ],
    },
  },
  "actions/[actionId]/administrative-requirements": {
    GET: {
      expected: "Public future pre-actions expose only administrative status; admin/max/elu and canonical organizers also receive canValidate",
      dimensions: ["public-safe", "business permission", "ownership"],
      actual: "service-side action visibility check + isPublishedFuturePreAction + canValidateActionAdministrativeRequirements; only status, validatedAt and canValidate are returned",
      evidence: [
        "loadActionById",
        "isPublishedFuturePreAction",
        "canValidateActionAdministrativeRequirements",
        "loadCanonicalActionOrganizerIdsForAction",
      ],
    },
    POST: {
      expected: "Authenticated admin/max/elu or canonical action organizer/coorganizer validates a pre-action administrative state",
      dimensions: ["authentication", "business permission", "audit"],
      actual: "requireAuthenticatedAccess + canValidateActionAdministrativeRequirements against action_organizers + service-role atomic validation RPC; repeated validation is idempotent",
      evidence: [
        "requireAuthenticatedAccess",
        "canValidateActionAdministrativeRequirements",
        "loadCanonicalActionOrganizerIdsForAction",
        "validate_action_administrative_requirements",
      ],
    },
  },
  "actions/[actionId]/formalities": {
    GET: {
      expected: "Authenticated owner/organizer or admin/max action-management read of the local-formalities workflow",
      dimensions: ["authentication", "business permission", "ownership"],
      actual: "requireAuthenticatedAccess + loadActionById + canonical organizer resolution + canManageAction; only pre-action formalities state is returned",
      evidence: [
        "requireAuthenticatedAccess",
        "loadActionById",
        "loadCanonicalActionOrganizerIdsForAction",
        "canManageAction",
      ],
      evidenceScope: "module",
    },
    PATCH: {
      expected: "Authenticated owner/organizer or admin/max action-management update of facts and user formalities state",
      dimensions: ["authentication", "business permission", "ownership"],
      actual: "requireAuthenticatedAccess + loadActionById + canonical organizer resolution + canManageAction before persisted qualification/workflow update",
      evidence: [
        "requireAuthenticatedAccess",
        "loadActionById",
        "loadCanonicalActionOrganizerIdsForAction",
        "canManageAction",
      ],
      evidenceScope: "module",
    },
  },
  "actions/[actionId]/publish": {
    POST: {
      expected: "Authenticated owner/organizer or explicit admin/max pre-action publication",
      dimensions: ["authentication", "business permission", "ownership"],
      actual: "requireAuthenticatedAccess + canManageAction, with canPublishPreAction keeping moderation and publication separate",
      evidence: ["requireAuthenticatedAccess", "canManageAction", "canPublishPreAction"],
    },
  },
  "actions/[actionId]/public": {
    GET: {
      expected: "Public-safe dynamic action reference projection; inaccessible actions return a neutral not-found response",
      dimensions: ["public-safe"],
      actual: "loadActionById + isPublicActionReferenceAvailable before buildPublicActionReference; no private preparation or measurements are returned",
      evidence: ["loadActionById", "isPublicActionReferenceAvailable", "buildPublicActionReference"],
      evidenceScope: "module",
    },
  },
} as const satisfies ApiAuthorizationContract;
