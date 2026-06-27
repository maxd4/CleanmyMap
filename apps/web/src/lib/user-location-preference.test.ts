import { expect, it } from "vitest";
import {
  createTerritoryLocationMetadata,
  createGreaterParisMetadataFromZoneName,
  extractGreaterParisLocationPreferenceFromMetadata,
  extractTerritoryLocationPreferenceFromMetadata,
  extractUserLocationPreferenceFromMetadata,
} from "./user-location-preference";

it("extracts a complete preference from metadata", () => {
  const result = extractUserLocationPreferenceFromMetadata({
    parisArrondissement: 11,
    parisLocationType: "work",
  });

  expect(result).toEqual({ arrondissement: 11, locationType: "work" });
});

  it("extracts a national territory preference from the new metadata shape", () => {
    const result = extractTerritoryLocationPreferenceFromMetadata({
      territoryCountry: "France",
      territoryLevel: "department",
      territoryLabel: "Rhône",
      territorySubtitle: "Auvergne-Rhône-Alpes",
      territoryLocationType: "residence",
    });

    expect(result).toEqual({
      country: "France",
      level: "department",
      label: "Rhône",
      subtitle: "Auvergne-Rhône-Alpes",
      arrondissement: null,
      arrondissementCity: null,
      locationType: "residence",
    });
  });

  it("extracts arrondissement preferences from non-Paris city labels", () => {
    const result = extractTerritoryLocationPreferenceFromMetadata({
      territoryLocationType: "work",
      territoryLabel: "Lyon 2e",
      territorySubtitle: "Lyon",
    });

    expect(result).toEqual({
      country: "France",
      level: "arrondissement",
      label: "Lyon 2e",
      subtitle: "Lyon",
      arrondissement: 2,
      arrondissementCity: "Lyon",
      locationType: "work",
    });
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

  it("builds national metadata from a selection", () => {
    expect(
      createTerritoryLocationMetadata(
        {
          country: "France",
          level: "arrondissement",
          label: "Paris 11e",
          subtitle: "Paris",
          arrondissement: 11,
          arrondissementCity: "Paris",
        },
        "work",
      ),
    ).toMatchObject({
      territoryCountry: "France",
      territoryLevel: "arrondissement",
      territoryLabel: "Paris 11e",
      territoryArrondissement: 11,
      territoryArrondissementCity: "Paris",
      parisArrondissement: 11,
      parisLocationType: "work",
      territoryLocationType: "work",
    });
  });

  it("builds Greater Paris metadata from a known zone name", () => {
    expect(
      createGreaterParisMetadataFromZoneName("Boulogne-Billancourt", "work"),
    ).toMatchObject({
      zoneName: "Boulogne-Billancourt",
      territoryLabel: "Boulogne-Billancourt",
      territoryLocationType: "work",
    });
  });

  it("falls back to generic metadata for an unknown zone name", () => {
    expect(
      createGreaterParisMetadataFromZoneName("Nowhere City", "residence"),
    ).toMatchObject({
      territoryLabel: "Nowhere City",
      territoryLocationType: "residence",
    });
  });

  it("keeps arrondissement preference compatibility through the national extractor", () => {
    const result = extractGreaterParisLocationPreferenceFromMetadata({
      territoryLocationType: "work",
      territoryLabel: "Paris 11e",
    });

    expect(result).toEqual({
      country: "France",
      level: "arrondissement",
      label: "Paris 11e",
      subtitle: null,
      arrondissement: 11,
      arrondissementCity: "Paris",
      locationType: "work",
    });
});
