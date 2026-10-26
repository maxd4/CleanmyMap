import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actionsMock = vi.hoisted(() => vi.fn());
const validatedMock = vi.hoisted(() => vi.fn());

vi.mock("./progression-data", () => ({
  loadActionRowsForUser: actionsMock,
  loadCurrentValidatedActionIdsForUser: validatedMock,
}));

import { buildParticipationReferralFacts } from "./gamification-community-facts";

function supabaseFor(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    limit: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.limit.mockResolvedValue(result);
  return { from: vi.fn(() => query) } as unknown as SupabaseClient;
}

beforeEach(() => {
  vi.clearAllMocks();
  actionsMock.mockResolvedValue([]);
  validatedMock.mockResolvedValue(new Set());
});

describe("community referral fact builder", () => {
  it("keeps recovered participation evidence and selects the earliest useful validated contribution", async () => {
    actionsMock.mockImplementation(async (_supabase: SupabaseClient, userId: string) => userId === "child-1"
      ? [
          { id: "late", status: "approved", action_date: "2026-02-01", created_at: "2026-02-01" },
          { id: "early", status: "approved", action_date: "2026-01-01", created_at: "2026-01-01" },
          { id: "rejected", status: "rejected", action_date: "2025-01-01", created_at: "2025-01-01" },
        ]
      : []);
    validatedMock.mockResolvedValue(new Set(["late", "early", "rejected"]));
    const facts = await buildParticipationReferralFacts(
      supabaseFor({ data: [{ id: "child-1", referred_at: "2025-12-01" }, { id: null }], error: null }),
      "user-1",
      [{ action_id: "action-1", participation_source: "post_action_claim", joined_at: "2026-01-03" }],
    );

    expect(facts).toHaveLength(2);
    expect(facts[0]).toMatchObject({ mechanicId: "participation_retrouvee", sourceId: "participation-retrieved:user-1" });
    expect(facts[1]).toMatchObject({
      mechanicId: "parrainage_utile",
      sourceId: "referral-contribution:child-1",
      metadata: { contributionSourceId: "early" },
    });
  });

  it("does not credit pending, rejected or absent useful contributions", async () => {
    actionsMock.mockResolvedValue([
      { id: "pending", status: "pending", action_date: "2026-01-01", created_at: "2026-01-01" },
      { id: "rejected", status: "rejected", action_date: "2026-01-02", created_at: "2026-01-02" },
    ]);
    validatedMock.mockResolvedValue(new Set(["pending", "rejected"]));
    const facts = await buildParticipationReferralFacts(
      supabaseFor({ data: [{ id: "child-1" }], error: null }),
      "user-1",
      [{ action_id: "action-1", participation_source: "manual" }],
    );
    expect(facts).toEqual([]);
  });

  it("fails closed when the referral source cannot be read", async () => {
    const facts = await buildParticipationReferralFacts(
      supabaseFor({ data: null, error: { message: "profiles unavailable" } }),
      "user-1",
      [{ action_id: "action-1", participation_source: "post_action_claim", updated_at: "2026-01-03" }],
    );
    expect(facts).toHaveLength(1);
    expect(facts[0]?.mechanicId).toBe("participation_retrouvee");
    expect(actionsMock).not.toHaveBeenCalled();
  });

  it("returns no fact for participation rows without a recovered action", async () => {
    const facts = await buildParticipationReferralFacts(
      supabaseFor({ data: [], error: null }),
      "user-1",
      [{ action_id: null, participation_source: "post_action_claim" }, { action_id: "x", participation_source: "manual" }],
    );
    expect(facts).toEqual([]);
  });
});
