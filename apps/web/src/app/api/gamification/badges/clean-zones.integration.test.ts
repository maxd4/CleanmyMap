import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Test clean zones badge deduplication and XP awards
// Scenario: Multiple eligible clean zones → tier unlocks → XP awards one-time per tier

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

describe("Clean Zones Badge Integration", () => {
  const testUserId = `test-user-${Date.now()}`;
  const testActionId = `test-action-${Date.now()}`;

  beforeAll(async () => {
    // Create test user if needed
    // This is handled by auth system
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase
      .from("progression_events")
      .delete()
      .eq("user_id", testUserId);
    await supabase
      .from("trash_spotter_spots")
      .delete()
      .eq("user_id", testUserId);
  });

  it("should count only geolocalized, documented, validated clean zones and enforce 24h cooldown", async () => {
    // Create a recent validated clean zone (validated now) - should be excluded by 24h cooldown
    await supabase
      .from("trash_spotter_spots")
      .insert({
        user_id: testUserId,
        spot_type: "clean_place",
        status: "validated",
        latitude: 48.8566,
        longitude: 2.3522,
        notes: "Recent clean park area",
        validated_at: new Date().toISOString(),
      });

    // Create an older validated clean zone (older than 24h) - should be counted
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    await supabase.from("trash_spotter_spots").insert({
      user_id: testUserId,
      spot_type: "clean_place",
      status: "validated",
      latitude: 48.8566,
      longitude: 2.3522,
      notes: "Old clean park area",
      validated_at: oldDate,
    });

    // Create invalid: no geoloc
    await supabase.from("trash_spotter_spots").insert({
      user_id: testUserId,
      spot_type: "clean_place",
      status: "validated",
      latitude: null,
      longitude: null,
      notes: "No geoloc",
    });

    // Create invalid: no notes
    await supabase.from("trash_spotter_spots").insert({
      user_id: testUserId,
      spot_type: "clean_place",
      status: "validated",
      latitude: 48.8566,
      longitude: 2.3522,
      notes: null,
    });

    // Create invalid: not validated
    await supabase.from("trash_spotter_spots").insert({
      user_id: testUserId,
      spot_type: "clean_place",
      status: "pending",
      latitude: 48.8566,
      longitude: 2.3522,
      notes: "Pending validation",
    });

    // Query API
    const res = await fetch(
      `${process.env.VERCEL_URL || "http://localhost:3000"}/api/gamification/badges/list`,
      {
        headers: {
          "X-User-Id": testUserId,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const data = await res.json();
    const cleanZonesBadges = data.badges?.filter(
      (b: any) => b.id?.startsWith("clean-zones-")
    );
    const firstBadge = cleanZonesBadges?.[0];

    // Should count only 1 valid clean zone (the old one), recent one excluded by cooldown
    expect(firstBadge?.progress?.current).toBe(1);
  });

  it("should award XP only once per tier, preventing duplicate inserts", async () => {
    // Create one validated clean zone
    await supabase.from("trash_spotter_spots").insert({
      user_id: testUserId,
      spot_type: "clean_place",
      status: "validated",
      latitude: 48.9,
      longitude: 2.4,
      notes: "Test zone for XP",
    });

    // Call API twice
    const res1 = await fetch(
      `${process.env.VERCEL_URL || "http://localhost:3000"}/api/gamification/badges/list`,
      {
        headers: {
          "X-User-Id": testUserId,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    await res1.json();

    // Wait to ensure async XP award completes
    await new Promise((r) => setTimeout(r, 100));

    const res2 = await fetch(
      `${process.env.VERCEL_URL || "http://localhost:3000"}/api/gamification/badges/list`,
      {
        headers: {
          "X-User-Id": testUserId,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    await res2.json();

    // Count progression events for "Brise" tier (threshold 1)
    const { data: events } = await supabase
      .from("progression_events")
      .select("*")
      .eq("user_id", testUserId)
      .eq("source_table", "trash_spotter_spots")
      .eq("source_id", "clean-zone:clean-zones-breeze");

    // Should have exactly 1 event (unique index prevents duplicates)
    expect(events?.length).toBe(1);
  });

  it("should unlock multiple tiers based on count without duplicate XP", async () => {
    const multiTierUserId = `multi-tier-${Date.now()}`;

    // Create 8 validated clean zones (should unlock: Brise, Horizon, Azur, Aurore)
    for (let i = 0; i < 8; i++) {
      await supabase.from("trash_spotter_spots").insert({
        user_id: multiTierUserId,
        spot_type: "clean_place",
        status: "validated",
        latitude: 48.8 + i * 0.01,
        longitude: 2.3 + i * 0.01,
        notes: `Zone ${i}`,
      });
    }

    // Call API
    const res = await fetch(
      `${process.env.VERCEL_URL || "http://localhost:3000"}/api/gamification/badges/list`,
      {
        headers: {
          "X-User-Id": multiTierUserId,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    await res.json();
    await new Promise((r) => setTimeout(r, 200));

    // Check XP events
    const { data: xpEvents } = await supabase
      .from("progression_events")
      .select("*")
      .eq("user_id", multiTierUserId)
      .eq("source_table", "trash_spotter_spots")
      .order("source_id");

    // Should have events for tiers: Brise(1), Horizon(3), Azur(5), Aurore(8)
    expect(xpEvents?.length).toBeGreaterThanOrEqual(1);
    expect(xpEvents?.some((e) => e.source_id === "clean-zone:clean-zones-breeze")).toBe(true);

    // Cleanup
    await supabase
      .from("progression_events")
      .delete()
      .eq("user_id", multiTierUserId);
    await supabase
      .from("trash_spotter_spots")
      .delete()
      .eq("user_id", multiTierUserId);
  });

  it("should not count non-clean-place spot types", async () => {
    const spotTypeUserId = `spot-type-${Date.now()}`;

    // Create clean_place
    await supabase.from("trash_spotter_spots").insert({
      user_id: spotTypeUserId,
      spot_type: "clean_place",
      status: "validated",
      latitude: 48.8566,
      longitude: 2.3522,
      notes: "Clean place",
    });

    // Create trash spot (should not count)
    await supabase.from("trash_spotter_spots").insert({
      user_id: spotTypeUserId,
      spot_type: "trash",
      status: "validated",
      latitude: 48.8566,
      longitude: 2.3522,
      notes: "Trash spot",
    });

    // Call API
    const res = await fetch(
      `${process.env.VERCEL_URL || "http://localhost:3000"}/api/gamification/badges/list`,
      {
        headers: {
          "X-User-Id": spotTypeUserId,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const data = await res.json();
    const firstBadge = data.badges?.find(
      (b: any) => b.id === "clean-zones-breeze"
    );

    // Should count only 1 (clean_place), not 2
    expect(firstBadge?.progress?.current).toBe(1);

    // Cleanup
    await supabase
      .from("trash_spotter_spots")
      .delete()
      .eq("user_id", spotTypeUserId);
  });
});
