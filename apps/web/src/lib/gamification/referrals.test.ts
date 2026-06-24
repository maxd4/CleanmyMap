import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  buildReferralInviteUrl,
  claimReferralInviteForUser,
  ensureReferralInviteForUser,
  loadReferralSummary,
} from "./referrals";

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

type ReferralUpdateChain = {
  eq: (field: string, value: string) => ReferralUpdateChain;
  is: (field: string, value: unknown) => ReferralUpdateChain;
  select: (columns: string) => ReferralUpdateChain;
  maybeSingle: () => Promise<MaybeSingleResult<{ id: string; referral_code: string }>>;
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

describe("gamification referrals", () => {
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
        throw new Error(`Unexpected table ${table}`);
      }),
    } as unknown as SupabaseClient;

    const summary = await loadReferralSummary(supabaseMock, "user-1");
    expect(summary.referralCode).toBe("ABC123");
    expect(summary.inviteUrl).toContain("/sign-up?ref=ABC123");
    expect(summary.invitedUsersCount).toBe(3);
    expect(summary.badgeUnlocked).toBe(true);
    expect(summary.invitedBy?.displayName).toBe("Alice");
  });

  it("creates a referral code once and awards xp once", async () => {
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
              const chain: ReferralUpdateChain = {
                eq: vi.fn(() => chain),
                is: vi.fn(() => chain),
                select: vi.fn(() => chain),
                maybeSingle: vi.fn(async () => {
                  updates.push(payload);
                  profileRecord.referral_code = payload.referral_code;
                  return {
                    data: { ...profileRecord },
                    error: null,
                  };
                }),
              };
              return chain;
            }),
          };
        }
        if (table === "progression_events") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi
                      .fn()
                      .mockResolvedValue({ data: null, error: null }),
                  })),
                })),
              })),
            })),
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
    expect(inserts[0]).toMatchObject({
      source_table: "referral_invites",
      xp_awarded: 2,
      xp_base: 2,
    });
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
              const chain: ReferralUpdateChain = {
                eq: vi.fn(() => chain),
                is: vi.fn(async () => {
                  updates.push(payload);
                  return { error: null };
                }),
                select: vi.fn(() => chain),
                maybeSingle: vi.fn(async () => {
                  return {
                    data: {
                      id: "user-2",
                      referral_code: payload.referral_code,
                    },
                    error: null,
                  };
                }),
              };
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
});
