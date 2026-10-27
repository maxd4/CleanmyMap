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
  eventError?: { message: string } | null;
  eventMissing?: boolean;
  rpcResult?: { data?: unknown; error?: { code?: string; message: string } | null };
  insertError?: { code?: string; message: string } | null;
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
    spogomi_events: [event],
  };
  const rpc = vi.fn(async () => options.rpcResult ?? { data: 0, error: null });
  const from = vi.fn((table: string) => {
    const builder: Record<string, ReturnType<typeof vi.fn>> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.in = vi.fn(() => builder);
    builder.order = vi.fn(() => builder);
    builder.range = vi.fn(async () => ({ data: responses[table] ?? [], count: (responses[table] ?? []).length, error: null }));
    builder.insert = vi.fn(async () => ({ data: null, error: options.insertError ?? null }));
    builder.maybeSingle = vi.fn(async () => table === "spogomi_events"
      ? { data: options.eventError || options.eventMissing ? null : event, error: options.eventError ?? null }
      : { data: null, error: null });
    return builder;
  });
  return { supabase: { from, rpc } as unknown as SupabaseClient, rpc, from };
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

  it("does not emit a second notification when the persisted recognition is already identical", async () => {
    const fixture = fakeSupabase(
      [{ id: "participant-1", clerk_id: "user-1", user_id: "user-1" }],
      [{
        id: "award-collector", user_id: "user-1", event_id: "event-1", division_id: null,
        badge_type_id: "spogomi_collector", proof_reference: "spogomi_participant:participant-1",
        certification_reference: "action_participants:user-1:confirmed", ranking_version: null, status: "active",
      }],
      { attestations: [{ id: "collector-1", participant_id: "participant-1", event_id: "event-1", kind: "collector", status: "certified", certified_at: "2026-06-01T10:00:00Z", evidence_reference: "measure:certified", certification_version: "v1" }] },
    );
    loadCurrentGamificationFactsMock.mockResolvedValue(factsFor("user-1"));

    await expect(reconcileSpogomiRecognition({ supabase: fixture.supabase, eventId: "event-1", actorClerkId: "organizer-1" }))
      .resolves.toMatchObject({ status: "complete", awards: 1 });
    const notificationInsert = (fixture.from.mock.results as Array<{ value?: { insert?: ReturnType<typeof vi.fn> } }>)
      .map((result) => result.value?.insert)
      .find((insert): insert is ReturnType<typeof vi.fn> => Boolean(insert));
    expect(notificationInsert).not.toHaveBeenCalled();
  });

  it("keeps unlinked participants and uncertified evidence out of recognition", async () => {
    const fixture = fakeSupabase(
      [{ id: "participant-1", clerk_id: "", user_id: "" }],
      [{
        id: "award-stale", user_id: "user-stale", event_id: "event-1", division_id: null,
        badge_type_id: "spogomi_old", proof_reference: "proof-old", certification_reference: "cert-old", ranking_version: null, status: "active",
      }],
      {
        actionParticipants: [],
        attestations: [
          { id: "mission-1", participant_id: "participant-1", event_id: "event-1", kind: "referee", status: "pending", certified_at: null, evidence_reference: "", certification_version: "v1" },
        ],
        rankings: [{ id: "ranking-1", event_id: "event-1", team_id: "team-participant-1", kind: "points", rank: 1, status: "draft", team_eligible: false, decision_version: "v1", source_reference: "" }],
      },
    );
    loadCurrentGamificationFactsMock.mockResolvedValue(factsFor("user-stale"));

    await expect(reconcileSpogomiRecognition({ supabase: fixture.supabase, eventId: "event-1", actorClerkId: "organizer-1" }))
      .resolves.toMatchObject({ status: "complete", awards: 0, rankingsConsumed: 0 });
    expect(reconcileUserGamificationMock).toHaveBeenCalledOnce();
  });

  it("fails closed when the source event is missing or cannot be read", async () => {
    await expect(reconcileSpogomiRecognition({
      supabase: fakeSupabase([], [], { eventMissing: true }).supabase,
      eventId: "missing-event",
      actorClerkId: "organizer-1",
    })).rejects.toThrow("SPOGOMI event not found");

    await expect(reconcileSpogomiRecognition({
      supabase: fakeSupabase([], [], { eventError: { message: "event read unavailable" } }).supabase,
      eventId: "event-1",
      actorClerkId: "organizer-1",
    })).rejects.toThrow("event read unavailable");
  });

  it("refuses recognition before certification and when the official timezone is invalid", async () => {
    await expect(reconcileSpogomiRecognition({
      supabase: fakeSupabase([], [], { event: { state: "draft" } }).supabase,
      eventId: "event-1",
      actorClerkId: "organizer-1",
    })).rejects.toThrow("doit être certifié");

    await expect(reconcileSpogomiRecognition({
      supabase: fakeSupabase([], [], { event: { official_timezone: "Not/A-Timezone" } }).supabase,
      eventId: "event-1",
      actorClerkId: "organizer-1",
    })).rejects.toThrow("fuseau officiel");
  });

  it("does not claim award persistence when the reconciliation RPC fails", async () => {
    const fixture = fakeSupabase(
      [{ id: "participant-1", clerk_id: "user-1", user_id: "user-1" }],
      [],
      { rpcResult: { data: null, error: { code: "40001", message: "serialization failure" } } },
    );
    loadCurrentGamificationFactsMock.mockResolvedValue(factsFor("user-1"));

    await expect(reconcileSpogomiRecognition({
      supabase: fixture.supabase,
      eventId: "event-1",
      actorClerkId: "organizer-1",
    })).rejects.toThrow("serialization failure");
    expect(reconcileUserGamificationMock).not.toHaveBeenCalled();
  });

  it("keeps notification uniqueness conflicts harmless and logs other notification failures", async () => {
    const existingAward = {
      id: "award-old", user_id: "user-1", event_id: "event-1", division_id: null,
      badge_type_id: "spogomi_old", proof_reference: "proof-old", certification_reference: "cert-old",
      ranking_version: null, status: "active",
    };
    const fixture = fakeSupabase(
      [{ id: "participant-1", clerk_id: "user-1", user_id: "user-1" }],
      [existingAward],
      { insertError: { code: "23505", message: "notification already exists" } },
    );
    loadCurrentGamificationFactsMock.mockResolvedValue(factsFor("user-1"));
    await expect(reconcileSpogomiRecognition({
      supabase: fixture.supabase,
      eventId: "event-1",
      actorClerkId: "organizer-1",
    })).resolves.toMatchObject({ status: "complete" });

    const failing = fakeSupabase(
      [{ id: "participant-1", clerk_id: "user-1", user_id: "user-1" }],
      [existingAward],
      { insertError: { code: "503", message: "notification store unavailable" } },
    );
    await expect(reconcileSpogomiRecognition({
      supabase: failing.supabase,
      eventId: "event-1",
      actorClerkId: "organizer-1",
    })).resolves.toMatchObject({ status: "complete" });
  });

  it("projects empty and historical collections without inventing event metadata", async () => {
    const empty = fakeSupabase([]);
    await expect((await import("./recognition-service")).loadSpogomiCollectionForUser(empty.supabase, "user-empty"))
      .resolves.toMatchObject({ awards: [], spogomiAwardCount: 0, spogomiEventsParticipated: 0 });

    const fixture = fakeSupabase([], [{
      id: "award-1", event_id: "event-1", division_id: null, badge_type_id: "spogomi_collector",
      event_year: 2026, event_local_date: "2026-06-01", awarded_at: "2026-06-01T10:00:00Z",
      proof_reference: "proof-1", certification_reference: "cert-1", ranking_version: null, status: "active",
    }]);
    const collection = await (await import("./recognition-service")).loadSpogomiCollectionForUser(fixture.supabase, "user-1");
    expect(collection.awards[0]).toMatchObject({ eventName: "SPOGOMI Paris", eventPublic: true });
  });

  it("distinguishes event recognition states and propagates both read errors", async () => {
    const makeClient = (event: unknown, awards: unknown, eventError: { message: string } | null = null, awardsError: { message: string } | null = null) => {
      const from = vi.fn(() => {
        type QueryChain = Record<string, ReturnType<typeof vi.fn>> & { then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown> };
        const chain = {} as QueryChain;
        for (const method of ["select", "eq", "order"]) chain[method] = vi.fn(() => chain);
        chain.maybeSingle = vi.fn(async () => ({ data: event, error: eventError }));
        chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve({ data: awards, error: awardsError }).then(resolve, reject);
        return chain;
      });
      return { from } as never;
    };
    const { loadSpogomiEventRecognitionForUser } = await import("./recognition-service");
    await expect(loadSpogomiEventRecognitionForUser(makeClient({ id: "event-1", state: "draft" }, [], null), { eventId: "event-1", userId: "user-1" }))
      .resolves.toEqual({ status: "pending_certification", awards: [] });
    await expect(loadSpogomiEventRecognitionForUser(makeClient({ id: "event-1", state: "certified" }, [], null), { eventId: "event-1", userId: "user-1" }))
      .resolves.toEqual({ status: "no_awards", awards: [] });
    await expect(loadSpogomiEventRecognitionForUser(makeClient(null, [], null), { eventId: "event-1", userId: "user-1" }))
      .resolves.toEqual({ status: "no_awards", awards: [] });
    await expect(loadSpogomiEventRecognitionForUser(makeClient({ id: "event-1", state: "certified" }, [], { message: "event failed" }), { eventId: "event-1", userId: "user-1" })).rejects.toThrow("event failed");
    await expect(loadSpogomiEventRecognitionForUser(makeClient({ id: "event-1", state: "certified" }, [], null, { message: "awards failed" }), { eventId: "event-1", userId: "user-1" })).rejects.toThrow("awards failed");
  });
});
