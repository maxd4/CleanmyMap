import type { ApiAuthorizationContract } from "./api-authorization-contract.types";

export const actionMediaAuthorizationContract = {
  "actions/[actionId]/media/intents": {
    POST: {
      expected: "Authenticated action creator/organizer or admin/max creates an idempotent report-photo intent; an action form editor can remove only a same-action route reference",
      dimensions: ["authentication", "business permission", "ownership"],
      actual: "requireActionRequestAccess + getCurrentUserIdentity + createActionMediaUploadIntent or removeActionRouteReference; server services recheck canManageAction for report photos or canEditActionForm and route_reference purpose for deletion",
      evidence: ["requireActionRequestAccess", "getCurrentUserIdentity", "createActionMediaUploadIntent", "removeActionRouteReference"],
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
} as const satisfies ApiAuthorizationContract;
