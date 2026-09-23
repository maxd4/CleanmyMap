import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("GET /api/gamification/badges/list boundary", () => {
  it("keeps the page loader and route read-only", () => {
    const listing = readFileSync(
      new URL("../../../../../lib/gamification/badges/listing.ts", import.meta.url),
      "utf8",
    );
    const route = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

    for (const source of [listing, route]) {
      expect(source).not.toMatch(/\.insert\s*\(/);
      expect(source).not.toMatch(/\.update\s*\(/);
      expect(source).not.toMatch(/\.delete\s*\(/);
      expect(source).not.toMatch(/\.upsert\s*\(/);
    }

    expect(listing).not.toContain("auditXpAttribution");
    expect(listing).not.toContain("broadcastGamificationAnnouncement");
    expect(listing).not.toContain("sendGamificationNotification");
  });
});
