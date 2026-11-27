import { describe, expect, it, vi } from "vitest";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadTerritorialLegendAwardFacts,
  loadTerritorialLegendAwardHistory,
  loadTerritorialLegendAwardProofs,
} from "./award-facts";

const rows = [
  {
    proof_id: "user-1:commune:2025:*:conquest:0",
    user_id: "user-1",
    campaign_year: 2025,
    level: "commune",
    territory_code: "75056",
    award_kind: "conquest",
    threshold_days: 0,
    hold_started_on: "2025-01-01",
    held_through_on: "2025-01-07",
    awarded_on: "2025-01-07",
    valid_from: "2025-01-07",
    valid_until: null,
    validity_status: "active",
    source_fingerprint: "source-2025",
  },
  {
    proof_id: "user-1:commune:2025:75056:longevity:7",
    user_id: "user-1",
    campaign_year: 2025,
    level: "commune",
    territory_code: "75056",
    award_kind: "longevity",
    threshold_days: 7,
    hold_started_on: "2025-01-01",
    held_through_on: "2025-01-07",
    awarded_on: "2025-01-07",
    valid_from: "2025-01-07",
    valid_until: "2025-01-08",
    validity_status: "invalidated",
    source_fingerprint: "correction-2025",
  },
  {
    proof_id: "user-1:commune:2024:*:conquest:0",
    user_id: "user-1",
    campaign_year: 2024,
    level: "commune",
    territory_code: "75056",
    award_kind: "conquest",
    threshold_days: 0,
    hold_started_on: "2024-01-01",
    held_through_on: "2024-01-07",
    awarded_on: "2024-01-07",
    valid_from: "2024-01-07",
    valid_until: null,
    validity_status: "active",
    source_fingerprint: "source-2024",
  },
];

function fakeSupabase() {
  const conditions: Array<[string, unknown]> = [];
  const builder = {
    eq: vi.fn((field: string, value: unknown) => {
      conditions.push([field, value]);
      return builder;
    }),
    limit: vi.fn(async () => ({
      data: rows.filter((row) => conditions.every(([field, value]) => row[field as keyof typeof row] === value)),
      error: null,
    })),
  };
  const supabase = {
    from: vi.fn(() => ({ select: vi.fn(() => builder) })),
  } as unknown as SupabaseClient;
  return { supabase, conditions };
}

describe("territorial legend award history", () => {
  it("keeps current fact reconstruction active-only", async () => {
    const { supabase, conditions } = fakeSupabase();

    const proofs = await loadTerritorialLegendAwardProofs(supabase, "user-1", { campaignYear: 2025 });

    expect(proofs.map((proof) => proof.proofId)).toEqual(["user-1:commune:2025:*:conquest:0"]);
    expect(conditions).toEqual([
      ["user_id", "user-1"],
      ["campaign_year", 2025],
      ["validity_status", "active"],
    ]);
  });

  it("returns all audited proofs for exactly one campaign, including corrections", async () => {
    const { supabase, conditions } = fakeSupabase();

    const proofs = await loadTerritorialLegendAwardHistory(supabase, "user-1", { campaignYear: 2025 });

    expect(proofs.map((proof) => [proof.campaignYear, proof.validityStatus])).toEqual([
      [2025, "active"],
      [2025, "invalidated"],
    ]);
    expect(conditions).toEqual([
      ["user_id", "user-1"],
      ["campaign_year", 2025],
    ]);
  });
});

describe("complete territorial legend reconstruction evidence", () => {
  function strictSupabase(mode: "valid" | "truncated" | "malformed") {
    return {
      from: () => {
        const conditions: Array<[string, unknown]> = [];
        const builder = {
          select: () => builder,
          eq: (field: string, value: unknown) => { conditions.push([field, value]); return builder; },
          order: () => builder,
          range: async (from: number) => {
            const active = rows.filter((row) =>
              conditions.every(([field, value]) => row[field as keyof typeof row] === value));
            const data = active.slice(from, from + 1).map((row) => ({
              ...row,
              id: row.proof_id,
              source_fingerprint: mode === "malformed" ? null : row.source_fingerprint,
            }));
            return { data: mode === "truncated" && from > 0 ? [] : data, count: active.length, error: null };
          },
        };
        return builder;
      },
    } as unknown as SupabaseClient;
  }

  it("reads all active proofs, excluding invalidated history, despite a one-row page cap", async () => {
    const facts = await loadTerritorialLegendAwardFacts(strictSupabase("valid"), "user-1");
    expect(facts.map((fact) => fact.sourceId)).toEqual([rows[0]!.proof_id, rows[2]!.proof_id]);
  });

  it("rejects an incomplete or malformed source instead of removing rewards", async () => {
    await expect(loadTerritorialLegendAwardFacts(strictSupabase("truncated"), "user-1"))
      .rejects.toThrow("truncated page");
    await expect(loadTerritorialLegendAwardFacts(strictSupabase("malformed"), "user-1"))
      .rejects.toThrow("invalid proof");
  });
});
