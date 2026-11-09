import type { ApiAuthorizationContract } from "./api-authorization-contract.types";

export const spogomiAuthorizationContract = {
  "spogomi/events/[eventId]/volunteer-help-proposals": {
    GET: {
      expected: "Authenticated requester reads only their own help proposals for the event",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess + authenticated userId passed to the requester-scoped proposal service",
      evidenceScope: "module",
      evidence: ["requireAuthenticatedAccess", "authentication.access.userId", "listSpogomiVolunteerHelpProposalsForRequester"],
    },
    POST: {
      expected: "Authenticated requester submits one private help proposal for a published future event",
      dimensions: ["authentication", "ownership", "business permission"],
      actual: "requireAuthenticatedAccess + authenticated rate limit + authenticated userId passed to the idempotent server RPC; event eligibility and active duplicate checks remain in PostgreSQL",
      evidenceScope: "module",
      evidence: ["requireAuthenticatedAccess", "enforceServerRateLimitForAuthenticatedUser", "authentication.access.userId", "createSpogomiVolunteerHelpProposal"],
    },
    DELETE: {
      expected: "Authenticated requester withdraws only their own pending help proposal",
      dimensions: ["authentication", "ownership"],
      actual: "requireAuthenticatedAccess + authenticated userId passed to the withdrawal RPC, which rechecks requester ownership",
      evidenceScope: "module",
      evidence: ["requireAuthenticatedAccess", "enforceServerRateLimitForAuthenticatedUser", "authentication.access.userId", "transitionSpogomiVolunteerHelpProposal"],
    },
  },
  "spogomi/events/[eventId]/volunteer-help-proposals/review": {
    GET: {
      expected: "Event organizer reads private help proposals for the exact event",
      dimensions: ["authentication", "business permission", "ownership"],
      actual: "requireAuthenticatedAccess + event-scoped resolveSpogomiEventAccess + relation-only manage_help_proposals capability before organizer projection",
      evidenceScope: "module",
      evidence: ["requireAuthenticatedAccess", "resolveSpogomiEventAccess", "hasSpogomiCapability", "listSpogomiVolunteerHelpProposalsForOrganizer"],
    },
    PATCH: {
      expected: "Event organizer accepts or rejects a help proposal for the exact event",
      dimensions: ["authentication", "business permission", "ownership"],
      actual: "requireAuthenticatedAccess + event-scoped relation-only manage_help_proposals capability plus PostgreSQL organizer recheck before the transition RPC",
      evidenceScope: "module",
      evidence: ["requireAuthenticatedAccess", "resolveSpogomiEventAccess", "hasSpogomiCapability", "transitionSpogomiVolunteerHelpProposal"],
    },
  },
} as const satisfies ApiAuthorizationContract;
