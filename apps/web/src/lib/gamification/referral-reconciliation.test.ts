import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, expect, it, vi } from "vitest";
import { removeReferralAwardForRejectedContribution } from "./referrals";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

const insertProgressionEventMock = vi.hoisted(() => vi.fn());
const loadActionRowsForUserMock = vi.hoisted(() => vi.fn());
const loadValidatedActionIdsForUserMock = vi.hoisted(() => vi.fn());
const refreshProgressionProfileMock = vi.hoisted(() => vi.fn());

vi.mock("./progression-data", () => ({
  insertProgressionEvent: insertProgressionEventMock,
  loadActionRowsForUser: loadActionRowsForUserMock,
  loadValidatedActionIdsForUser: loadValidatedActionIdsForUserMock,
}));

vi.mock("./progression-tracking", () => ({
  refreshProgressionProfile: refreshProgressionProfileMock,
}));

type Profile = {
  id: string;
  display_name: string;
  referral_code: string | null;
  referred_by_profile_id: string | null;
  referred_at: string;
};

function buildProfile(): Profile {
  return {
    id: "invitee-1",
    display_name: "Invité",
    referral_code: null,
    referred_by_profile_id: "inviter-1",
    referred_at: "2026-09-25T10:00:00.000Z",
  };
}

function createSupabase(events: Array<Record<string, unknown>>): SupabaseClient {
  const query = () => {
    const chain = {} as { eq: ReturnType<typeof vi.fn>; limit: ReturnType<typeof vi.fn> };
    chain.eq = vi.fn(() => chain);
    chain.limit = vi.fn(async () => ({ data: events, error: null }));
    return chain;
  };
  const deleteQuery = () => {
    const chain = {} as {
      eq: ReturnType<typeof vi.fn>;
      then: (resolve: (value: { error: null }) => unknown) => unknown;
    };
    chain.eq = vi.fn(() => chain);
    chain.then = (resolve) => {
      events.length = 0;
      return Promise.resolve(resolve({ error: null }));
    };
    return chain;
  };
  return {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: buildProfile(), error: null })) })),
          })),
        };
      }
      if (table === "progression_events") {
        return { select: vi.fn(query), delete: vi.fn(deleteQuery) };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  } as unknown as SupabaseClient;
}

function buildEvent(sourceId: string): Record<string, unknown> {
  return {
    metadata: {
      inviteeUserId: "invitee-1",
      contributionSourceTable: "actions",
      contributionSourceId: sourceId,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  insertProgressionEventMock.mockResolvedValue(true);
  loadActionRowsForUserMock.mockResolvedValue([]);
  loadValidatedActionIdsForUserMock.mockResolvedValue(new Set<string>());
  refreshProgressionProfileMock.mockResolvedValue(undefined);
});

it("supprime le parrainage et rafraîchit le profil quand la contribution unique est rejetée", async () => {
  const events = [buildEvent("action-1")];
  const supabase = createSupabase(events);
  loadActionRowsForUserMock.mockResolvedValue([
    { id: "action-1", status: "rejected", action_date: "2026-09-25", created_at: "2026-09-25" },
  ]);

  await removeReferralAwardForRejectedContribution(supabase, "invitee-1");

  expect(events).toHaveLength(0);
  expect(refreshProgressionProfileMock).toHaveBeenCalledWith(supabase, "inviter-1");
});

it("reconstruit la preuve sur une autre contribution CURRENT validée après rejet", async () => {
  const events = [buildEvent("action-1")];
  const supabase = createSupabase(events);
  loadActionRowsForUserMock.mockResolvedValue([
    { id: "action-1", status: "rejected", action_date: "2026-09-25", created_at: "2026-09-25" },
    { id: "action-2", status: "approved", action_date: "2026-09-26", created_at: "2026-09-26" },
  ]);
  loadValidatedActionIdsForUserMock.mockResolvedValue(new Set(["action-2"]));
  insertProgressionEventMock.mockImplementation(
    async (_client: SupabaseClient, params: Record<string, unknown>) => {
      events.push(params);
      return true;
    },
  );

  await removeReferralAwardForRejectedContribution(supabase, "invitee-1");

  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    sourceTable: "referral_contributions",
    sourceId: "referral-contribution:invitee-1",
    statusPhase: "validated",
    xpAwarded: 2,
    metadata: expect.objectContaining({ contributionSourceId: "action-2" }),
  });
  expect(refreshProgressionProfileMock).toHaveBeenCalledWith(supabase, "inviter-1");
});
