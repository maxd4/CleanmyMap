import type { ApiAuthorizationContract } from "./api-authorization-contract.types";

export const actionRoleAttestationsAuthorizationContract = {
  "actions/[actionId]/role-attestations": {
    GET: {
      expected: "Authorized action manager reads all final confirmed participants and their role decisions; a final participant reads only their own decisions",
      dimensions: ["authentication", "business permission", "ownership"],
      actual: "requireActionRequestAccess + canManageAction or action_participants confirmed + finalized action gate + server-only attestation projection",
      evidence: [
        "requireActionRequestAccess",
        "canManageAction",
        "loadActionParticipationReviewPage",
        "loadActionRoleAttestationState",
      ],
      evidenceScope: "module",
    },
    POST: {
      expected: "Authorized action manager confirms, rejects or corrects a role only after final confirmed participation; self-review stays pending unless admin/max",
      dimensions: ["authentication", "business permission", "ownership", "audit"],
      actual: "requireActionRequestAccess + canManageAction + policy checks + service-only transactional review_action_role_attestation RPC with revision audit and deduplicated notification",
      evidence: ["requireActionRequestAccess", "canManageAction", "evaluateRoleAttestationPolicy", "reviewActionRoleAttestation"],
      evidenceScope: "module",
    },
  },
} as const satisfies ApiAuthorizationContract;
