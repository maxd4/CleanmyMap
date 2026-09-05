import { describe, expect, it } from "vitest";
import {
  buildRouteEventPressureByCandidate,
  calculateRouteEventPressure,
} from "./route-event-pressure";

const event = {
  id: "event-1",
  title: "Événement test",
  eventDate: "2026-09-01",
  locationLabel: "Paris",
  latitude: 48.8566,
  longitude: 2.3522,
};
const candidate = { id: "candidate-1", latitude: 48.8566, longitude: 2.3522 };

describe("route event pressure", () => {
  it("is deterministic, bounded and ignores invalid coordinates", () => {
    const now = new Date("2026-09-05T00:00:00.000Z");
    const result = calculateRouteEventPressure(event, candidate, {
      yes: 4,
      maybe: 2,
      no: 0,
      capacityTarget: 100,
    }, now);
    expect(result?.pressure).toBeGreaterThan(0);
    expect(result?.pressure).toBeLessThanOrEqual(1);
    expect(result?.scoreContribution).toBeLessThanOrEqual(20);
    expect(calculateRouteEventPressure({ ...event, latitude: null }, candidate, {
      yes: 1, maybe: 0, no: 0, capacityTarget: null,
    }, now)).toBeNull();
  });

  it("orders contributions by event id and keeps one candidate bucket", () => {
    const now = new Date("2026-09-05T00:00:00.000Z");
    const result = buildRouteEventPressureByCandidate(
      [event, { ...event, id: "event-0" }],
      new Map([["event-1", { yes: 1, maybe: 0, no: 0, capacityTarget: null }]]),
      [candidate],
      now,
    );
    expect(result.get(candidate.id)?.contributions.map(({ eventId }) => eventId)).toEqual([
      "event-0",
      "event-1",
    ]);
  });
});
