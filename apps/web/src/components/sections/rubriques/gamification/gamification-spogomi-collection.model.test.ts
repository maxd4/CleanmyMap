import { describe, expect, it } from "vitest";
import { filterSpogomiCollection, getSpogomiCollectionKind } from "./gamification-spogomi-collection.model";
import type { SpogomiCollectionAward } from "@/lib/spogomi/collection";

function award(overrides: Partial<SpogomiCollectionAward> = {}): SpogomiCollectionAward {
  return {
    id: "award-1", eventId: "event-1", badgeTypeId: "spogomi_collector", eventYear: 2026,
    eventLocalDate: "2026-06-01", awardedAt: "2026-06-01T12:00:00Z", rankingVersion: null,
    status: "active", eventName: "Paris propre", eventSlug: "paris-propre", eventState: "certified", eventPublic: true,
    ...overrides,
  };
}

describe("SPOGOMI collection filters", () => {
  it("keeps repeated badge types as distinct event occurrences", () => {
    const awards = [award(), award({ id: "award-2", eventId: "event-2", eventName: "Nice propre" })];
    expect(filterSpogomiCollection(awards, { year: "all", kind: "all", eventId: "all" })).toHaveLength(2);
  });

  it("filters by year, event and role family without merging podium families", () => {
    const awards = [
      award({ eventYear: 2026 }),
      award({ id: "award-2", eventYear: 2027, badgeTypeId: "spogomi_referee" }),
      award({ id: "award-3", badgeTypeId: "spogomi_points_gold" }),
    ];
    expect(filterSpogomiCollection(awards, { year: 2027, kind: "referee", eventId: "all" })).toHaveLength(1);
    expect(getSpogomiCollectionKind("spogomi_points_gold")).toBe("podium");
    expect(filterSpogomiCollection(awards, { year: "all", kind: "podium", eventId: "all" })).toHaveLength(1);
  });
});
