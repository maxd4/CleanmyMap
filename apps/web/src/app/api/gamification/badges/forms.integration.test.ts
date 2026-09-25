import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gamificationEventRegistry } from "@/lib/gamification/progression-utils";

describe("Forms compatibility boundary", () => {
  it("keeps historical Forms events registered without treating them as CURRENT progression", () => {
    const registry = gamificationEventRegistry();

    expect(registry.form_tier_unlock).toEqual({
      classification: "non_progression",
      reason: expect.stringContaining("COMPATIBILITY"),
    });
    expect(registry.form_bonus).toEqual({
      classification: "non_progression",
      reason: expect.stringContaining("COMPATIBILITY"),
    });
  });

  it("does not let the rebuild or badge listing create a Forms axis", () => {
    const rebuild = readFileSync(
      new URL("../../../../lib/gamification/badges/rebuild.ts", import.meta.url),
      "utf8",
    );
    const listing = readFileSync(
      new URL("../../../../lib/gamification/badges/listing.ts", import.meta.url),
      "utf8",
    );

    expect(rebuild).not.toContain('eventType: "form_tier_unlock"');
    expect(rebuild).not.toContain('eventType: "form_bonus"');
    expect(listing).not.toContain("buildFormsBadges");
  });
});
