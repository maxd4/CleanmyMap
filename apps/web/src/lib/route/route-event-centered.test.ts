import { describe, expect, it } from "vitest";
import {
  buildEventCenteredCandidates,
  buildRouteEventCenteredContext,
} from "./route-event-centered";

describe("event-centered planning", () => {
  it("favors the nearest candidate and exposes the selected ids", () => {
    const event = {
      id: "event-1",
      title: "Événement",
      eventDate: "2026-09-05",
      locationLabel: "Paris",
      latitude: 48.8566,
      longitude: 2.3522,
    };
    const candidates = [
      { id: "far", latitude: 48.9, longitude: 2.4, score: 80, reason: "base" },
      {
        id: "near",
        latitude: 48.8566,
        longitude: 2.3522,
        score: 60,
        reason: "base",
        family: "observed" as const,
        evidence: {
          family: "observed" as const,
          source: "trash_spotter_spots" as const,
          proof: "validated" as const,
          observedAt: "2026-08-20T10:00:00.000Z",
        },
      },
    ];
    const ranked = buildEventCenteredCandidates(candidates, event);
    const context = buildRouteEventCenteredContext(
      event,
      { latitude: 48.85, longitude: 2.35 },
      ranked.impacts,
      [ranked.candidates[0]!.id],
      new Date("2026-09-05T12:00:00.000Z"),
    );

    expect(ranked.candidates[0]?.id).toBe("near");
    expect(ranked.candidates[0]).toMatchObject({
      family: "observed",
      evidence: { family: "observed", proof: "validated" },
    });
    expect(context.selectedCandidateIds).toEqual(["near"]);
    expect(context.temporalStatus).toBe("today");
  });
});
