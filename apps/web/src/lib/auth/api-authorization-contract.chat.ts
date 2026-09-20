import type { ApiAuthorizationContract } from "./api-authorization-contract.types";

export const chatAuthorizationContract = {
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
  "chat/action-exclusions": {
    GET: {
      expected: "Action creator/organizer or active admin/max reads moderation exclusions for a published visible action",
      dimensions: ["authentication", "business permission", "ownership", "admin/creator role"],
      actual: "auth + current identity + dedicated action discussion moderation capability; service-side action and exclusion reads",
      evidence: ["auth()", "getCurrentUserIdentity", "canModerateActionConversation", "loadActionById", "isActionDiscussionAvailable"],
      evidenceScope: "module",
    },
    POST: {
      expected: "Authorized action discussion moderator creates or reactivates an exclusion without changing participation",
      dimensions: ["authentication", "business permission", "ownership", "admin/creator role"],
      actual: "auth + dedicated capability + service-side upsert scoped to the canonical action conversation + appendActionModerationAudit",
      evidence: ["auth()", "canModerateActionConversation", "action_conversation_exclusions", "action_conversations", "appendActionModerationAudit"],
      evidenceScope: "module",
    },
    PATCH: {
      expected: "Authorized action discussion moderator explicitly reinstates a previously excluded user",
      dimensions: ["authentication", "business permission", "ownership", "admin/creator role"],
      actual: "auth + dedicated capability + service-side update of active/reinstatement state + appendActionModerationAudit",
      evidence: ["auth()", "canModerateActionConversation", "reinstated_at", "reinstated_by_user_id", "appendActionModerationAudit"],
      evidenceScope: "module",
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
  "chat/contact-requests": {
    GET: {
      expected: "Authenticated user reads only pending action-share requests addressed to their identity and only the public action projection",
      dimensions: ["authentication", "ownership", "public-safe"],
      actual: "auth + getCurrentUserIdentity + recipient-scoped service RPC; each action is rechecked against the public sharing contract before a bounded projection is returned",
      evidence: ["auth()", "getCurrentUserIdentity", "list_action_share_requests_for_recipient", "getPublicActionShareKind", "buildPublicActionReference"],
      evidenceScope: "module",
    },
    PATCH: {
      expected: "Authenticated recipient accepts, rejects or ignores only their own action-share request",
      dimensions: ["authentication", "ownership", "public-safe"],
      actual: "auth + getCurrentUserIdentity + recipient_id passed to the service RPC; the decision is constrained to accept/reject/ignore and acceptance rechecks public action availability",
      evidence: ["auth()", "getCurrentUserIdentity", "respondToActionShareRequest", "recipientId", "decisionSchema"],
      evidenceScope: "module",
    },
  },
  "chat/share-destinations": {
    GET: {
      expected: "Authenticated user lists existing conversations where they can post for a currently shareable public action",
      dimensions: ["authentication", "business permission", "ownership"],
      actual: "auth + getCurrentUserIdentity + RLS-backed DM listing; action eligibility is checked before destinations are returned and a territorial destination is derived from the action or profile preference",
      evidence: ["auth()", "getCurrentUserIdentity", "getSupabaseClerkRlsClient", "list_my_dm_conversations", "getPublicActionShareKind", "buildShareDestinationList"],
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
        "Authenticated chat search with channel-specific role and ownership; an explicit valid territory overrides the profile default",
      dimensions: [
        "authentication",
        "admin/creator role",
        "business permission",
        "ownership",
      ],
      actual:
        "auth() + current identity role gate; app_messages queries scope community/topics, DM participants, admin_elu roles, the explicit requested territory (or profile default) and current-user bug reports",
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
} as const satisfies ApiAuthorizationContract;
