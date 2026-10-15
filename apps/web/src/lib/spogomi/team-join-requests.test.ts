import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createSpogomiTeamJoinRequest,
  loadSpogomiTeamJoinRequestForRequester,
  transitionSpogomiTeamJoinRequest,
} from "./team-join-requests";

const baseMigration = readFileSync(
  new URL("../../../supabase/migrations/20261015000016_spogomi_team_join_requests.sql", import.meta.url),
  "utf8",
);
const migration = readFileSync(
  new URL("../../../supabase/migrations/20261015000017_spogomi_team_join_request_decision_and_replay_fix.sql", import.meta.url),
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

function dataQuery(data: unknown[], singleData: unknown = undefined) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    neq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: singleData, error: null })),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve),
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

  it("delegates rejection without requiring a roster identity or verification note", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: {
      id: "request-1",
      event_id: "event-1",
      team_id: "team-1",
      requester_clerk_id: "user-1",
      status: "rejected",
      matched_participant_id: null,
      verification_note: null,
      resolution_note: "Aucune vérification suffisante.",
      decided_by_clerk_id: "admin-1",
      decided_at: "2026-10-15T10:00:00.000Z",
      created_at: "2026-10-15T09:00:00.000Z",
    }, error: null });
    const supabase = { rpc, from: vi.fn(() => teamQuery()) } as never;

    await expect(transitionSpogomiTeamJoinRequest({
      supabase,
      requestId: "request-1",
      eventId: "event-1",
      targetStatus: "rejected",
      actorKind: "admin",
      actorClerkId: "admin-1",
      actorRole: "admin",
    })).resolves.toMatchObject({ status: "rejected", matchedParticipantId: null, verificationNote: null });
    expect(rpc).toHaveBeenCalledWith("transition_spogomi_team_join_request", expect.objectContaining({
      p_target_status: "rejected",
      p_matched_participant_id: null,
      p_verification_note: null,
      p_resolution_note: null,
    }));
  });

  it("uses the effective RPC team and rejects a cross-team approved replay", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ request_id: "request-1", request_status: "approved", request_team_id: "team-a" }], error: null });
    const labels = teamQuery();
    labels.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [{ id: "team-a", public_name: "Alpha", team_number: 1 }], error: null }).then(resolve);
    const supabase = { rpc, from: vi.fn(() => labels) } as never;

    await expect(createSpogomiTeamJoinRequest({ supabase, eventId: "event-1", teamId: "team-a", requesterClerkId: "user-1" })).resolves.toMatchObject({
      status: "approved",
      teamId: "team-a",
      team: { publicName: "Alpha", teamNumber: 1 },
    });
    await expect(createSpogomiTeamJoinRequest({ supabase, eventId: "event-1", teamId: "team-b", requesterClerkId: "user-1" })).rejects.toMatchObject({ kind: "conflict" });
  });

  it("returns a requester-only projection with the effective team labels", async () => {
    const eventQuery = dataQuery([], { id: "event-1" });
    const requestQuery = dataQuery([{
      id: "request-1",
      event_id: "event-1",
      team_id: "team-a",
      status: "approved",
      decided_at: "2026-10-15T10:00:00.000Z",
      created_at: "2026-10-15T09:00:00.000Z",
      matched_participant_id: "participant-internal",
      verification_note: "Note interne.",
      resolution_note: "Décision interne.",
      decided_by_clerk_id: "admin-internal",
    }]);
    const labelsQuery = dataQuery([{ id: "team-a", public_name: "Alpha", team_number: 1 }]);
    const supabase = { from: vi.fn((table: string) => table === "spogomi_events" ? eventQuery : table === "spogomi_team_join_requests" ? requestQuery : labelsQuery) } as never;

    await expect(loadSpogomiTeamJoinRequestForRequester(supabase, {
      eventId: "event-1",
      teamId: "team-a",
      requesterClerkId: "user-1",
    })).resolves.toEqual({
      id: "request-1",
      teamId: "team-a",
      status: "approved",
      decidedAt: "2026-10-15T10:00:00.000Z",
      createdAt: "2026-10-15T09:00:00.000Z",
      team: { publicName: "Alpha", teamNumber: 1 },
    });
    expect(requestQuery.select).toHaveBeenCalledWith("id, event_id, team_id, status, decided_at, created_at");
  });

  it("keeps the SQL contract team-scoped, atomic and isolated from participation data", () => {
    expect(baseMigration).toContain("spogomi_team_join_pending_requester_unique");
    expect(migration).toContain("spogomi_team_join_request_already_approved");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("public_visibility = 'published'");
    expect(migration).toContain("p_actor_role is null");
    expect(migration).toMatch(/if p_target_status = 'approved' then[\s\S]*p_matched_participant_id is null/);
    expect(migration).toContain("participant.team_id = v_request.team_id");
    expect(baseMigration).toContain("admin_approved");
    expect(baseMigration).toContain("spogomi_team_join_request_events");
    expect(baseMigration.indexOf("select * into v_existing")).toBeLessThan(baseMigration.indexOf("spogomi_account_already_linked_for_event"));
    expect(baseMigration).not.toContain("action_participants");
    expect(baseMigration).not.toMatch(/display_name|email|ticket/i);
    expect(baseMigration).toMatch(/revoke all on table public\.spogomi_team_join_requests from public, anon, authenticated/i);
  });
});
