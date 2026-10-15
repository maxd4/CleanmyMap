import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createSpogomiTeamJoinRequest,
  transitionSpogomiTeamJoinRequest,
} from "./team-join-requests";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261015000016_spogomi_team_join_requests.sql", import.meta.url),
  "utf8",
);

function teamQuery() {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [{ id: "team-1", public_name: "Alpha", team_number: 1 }], error: null }).then(resolve),
  };
  return query;
}

describe("SPOGOMI team join requests", () => {
  it("uses stable status labels and creates only a request", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ request_id: "request-1", request_status: "pending", request_team_id: "team-1" }], error: null });
    const supabase = { rpc, from: vi.fn(() => teamQuery()) } as never;
    await expect(createSpogomiTeamJoinRequest({ supabase, eventId: "event-1", teamId: "team-1", requesterClerkId: "user-1" })).resolves.toMatchObject({
      id: "request-1",
      status: "pending",
      team: { publicName: "Alpha", teamNumber: 1 },
    });
    expect(rpc).toHaveBeenCalledWith("create_spogomi_team_join_request", {
      p_event_id: "event-1",
      p_team_id: "team-1",
      p_requester_clerk_id: "user-1",
    });
  });

  it("delegates approval to the transactional RPC and never creates action participation", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: {
      id: "request-1",
      event_id: "event-1",
      team_id: "team-1",
      requester_clerk_id: "user-1",
      status: "approved",
      matched_participant_id: "participant-1",
      verification_note: "Vérification indépendante documentée.",
      resolution_note: null,
      decided_by_clerk_id: "admin-1",
      decided_at: "2026-10-15T10:00:00.000Z",
      created_at: "2026-10-15T09:00:00.000Z",
    }, error: null });
    const supabase = { rpc, from: vi.fn(() => teamQuery()) } as never;
    await expect(transitionSpogomiTeamJoinRequest({
      supabase,
      requestId: "request-1",
      eventId: "event-1",
      targetStatus: "approved",
      actorKind: "admin",
      actorClerkId: "admin-1",
      actorRole: "admin",
      matchedParticipantId: "participant-1",
      verificationNote: "Vérification indépendante documentée.",
    })).resolves.toMatchObject({ status: "approved", matchedParticipantId: "participant-1" });
    expect(rpc).toHaveBeenCalledWith("transition_spogomi_team_join_request", expect.objectContaining({ p_actor_role: "admin" }));
    expect(rpc).not.toHaveBeenCalledWith("claim_spogomi_identity_link", expect.anything());
  });

  it("keeps the SQL contract team-scoped, atomic and isolated from participation data", () => {
    expect(migration).toContain("spogomi_team_join_pending_requester_unique");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("public_visibility = 'published'");
    expect(migration).toContain("p_actor_role not in ('admin', 'max')");
    expect(migration).toContain("participant.team_id = v_request.team_id");
    expect(migration).toContain("admin_approved");
    expect(migration).toContain("spogomi_team_join_request_events");
    expect(migration.indexOf("select * into v_existing")).toBeLessThan(migration.indexOf("spogomi_account_already_linked_for_event"));
    expect(migration).not.toContain("action_participants");
    expect(migration).not.toMatch(/display_name|email|ticket/i);
    expect(migration).toMatch(/revoke all on table public\.spogomi_team_join_requests from public, anon, authenticated/i);
  });
});
