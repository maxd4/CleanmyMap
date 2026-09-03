import { describe, expect, it } from "vitest";
import {
  communityEventLocationToDatabase,
  distanceToCommunityEventKm,
  hasPreciseCommunityEventLocation,
  isValidCommunityEventCoordinatePair,
} from "./event-location";

describe("community event location contract", () => {
  it("accepts bounded finite coordinates and preserves provenance", () => {
    expect(isValidCommunityEventCoordinatePair(48.8566, 2.3522)).toBe(true);
    expect(
      communityEventLocationToDatabase({
        latitude: 48.8566,
        longitude: 2.3522,
        source: "manual",
      }),
    ).toEqual({
      latitude: 48.8566,
      longitude: 2.3522,
      location_source: "manual",
    });
  });

  it.each([
    [91, 2.35],
    [48.85, 181],
    [Number.NaN, 2.35],
    [48.85, Number.POSITIVE_INFINITY],
  ])("rejects invalid coordinate pair (%s, %s)", (latitude, longitude) => {
    expect(isValidCommunityEventCoordinatePair(latitude, longitude)).toBe(false);
  });

  it("keeps legacy events displayable but fail-closed for precise distance", () => {
    const legacyLocation = {
      label: "Paris 4e",
      latitude: null,
      longitude: null,
      source: null,
    } as const;

    expect(hasPreciseCommunityEventLocation(legacyLocation)).toBe(false);
    expect(
      distanceToCommunityEventKm(
        { latitude: 48.8566, longitude: 2.3522 },
        legacyLocation,
      ),
    ).toBeNull();
    expect(communityEventLocationToDatabase(undefined)).toEqual({
      latitude: null,
      longitude: null,
      location_source: null,
    });
  });

  it("measures a geolocated event without using its human label", () => {
    const distance = distanceToCommunityEventKm(
      { latitude: 48.8566, longitude: 2.3522 },
      { label: "Zone arbitraire", latitude: 48.8576, longitude: 2.3522 },
    );

    expect(distance).not.toBeNull();
    expect(distance ?? 0).toBeGreaterThan(0);
  });
});
