import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { expectNoSupabaseWrites } from "@/app/api/test-helpers";

describe("GET /api/gamification/badges/list boundary", () => {
  it("keeps the page loader and route read-only", () => {
    const listing = readFileSync(
      new URL("../../../../../lib/gamification/badges/listing.ts", import.meta.url),
      "utf8",
    );
    const route = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

    expectNoSupabaseWrites([listing, route]);

    expect(listing).not.toContain("auditXpAttribution");
    expect(listing).not.toContain("broadcastGamificationAnnouncement");
    expect(listing).not.toContain("sendGamificationNotification");
  });
});
