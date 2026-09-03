import { describe, expect, it } from "vitest";
import {
  buildRouteEventPressureByCandidate,
  calculateRouteEventPressure,
  combineRouteEventPressures,
  routeEventAgeDays,
  routeEventRecencyFactor,
  type RouteEventAttendance,
  type RouteEventRecord,
} from "./route-event-pressure";

const now = new Date("2026-09-03T12:00:00.000Z");
const candidate = {
  id: "spot-1",
  latitude: 48.8566,
  longitude: 2.3522,
};
const attendance: RouteEventAttendance = {
  yes: 6,
  maybe: 2,
  no: 0,
  capacityTarget: 60,
};

function event(overrides: Partial<RouteEventRecord> = {}): RouteEventRecord {
  return {
    id: "event-1",
    title: "Événement de test",
    eventDate: "2026-09-03T11:00:00.000Z",
    locationLabel: "Paris",
    latitude: 48.8566,
    longitude: 2.3522,
    ...overrides,
  };
}

describe("route event pressure", () => {
  it("gives a strong, deterministic pressure to a recent nearby event", () => {
    const contribution = calculateRouteEventPressure(
      event(),
      candidate,
      attendance,
      now,
    );

    expect(contribution).not.toBeNull();
    expect(contribution?.ageDays).toBeCloseTo(1 / 24, 8);
    expect(contribution?.distanceKm).toBe(0);
    expect(contribution?.pressure).toBeGreaterThan(0.7);
    expect(contribution?.scoreContribution).toBeCloseTo(
      (contribution?.pressure ?? 0) * 20,
      10,
    );
  });

  it("reduces pressure with distance and removes it outside the spatial window", () => {
    const close = calculateRouteEventPressure(event(), candidate, attendance, now);
    const far = calculateRouteEventPressure(
      event({ longitude: 2.365 }),
      candidate,
      attendance,
      now,
    );
    const outside = calculateRouteEventPressure(
      event({ longitude: 2.38 }),
      candidate,
      attendance,
      now,
    );

    expect(close?.pressure).toBeGreaterThan(far?.pressure ?? 0);
    expect(far?.distanceKm).toBeGreaterThan(0);
    expect(far?.distanceKm).toBeLessThan(2);
    expect(outside).toBeNull();
  });

  it("decays strongly through the first 16 days and reaches zero at 8 weeks", () => {
    expect(routeEventAgeDays("2026-09-02T12:00:00.000Z", now)).toBe(1);
    expect(routeEventRecencyFactor(0)).toBe(1);
    expect(routeEventRecencyFactor(14)).toBeGreaterThan(
      routeEventRecencyFactor(30),
    );
    expect(routeEventRecencyFactor(30)).toBeGreaterThan(
      routeEventRecencyFactor(55),
    );
    expect(routeEventRecencyFactor(56)).toBe(0);
    expect(
      calculateRouteEventPressure(
        event({ eventDate: "2026-07-09T12:00:00.000Z" }),
        candidate,
        attendance,
        now,
      ),
    ).toBeNull();
  });

  it("fails closed for events without coordinates and keeps future events out", () => {
    expect(
      calculateRouteEventPressure(
        event({ latitude: null, longitude: null }),
        candidate,
        attendance,
        now,
      ),
    ).toBeNull();
    expect(
      calculateRouteEventPressure(
        event({ eventDate: "2026-09-04" }),
        candidate,
        attendance,
        now,
      ),
    ).toBeNull();
    expect(
      buildRouteEventPressureByCandidate(
        [event({ latitude: null, longitude: null })],
        new Map([["event-1", attendance]]),
        [candidate],
        now,
      ),
    ).toEqual(new Map());
  });

  it("combines multiple events in a bounded deterministic way", () => {
    const contributions = [
      calculateRouteEventPressure(event({ id: "event-b" }), candidate, attendance, now),
      calculateRouteEventPressure(event({ id: "event-a" }), candidate, attendance, now),
    ].filter((value) => value !== null);
    const combined = combineRouteEventPressures(contributions);

    expect(combined.combinedPressure).toBeGreaterThan(0);
    expect(combined.combinedPressure).toBeLessThanOrEqual(1);
    expect(combined.scoreBoost).toBeLessThanOrEqual(20);
    expect(combined.contributions.map(({ eventId }) => eventId)).toEqual([
      "event-a",
      "event-b",
    ]);
  });

  it("has no event influence when the event source is empty", () => {
    expect(
      buildRouteEventPressureByCandidate([], new Map(), [candidate], now),
    ).toEqual(new Map());
  });
});
