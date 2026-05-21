import { describe, expect, it } from "vitest";
import {
  createGreaterParisMetadataFromZoneName,
  extractUserLocationPreferenceFromMetadata,
} from "./user-location-preference";

describe("user-location-preference", () => {
  it("extracts a complete preference from metadata", () => {
    const result = extractUserLocationPreferenceFromMetadata({
      parisArrondissement: 11,
      parisLocationType: "work",
    });

    expect(result).toEqual({ arrondissement: 11, locationType: "work" });
  });

  it("returns null when metadata is incomplete", () => {
    expect(
      extractUserLocationPreferenceFromMetadata({
        parisArrondissement: 11,
      }),
    ).toBeNull();
    expect(
      extractUserLocationPreferenceFromMetadata({
        parisLocationType: "residence",
      }),
    ).toBeNull();
  });

  it("returns null when metadata values are invalid", () => {
    expect(
      extractUserLocationPreferenceFromMetadata({
        parisArrondissement: 44,
        parisLocationType: "residence",
      }),
    ).toBeNull();
    expect(
      extractUserLocationPreferenceFromMetadata({
        parisArrondissement: 9,
        parisLocationType: "office",
      }),
    ).toBeNull();
  });

  it("builds Greater Paris metadata from a known zone name", () => {
    expect(
      createGreaterParisMetadataFromZoneName("Boulogne-Billancourt", "work"),
    ).toMatchObject({
      zoneName: "Boulogne-Billancourt",
      zoneLocationType: "work",
    });
  });

  it("returns null for an unknown zone name", () => {
    expect(
      createGreaterParisMetadataFromZoneName("Nowhere City", "residence"),
    ).toBeNull();
  });
});
