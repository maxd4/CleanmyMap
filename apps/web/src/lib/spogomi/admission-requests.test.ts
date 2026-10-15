import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createSpogomiAdmissionRequest,
  listSpogomiAdmissionRequestsForRequester,
  transitionSpogomiAdmissionRequest,
} from "./admission-requests";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261015000018_spogomi_public_admission_requests.sql", import.meta.url),
  "utf8",
);

function query(data: unknown[] = [], single: unknown = null) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: single, error: null })),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve),
  };
  return chain;
}

describe("SPOGOMI admission requests", () => {
  it("keeps requester responses free of roster and verification fields", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ request_id: "request-1", request_status: "pending", request_kind: "registration", request_division_id: "division-1", request_team_id: null }],
      error: null,
    });
    const supabase = { rpc, from: vi.fn(() => query()) } as never;
    const request = await createSpogomiAdmissionRequest({
      supabase,
      eventId: "event-1",
      divisionId: "division-1",
      requesterClerkId: "user-1",
      requestKind: "registration",
      providedContext: "Je souhaite participer.",
    });

    expect(request).toMatchObject({ id: "request-1", requestKind: "registration", status: "pending", divisionId: "division-1" });
    expect(Object.keys(request)).not.toEqual(expect.arrayContaining(["matchedParticipantId", "verificationNote", "resolutionNote", "requesterClerkId"]));
    expect(rpc).toHaveBeenCalledWith("create_spogomi_admission_request", expect.objectContaining({ p_request_kind: "registration" }));
  });

  it("scopes a personal history read to the requester and exposes only the public decision message", async () => {
    const requestQuery = query([{
      id: "request-1",
      event_id: "event-1",
      request_kind: "presence_regularization",
      division_id: "division-1",
      team_id: null,
      provided_context: "Présent sur place.",
      status: "rejected",
      decision_message: "La présence doit être vérifiée sur place.",
      decided_at: "2026-10-15T10:00:00.000Z",
      created_at: "2026-10-15T09:00:00.000Z",
      matched_participant_id: "internal-participant",
      verification_note: "note interne",
      resolution_note: "autre note interne",
    }]);
    const supabase = { from: vi.fn(() => requestQuery) } as never;
    const requests = await listSpogomiAdmissionRequestsForRequester(supabase, { eventId: "event-1", requesterClerkId: "user-1" });

    expect(requests[0]).toEqual({
      id: "request-1",
      requestKind: "presence_regularization",
      divisionId: "division-1",
      teamId: null,
      providedContext: "Présent sur place.",
      status: "rejected",
      decisionMessage: "La présence doit être vérifiée sur place.",
      decidedAt: "2026-10-15T10:00:00.000Z",
      createdAt: "2026-10-15T09:00:00.000Z",
    });
    expect(requestQuery.select).toHaveBeenCalledWith(expect.not.stringContaining("matched_participant_id"));
    expect(requestQuery.eq).toHaveBeenCalledWith("requester_clerk_id", "user-1");
  });

  it("keeps admin decisions on the dedicated transactional RPC and never supplies a roster match", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: "request-1", event_id: "event-1", request_kind: "registration", division_id: "division-1", team_id: null,
        requester_clerk_id: "user-1", status: "approved", provided_context: "context", decision_message: null,
        matched_participant_id: "new-participant", verification_note: "Vérification d’admission documentée.", resolution_note: null,
        decided_by_clerk_id: "admin-1", decided_at: "2026-10-15T10:00:00.000Z", created_at: "2026-10-15T09:00:00.000Z",
      },
      error: null,
    });
    const supabase = { rpc } as never;
    const result = await transitionSpogomiAdmissionRequest({
      supabase,
      requestId: "request-1",
      eventId: "event-1",
      targetStatus: "approved",
      actorClerkId: "admin-1",
      actorRole: "admin",
      verificationNote: "Vérification d’admission documentée.",
    });

    expect(result.requestKind).toBe("registration");
    expect(rpc).toHaveBeenCalledWith("transition_spogomi_admission_request", expect.objectContaining({
      p_actor_role: "admin",
      p_matched_participant_id: null,
    }));
  });

  it("locks the public admission boundary in SQL", () => {
    expect(migration).toContain("direct_registration");
    expect(migration).toContain("externalTicketingRequired");
    expect(migration).toContain("worldCupDirectRegistrationAllowed");
    expect(migration).toContain("spogomi_registration_capacity_reached");
    expect(migration).toContain("p_actor_clerk_id = v_request.requester_clerk_id");
    expect(migration).toContain("request_kind in ('registration', 'presence_regularization')");
    expect(migration).toMatch(/revoke all on function public\.create_spogomi_admission_request[\s\S]+grant execute on function public\.create_spogomi_admission_request[\s\S]+to service_role/i);
    expect(migration).not.toContain("action_participants");
  });
});
