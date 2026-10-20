import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadCurrentGamificationFactsMock = vi.hoisted(() => vi.fn());
const reconcileUserGamificationMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("@/lib/gamification/gamification-facts-loader", () => ({
  loadCurrentGamificationFacts: loadCurrentGamificationFactsMock,
}));

vi.mock("@/lib/gamification/gamification-reconciliation", () => ({
  reconcileUserGamification: reconcileUserGamificationMock,
}));

import {
  getSpogomiRecognitionPartialDetails,
  reconcileSpogomiRecognition,
} from "./recognition-service";

type UserRow = {
  id: string;
  clerk_id: string;
  user_id: string;
};

function fakeSupabase(users: UserRow[], existingAwards: Array<Record<string, unknown>> = [], options: {
  event?: Record<string, unknown>;
  attestations?: Array<Record<string, unknown>>;
  rankings?: Array<Record<string, unknown>>;
  actionParticipants?: Array<Record<string, unknown>>;
} = {}) {
  const event = {
    id: "event-1", action_id: "action-1", name: "SPOGOMI Paris", event_slug: "paris", starts_at: "2026-06-01T09:00:00Z", official_timezone: "Europe/Paris", state: "certified", public_visibility: "published",
    ...options.event,
  };
  const responses: Record<string, unknown[]> = {
    spogomi_participants: users.map((user) => ({
      id: user.id,
      event_id: "event-1",
      team_id: `team-${user.id}`,
      clerk_id: user.clerk_id,
      registration_status: "registered",
      attendance_status: "present",
      account_link_status: "verified",
    })),
    spogomi_recognition_attestations: options.attestations ?? [],
    spogomi_official_rankings: options.rankings ?? [],
    action_participants: options.actionParticipants ?? users.map((user) => ({ user_id: user.user_id })),
    spogomi_collection_awards: existingAwards,
  };
  const rpc = vi.fn(async () => ({ data: 0, error: null }));
  const from = vi.fn((table: string) => {
    const builder: Record<string, ReturnType<typeof vi.fn>> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.in = vi.fn(() => builder);
    builder.order = vi.fn(() => builder);
    builder.range = vi.fn(async () => ({ data: responses[table] ?? [], count: (responses[table] ?? []).length, error: null }));
    builder.insert = vi.fn(async () => ({ data: null, error: null }));
    builder.maybeSingle = vi.fn(async () => table === "spogomi_events"
      ? { data: event, error: null }
      : { data: null, error: null });
    return builder;
  });
  return { supabase: { from, rpc } as unknown as SupabaseClient, rpc };
}

const factsFor = (userId: string) => ({
  userId,
  sourceFacts: [],
  progressionCounters: {},
  applicableMechanicIds: ["spogomi_first_referee"],
});

describe("SPOGOMI recognition reconciliation orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reconcileUserGamificationMock.mockResolvedValue({});
  });

  it("loads the canonical facts once per user and never appends a second referee fact", async () => {
    const fixture = fakeSupabase([{ id: "participant-1", clerk_id: "user-1", user_id: "user-1" }]);
    const facts = factsFor("user-1");
    loadCurrentGamificationFactsMock.mockResolvedValue(facts);

    await expect(reconcileSpogomiRecognition({ supabase: fixture.supabase, eventId: "event-1", actorClerkId: "organizer-1" })).resolves.toMatchObject({ status: "complete" });

    expect(loadCurrentGamificationFactsMock).toHaveBeenCalledOnce();
    expect(reconcileUserGamificationMock).toHaveBeenCalledOnce();
    expect(reconcileUserGamificationMock).toHaveBeenCalledWith(fixture.supabase, "user-1", expect.objectContaining({ facts }));
    expect(reconcileUserGamificationMock.mock.calls[0]?.[2]?.facts.sourceFacts).toEqual([]);
  });

  it("rejects before badge mutation when a required fact page cannot be read", async () => {
    const fixture = fakeSupabase([{ id: "participant-1", clerk_id: "user-1", user_id: "user-1" }]);
    loadCurrentGamificationFactsMock.mockRejectedValue(new Error("SPOGOMI first referee participants read failed"));

    await expect(reconcileSpogomiRecognition({ supabase: fixture.supabase, eventId: "event-1", actorClerkId: "organizer-1" })).rejects.toThrow("SPOGOMI first referee participants read failed");
    expect(fixture.rpc).not.toHaveBeenCalled();
  });

  it("returns an explicit retryable partial result when XP reconciliation fails after badges", async () => {
    const fixture = fakeSupabase([
      { id: "participant-1", clerk_id: "user-1", user_id: "user-1" },
      { id: "participant-2", clerk_id: "user-2", user_id: "user-2" },
    ]);
    loadCurrentGamificationFactsMock.mockImplementation(async (_supabase: SupabaseClient, userId: string) => factsFor(userId));
    reconcileUserGamificationMock
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("progression ledger unavailable"));

    const result = reconcileSpogomiRecognition({ supabase: fixture.supabase, eventId: "event-1", actorClerkId: "organizer-1" });
    await expect(result).rejects.toMatchObject({ code: "SPOGOMI_RECOGNITION_PARTIAL" });
    try {
      await result;
    } catch (error) {
      expect(getSpogomiRecognitionPartialDetails(error)).toEqual({
        status: "partial",
        eventId: "event-1",
        badgesMutationApplied: true,
        gamificationReconciledUserCount: 1,
        affectedUserCount: 2,
        retryable: true,
      });
    }
    expect(fixture.rpc).toHaveBeenCalledOnce();
  });

  it("keeps a retry idempotent by replaying the same canonical user facts", async () => {
    const fixture = fakeSupabase([{ id: "participant-1", clerk_id: "user-1", user_id: "user-1" }]);
    const facts = factsFor("user-1");
    loadCurrentGamificationFactsMock.mockResolvedValue(facts);

    await reconcileSpogomiRecognition({ supabase: fixture.supabase, eventId: "event-1", actorClerkId: "organizer-1" });
    await reconcileSpogomiRecognition({ supabase: fixture.supabase, eventId: "event-1", actorClerkId: "organizer-1" });

    expect(fixture.rpc).toHaveBeenCalledTimes(2);
    expect(loadCurrentGamificationFactsMock).toHaveBeenCalledTimes(2);
    expect(reconcileUserGamificationMock).toHaveBeenCalledTimes(2);
    expect(reconcileUserGamificationMock.mock.calls.every((call) => call[2]?.facts === facts)).toBe(true);
  });

  it("uses the official event timezone and keeps ranking or measurement values out of XP facts", async () => {
    const fixture = fakeSupabase(
      [{ id: "participant-1", clerk_id: "user-1", user_id: "user-1" }],
      [],
      {
        event: { starts_at: "2026-12-31T23:30:00Z", official_timezone: "Europe/Paris" },
        attestations: [{ id: "collector-1", participant_id: "participant-1", event_id: "event-1", kind: "collector", status: "certified", certified_at: "2027-01-01T00:30:00Z", evidence_reference: "measure:certified", certification_version: "v1" }],
        rankings: [{ id: "ranking-1", event_id: "event-1", team_id: "team-participant-1", kind: "points", rank: 1, status: "certified", team_eligible: true, decision_version: "v1", source_reference: "ranking:certified" }],
      },
    );
    loadCurrentGamificationFactsMock.mockResolvedValue(factsFor("user-1"));

    await reconcileSpogomiRecognition({ supabase: fixture.supabase, eventId: "event-1", actorClerkId: "organizer-1" });

    const rpcCalls = fixture.rpc.mock.calls as unknown as Array<[string, { p_awards: Array<Record<string, unknown>> }]>;
    const collectionCall = rpcCalls.find((call) => call[0] === "reconcile_spogomi_collection_awards_for_divisions");
    const awards = collectionCall?.[1].p_awards ?? [];
    expect(awards).toEqual(expect.arrayContaining([expect.objectContaining({ badgeTypeId: "spogomi_collector", occurredOn: "2027-01-01" })]));
    expect(awards[0]).not.toHaveProperty("xp");
    expect(awards[0]).not.toHaveProperty("score");
    expect(awards[0]).not.toHaveProperty("massGrams");
  });
});
