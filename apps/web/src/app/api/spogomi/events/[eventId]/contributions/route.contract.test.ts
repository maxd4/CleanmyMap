import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

describe("SPOGOMI contributions privacy contract", () => {
  it("returns only the private contribution projection after the user link is proven", () => {
    expect(source).toContain('if (!event) return NextResponse.json({ status: "identity_unlinked" }');
    expect(source).toContain("event: { eventName: event.eventName, eventDate: event.eventDate, locationLabel: event.locationLabel, missions: certifiedMissions }");
    expect(source).not.toContain("event: { ...event, missions: certifiedMissions }");
  });
});
