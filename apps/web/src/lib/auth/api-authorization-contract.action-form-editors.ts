import type { ApiAuthorizationContract } from "./api-authorization-contract.types";

export const actionFormEditorsAuthorizationContract: ApiAuthorizationContract = {
  "actions/[actionId]/form-editors": {
    GET: {
      expected: "Only the action creator, primary action organizer, or ACTIVE_ROLE admin/max can inspect editor grants",
      dimensions: ["authentication", "business permission", "ownership"],
      actual: "requireActionRequestAccess + canManageActionFormEditors using the action creator, primary action_organizers row, or active global action role before private no-store projection",
      evidence: ["requireActionRequestAccess", "canManageActionFormEditors", "is_primary", "loadActionFormEditorIds"],
      evidenceScope: "module",
    },
    POST: {
      expected: "Only the action creator, primary action organizer, or ACTIVE_ROLE admin/max can grant/revoke a verified Clerk account through an atomic audited RPC",
      dimensions: ["authentication", "business permission", "ownership", "audit"],
      actual: "requireActionRequestAccess + canManageActionFormEditors + Clerk users.getUser on grants + mutate_action_form_editor service-only RPC rechecks creator/primary and commits grant/revoke with idempotency and audit",
      evidence: ["requireActionRequestAccess", "canManageActionFormEditors", "users.getUser", "mutate_action_form_editor"],
      evidenceScope: "module",
    },
  },
};
