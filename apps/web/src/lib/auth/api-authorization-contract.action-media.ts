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
} as const satisfies ApiAuthorizationContract;
