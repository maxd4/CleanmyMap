import type { ApiAuthorizationContract } from "./api-authorization-contract.types";

export const actionMediaAuthorizationContract = {
  "actions/[actionId]/media/intents": {
    POST: {
      expected: "Authenticated action creator/organizer or admin/max creates an idempotent completed-action photo intent",
      dimensions: ["authentication", "business permission", "ownership"],
      actual: "requireActionRequestAccess + getCurrentUserIdentity + createActionMediaUploadIntent, which rechecks canManageAction, the canonical action_organizers relation and the admissible action phase",
      evidence: ["requireActionRequestAccess", "getCurrentUserIdentity", "createActionMediaUploadIntent"],
      evidenceScope: "method",
    },
  },
  "actions/[actionId]/media/[mediaId]/finalize": {
    POST: {
      expected: "Authenticated action creator/organizer or admin/max finalizes only after server-side Storage verification",
      dimensions: ["authentication", "business permission", "ownership"],
      actual: "requireActionRequestAccess + getCurrentUserIdentity + finalizeActionMedia, which rechecks canManageAction and Storage object existence",
      evidence: ["requireActionRequestAccess", "getCurrentUserIdentity", "finalizeActionMedia"],
      evidenceScope: "method",
    },
  },
  "actions/[actionId]/media": {
    GET: {
      expected: "Authenticated action creator/organizer or admin/max reads only ready photos of the same action",
      dimensions: ["authentication", "business permission", "ownership"],
      actual: "requireActionRequestAccess + getCurrentUserIdentity + listActionMedia, which rechecks canManageAction, filters ready rows and generates transient signed URLs",
      evidence: ["requireActionRequestAccess", "getCurrentUserIdentity", "listActionMedia"],
      evidenceScope: "method",
    },
  },
  "actions/[actionId]/media/[mediaId]": {
    DELETE: {
      expected: "An authenticated action form editor removes only a same-action route reference; report-photo management remains restricted to canManageAction",
      dimensions: ["authentication", "business permission", "ownership"],
      actual: "requireActionRequestAccess + getCurrentUserIdentity + removeActionRouteReference, which rechecks canEditActionForm and scopes the lookup and removal to the action and route_reference purpose",
      evidence: ["requireActionRequestAccess", "getCurrentUserIdentity", "removeActionRouteReference"],
      evidenceScope: "method",
    },
  },
} as const satisfies ApiAuthorizationContract;
