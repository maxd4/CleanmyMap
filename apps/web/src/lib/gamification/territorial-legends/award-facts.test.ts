import { describe, expect, it, vi } from "vitest";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
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
