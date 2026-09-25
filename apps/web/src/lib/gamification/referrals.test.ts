import type { SupabaseClient } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";
import {
  awardReferralForUsefulContribution,
  buildReferralInviteUrl,
  claimReferralInviteForUser,
  ensureReferralInviteForUser,
  loadReferralSummary,
} from "./referrals";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

const auditXpAttributionMock = vi.hoisted(() => vi.fn());
const broadcastGamificationAnnouncementMock = vi.hoisted(() => vi.fn());

vi.mock("./notifications", () => ({
  auditXpAttribution: auditXpAttributionMock,
}));

vi.mock("@/lib/gamification/announcements", () => ({
  broadcastGamificationAnnouncement: broadcastGamificationAnnouncementMock,
}));

type ReferralProfileRow = {
  id: string;
  display_name: string | null;
  referral_code: string | null;
  referred_by_profile_id: string | null;
  referred_at: string | null;
};

type MaybeSingleResult<T> = {
  data: T | null;
  error: null;
};

type CountResult = {
  data: null;
  count: number;
  error: null;
};

type ProfilesCountQuery = {
  eq: (field: string, value: string) => Promise<CountResult>;
};

type ProfilesMaybeSingleQuery<T> = {
  eq: (field: string, value: string) => {
    maybeSingle: () => Promise<MaybeSingleResult<T>>;
  };
};

type ReferralAwardsQuery = {
  eq: (field: string, value: string) => ReferralAwardsQuery;
  limit: (value: number) => Promise<{ data: Array<{ xp_awarded: number }>; error: null }>;
};

type ReferralUpdateChain = {
  eq: (field: string, value: string) => ReferralUpdateChain;
  is: (field: string, value: unknown) => ReferralUpdateChain;
  select: (columns: string) => ReferralUpdateChain;
  maybeSingle: () => Promise<MaybeSingleResult<{ id: string; referral_code: string | null }>>;
};

type ReferralClaimUpdateChain = {
  eq: (field: string, value: string) => ReferralClaimUpdateChain;
  is: (field: string, value: unknown) => Promise<{ error: null }>;
};

function createCountQuery(count: number): ProfilesCountQuery {
  return {
    eq: vi.fn(async () => ({ data: null, count, error: null })),
  };
}

function createMaybeSingleQuery<T>(data: T | null): ProfilesMaybeSingleQuery<T> {
  return {
    eq: vi.fn(() => ({
      maybeSingle: vi.fn(async () => ({ data, error: null })),
    })),
  };
}

function createReferralAwardsQuery(
  rows: Array<{ xp_awarded: number }> = [],
): ReferralAwardsQuery {
  const query = {} as ReferralAwardsQuery;
  query.eq = vi.fn(() => query);
  query.limit = vi.fn(async () => ({ data: rows, error: null }));
  return query;
}

it("builds a referral url with the code in query string", () => {
  const url = buildReferralInviteUrl("ab12cd34ef");
  expect(url).toContain("/sign-up?ref=AB12CD34EF");
});

it("loads a referral summary from profiles", async () => {
  const supabaseMock = {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(
            (
              columns: string,
              options?: { count?: string; head?: boolean },
            ) => {
              if (options?.count === "exact" && options.head) {
                return createCountQuery(3);
              }
              if (columns.includes("referral_code")) {
                return createMaybeSingleQuery<ReferralProfileRow>({
                  id: "user-1",
                  display_name: "Benoît",
                  referral_code: "ABC123",
                  referred_by_profile_id: "inviter-1",
                  referred_at: null,
                });
              }
              if (columns.includes("display_name")) {
                return createMaybeSingleQuery<Pick<ReferralProfileRow, "id" | "display_name">>({
                  id: "inviter-1",
                  display_name: "Alice",
                });
              }
              return createMaybeSingleQuery<ReferralProfileRow>({
                id: "user-1",
                display_name: "Benoît",
                referral_code: "ABC123",
                referred_by_profile_id: "inviter-1",
                referred_at: null,
              });
            },
          ),
        };
      }
      if (table === "progression_events") {
        return {
          select: vi.fn(() => createReferralAwardsQuery()),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  } as unknown as SupabaseClient;

  const summary = await loadReferralSummary(supabaseMock, "user-1");
  expect(summary.referralCode).toBe("ABC123");
  expect(summary.inviteUrl).toContain("/sign-up?ref=ABC123");
  expect(summary.invitedUsersCount).toBe(3);
  expect(summary.badgeUnlocked).toBe(false);
  expect(summary.referralAwardedXp).toBe(0);
  expect(summary.invitedBy?.displayName).toBe("Alice");
});

it("creates a referral code without awarding xp", async () => {
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<{ referral_code: string }> = [];
  const profileRecord = {
    id: "user-1",
    display_name: "Benoît",
    referral_code: null as string | null,
    referred_by_profile_id: null as string | null,
    referred_at: null as string | null,
  };
  const supabaseMock = {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...profileRecord },
                error: null,
              }),
            })),
          })),
          update: vi.fn((payload: { referral_code: string }) => {
            const chain = {} as ReferralUpdateChain;
            chain.eq = vi.fn(() => chain);
            chain.is = vi.fn(() => chain);
            chain.select = vi.fn(() => chain);
            chain.maybeSingle = vi.fn(async () => {
              updates.push(payload);
              profileRecord.referral_code = payload.referral_code;
              return {
                data: {
                  id: profileRecord.id,
                  referral_code: profileRecord.referral_code,
                },
                error: null,
              };
            });
            return chain;
          }),
        };
      }
      if (table === "progression_events") {
        return {
          select: vi.fn(() => createReferralAwardsQuery()),
          insert: vi.fn(async (payload: Record<string, unknown>) => {
            inserts.push(payload);
            return { error: null };
          }),
          delete: vi.fn(),
        };
      }
      if (table === "points_ledger") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: null, error: null }),
              })),
            })),
          })),
          insert: vi.fn(async () => ({ error: null })),
        };
      }
      if (table === "xp_audit") {
        return {
          insert: vi.fn(async () => ({ error: null })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  } as unknown as SupabaseClient;

  const result = await ensureReferralInviteForUser(supabaseMock, "user-1");
  expect(result.created).toBe(true);
  expect(result.summary.referralCode).toBeTruthy();
  expect(updates[0]).toHaveProperty("referral_code");
  expect(inserts).toHaveLength(0);
  expect(result.summary.badgeUnlocked).toBe(false);
  expect(result.summary.referralAwardedXp).toBe(0);
});

it("claims a referral code once", async () => {
  const updates: Array<{ referred_by_profile_id: string; referred_at?: string }> = [];
  const supabaseMock = {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((value: string) => {
              if (value === "user-2") {
                return {
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "user-2",
                      referred_by_profile_id: null,
                    },
                    error: null,
                  }),
                };
              }
              return {
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "inviter-1",
                    display_name: "Alice",
                  },
                  error: null,
                }),
              };
            }),
          })),
          update: vi.fn((payload: { referred_by_profile_id: string; referred_at: string }) => {
            const chain = {} as ReferralClaimUpdateChain;
            chain.eq = vi.fn(() => chain);
            chain.is = vi.fn(async () => {
              updates.push(payload);
              return { error: null };
            });
            return chain;
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  } as unknown as SupabaseClient;

  const result = await claimReferralInviteForUser(supabaseMock, {
    userId: "user-2",
    code: "abc123",
  });

  expect(result.claimed).toBe(true);
  expect(result.inviterUserId).toBe("inviter-1");
  expect(updates[0]).toMatchObject({
    referred_by_profile_id: "inviter-1",
  });
});

it("awards the inviter only on the invitee's first useful contribution", async () => {
  const events: Array<Record<string, unknown>> = [];
  const profiles = new Map([
    [
      "invitee-1",
      {
        id: "invitee-1",
        display_name: "Invité",
        referral_code: null,
        referred_by_profile_id: "inviter-1",
        referred_at: "2026-09-25T10:00:00.000Z",
      },
    ],
    [
      "self-referred",
      {
        id: "self-referred",
        display_name: "Auto",
        referral_code: "AUTO123",
        referred_by_profile_id: "self-referred",
        referred_at: "2026-09-25T10:00:00.000Z",
      },
    ],
  ]);
  const supabaseMock = {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_field: string, value: string) => ({
              maybeSingle: vi.fn(async () => ({
                data: profiles.get(value) ?? null,
                error: null,
              })),
            })),
          })),
        };
      }
      if (table === "progression_events") {
        return {
          insert: vi.fn(async (payload: Record<string, unknown>) => {
            const duplicate = events.some(
              (event) =>
                event.user_id === payload.user_id &&
                event.event_type === payload.event_type &&
                event.source_table === payload.source_table &&
                event.source_id === payload.source_id &&
                event.status_phase === payload.status_phase,
            );
            if (duplicate) {
              return { error: { code: "23505", message: "duplicate" } };
            }
            events.push(payload);
            return { error: null };
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  } as unknown as SupabaseClient;

  const first = await awardReferralForUsefulContribution(supabaseMock, {
    inviteeUserId: "invitee-1",
    contributionSourceTable: "actions",
    contributionSourceId: "action-1",
    occurredOn: "2026-09-25",
  });
  const replay = await awardReferralForUsefulContribution(supabaseMock, {
    inviteeUserId: "invitee-1",
    contributionSourceTable: "actions",
    contributionSourceId: "action-1",
    occurredOn: "2026-09-25",
  });
  const secondContribution = await awardReferralForUsefulContribution(supabaseMock, {
    inviteeUserId: "invitee-1",
    contributionSourceTable: "actions",
    contributionSourceId: "action-2",
    occurredOn: "2026-09-26",
  });
  const selfReferral = await awardReferralForUsefulContribution(supabaseMock, {
    inviteeUserId: "self-referred",
    contributionSourceTable: "actions",
    contributionSourceId: "action-self",
  });

  expect(first).toMatchObject({
    awarded: true,
    inviterUserId: "inviter-1",
    inviteeUserId: "invitee-1",
  });
  expect(replay.awarded).toBe(false);
  expect(secondContribution.awarded).toBe(false);
  expect(selfReferral.awarded).toBe(false);
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    user_id: "inviter-1",
    event_type: "community_referral_invite",
    source_table: "referral_contributions",
    source_id: "referral-contribution:invitee-1",
    status_phase: "validated",
    xp_base: 2,
    xp_awarded: 2,
    metadata: {
      inviteeUserId: "invitee-1",
      contributionSourceTable: "actions",
      contributionSourceId: "action-1",
    },
  });
  expect(auditXpAttributionMock).toHaveBeenCalledTimes(1);
  expect(broadcastGamificationAnnouncementMock).toHaveBeenCalledTimes(1);
});
