import { describe, expect, it } from "vitest";
import {
  buildEventCenteredCandidates,
  buildRouteEventCenteredContext,
  type RouteEventCenteredAnchor,
} from "./route-event-centered";

const event: RouteEventCenteredAnchor = {
  id: "event-1",
  title: "Fête de quartier",
  eventDate: "2026-09-03",
  locationLabel: "Place de test",
  latitude: 48.8566,
  longitude: 2.3522,
};

const candidates = [
  {
    id: "near",
    latitude: 48.857,
    longitude: 2.3522,
    score: 40,
    reason: "Priorité terrain",
  },
  {
    id: "far",
    latitude: 48.91,
    longitude: 2.3522,
    score: 100,
    reason: "Priorité terrain",
  },
];

describe("event-centered route scoring", () => {
  it("favors a nearby candidate while keeping the original score auditable", () => {
    const result = buildEventCenteredCandidates(candidates, event);

    expect(result.candidates.map((candidate) => candidate.id)).toEqual([
      "near",
      "far",
    ]);
    expect(result.candidates[0]?.eventCenteredInfluence).toEqual(
      expect.objectContaining({
        candidateId: "near",
        favored: true,
        priorityBefore: 40,
      }),
    );
    expect(result.candidates[0]?.reason).toContain("distance à l’événement");
  });

  it("is deterministic and makes the bounded radius explicit", () => {
    const first = buildEventCenteredCandidates([...candidates].reverse(), event);
    const second = buildEventCenteredCandidates(candidates, event);

    expect(first).toEqual(second);
    expect(second.impacts.find((impact) => impact.candidateId === "far"))
      .toEqual(expect.objectContaining({ favored: false }));
  });

  it("explains the temporal role and origin-to-event distance", () => {
    const context = buildRouteEventCenteredContext(
      event,
      { latitude: 48.8566, longitude: 2.3522 },
      [],
      ["near"],
      new Date("2026-09-04T12:00:00.000Z"),
    );

    expect(context).toEqual(expect.objectContaining({
      temporalStatus: "past",
      ageDays: 1.5,
      distanceFromOriginKm: 0,
      role: "post_event_anchor",
      radiusKm: 2,
      selectedCandidateIds: ["near"],
    }));
  });

  it("labels a future event as anticipation rather than observed pollution", () => {
    const context = buildRouteEventCenteredContext(
      { ...event, eventDate: "2026-09-06" },
      { latitude: 48.8566, longitude: 2.3522 },
      [],
      [],
      new Date("2026-09-04T12:00:00.000Z"),
    );

    expect(context.role).toBe("anticipation_anchor");
    expect(context.temporalStatus).toBe("future");
    expect(context.ageDays).toBeNull();
  });
});
