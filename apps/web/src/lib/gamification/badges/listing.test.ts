import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { loadGamificationBadgesList } from "./listing";

function createEmptyQueryChain() {
  type EmptyQueryChain = {
    select: (columns: string) => EmptyQueryChain;
    eq: (field: string, value: string) => EmptyQueryChain;
    in: (field: string, values: string[]) => EmptyQueryChain;
    not: (field: string, operator: string, value: string | boolean) => EmptyQueryChain;
    limit: (value: number) => EmptyQueryChain;
    or: (expression: string) => EmptyQueryChain;
    maybeSingle: () => Promise<{ data: null; error: null }>;
    insert: (values: Record<string, unknown>) => Promise<{ data: null; error: null }>;
    then: (resolve: (value: { data: never[]; error: null }) => unknown) => Promise<unknown>;
  };

  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    not: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    or: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    insert: vi.fn(async () => ({ data: null, error: null })),
    then: (resolve: (value: { data: never[]; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: [], error: null })),
  } as EmptyQueryChain;

  return chain;
}

function createDataQueryChain<T extends Record<string, unknown>>(
  data: T[],
  inserted: Array<Record<string, unknown>>,
) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    not: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    or: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    insert: vi.fn(async (values: Record<string, unknown>) => {
      inserted.push(values);
      return { data: null, error: null };
    }),
    then: (resolve: (value: { data: T[]; error: null }) => unknown) =>
      Promise.resolve(resolve({ data, error: null })),
  };

  return chain;
}

describe("gamification badges listing", () => {
  it("uses the Supabase counter helper instead of direct count queries", () => {
    const source = readFileSync(new URL("./listing.ts", import.meta.url), "utf8");

    expect(source).toContain("loadGamificationUserCounters");
    expect(source).not.toContain('.from("user_points")');
    expect(source).not.toContain('.from("action_participants")');
    expect(source).not.toContain("loadValidatedCompleteActionCountForUser");
    expect(source).not.toContain("loadEligibleFormsCountFromActionRows");
  });

  it("loads badge counters through the Supabase RPC helper", async () => {
    const supabase = {
      rpc: vi.fn(async (name: string, params?: Record<string, unknown>) => {
        if (name === "load_gamification_user_counters") {
          expect(params).toEqual({ p_user_id: "user-1" });
          return {
            data: [
              {
                total_points: 0,
                approved_actions_count: 0,
                complete_actions_count: 0,
                visited_places_count: 0,
                eligible_forms_count: 0,
                participation_count: 0,
              },
            ],
            error: null,
          };
        }
        if (name === "notify_gamification") {
          return { data: null, error: null };
        }
        throw new Error(`Unexpected rpc: ${name}`);
      }),
      from: vi.fn((table: string) => {
        if (
          table === "trash_spotter_spots" ||
          table === "spots" ||
          table === "progression_events" ||
          table === "xp_audit"
        ) {
          return createEmptyQueryChain();
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient;

    const payload = await loadGamificationBadgesList(supabase, "user-1");

    expect(payload.totalPoints).toBe(0);
    expect(payload.totalBadges).toBeGreaterThanOrEqual(0);
    expect(payload.quizProgressions).toHaveLength(2);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "load_gamification_user_counters",
      { p_user_id: "user-1" },
    );
  });

  it("writes at most one progression event for a canonical place duplicated in the legacy table", async () => {
    const progressionInserts: Array<Record<string, unknown>> = [];
    const canonicalRow = {
      id: "canonical-id",
      status: "validated",
      latitude: 48.85,
      longitude: 2.35,
      notes: "Canonical place",
      validated_at: "2026-05-30T10:00:00.000Z",
    };
    const legacyRow = {
      id: "legacy-id",
      status: "validated",
      latitude: 48.850004,
      longitude: 2.350004,
      notes: "Legacy duplicate",
    };
    const supabase = {
      rpc: vi.fn(async (name: string) => {
        if (name === "load_gamification_user_counters") {
          return {
            data: [{
              total_points: 0,
              approved_actions_count: 0,
              complete_actions_count: 0,
              visited_places_count: 0,
              eligible_forms_count: 0,
              participation_count: 0,
            }],
            error: null,
          };
        }
        if (name === "notify_gamification") {
          return { data: null, error: null };
        }
        throw new Error(`Unexpected rpc: ${name}`);
      }),
      from: vi.fn((table: string) => {
        if (table === "trash_spotter_spots") {
          return createDataQueryChain([canonicalRow], []);
        }
        if (table === "spots") {
          return createDataQueryChain([legacyRow], []);
        }
        if (table === "progression_events") {
          return createDataQueryChain([], progressionInserts);
        }
        if (table === "xp_audit") {
          return createDataQueryChain([], []);
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient;

    await loadGamificationBadgesList(supabase, "user-1");

    expect(progressionInserts).toHaveLength(1);
    expect(progressionInserts[0]).toMatchObject({
      event_type: "clean_zone_task",
      source_table: "clean_zones",
      source_id: "clean-zone:coordinates:48.85000:2.35000",
    });
  });
});
