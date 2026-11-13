import { describe, expect, it } from "vitest";
import {
  clearLocationPreferenceMetadata,
  createTerritoryLocationSelectionFromLegacyArrondissement,
  createLocationPreferencesMetadata,
  createTerritoryLocationMetadata,
  createGreaterParisMetadataFromZoneName,
  extractGreaterParisLocationPreferenceFromMetadata,
  extractTerritoryLocationPreferenceFromMetadata,
  extractResidenceLocationPreferenceFromMetadata,
  extractUserLocationPreferenceFromMetadata,
  extractLocationPreferencesFromMetadata,
  extractLocationPreferencesFromMetadataSources,
  parseCountryCode,
} from "./user-location-preference";

it("extracts a complete preference from metadata", () => {
  const result = extractUserLocationPreferenceFromMetadata({
    parisArrondissement: 11,
    parisLocationType: "work",
  });

  expect(result).toEqual({ arrondissement: 11, locationType: "work" });
});

it("normalizes a legacy arrondissement into the canonical territory selection", () => {
  expect(createTerritoryLocationSelectionFromLegacyArrondissement(11)).toEqual({
    country: "FR",
    level: "arrondissement",
    label: "Paris 11e arrondissement",
    subtitle: "Compatibilité historique",
    arrondissement: 11,
    arrondissementCity: "Paris",
  });
  expect(createTerritoryLocationSelectionFromLegacyArrondissement(44)).toBeNull();
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
      country: "FR",
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
      country: "FR",
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
      country: "FR",
      level: "arrondissement",
      label: "Paris 11e",
      subtitle: null,
      arrondissement: 11,
      arrondissementCity: "Paris",
      locationType: "work",
    });
});

it("excludes work preference from the map fallback reference", () => {
  expect(
    extractResidenceLocationPreferenceFromMetadata({
      territoryLocationType: "work",
      territoryLabel: "Lyon",
    }),
  ).toBeNull();
  expect(
    extractResidenceLocationPreferenceFromMetadata({
      territoryLocationType: "residence",
      territoryLabel: "Lyon",
    })?.locationType,
  ).toBe("residence");
});

it("reads independent residence and work selections from the canonical object", () => {
  const result = extractLocationPreferencesFromMetadata({
    ...createLocationPreferencesMetadata({
      residence: {
      country: "FR",
        level: "commune",
        label: "Lyon",
        subtitle: null,
        arrondissement: null,
        arrondissementCity: "Lyon",
      },
      work: {
      country: "FR",
        level: "arrondissement",
        label: "Paris 11e",
        subtitle: "Paris",
        arrondissement: 11,
        arrondissementCity: "Paris",
      },
    }),
  });

  expect(result.residence?.label).toBe("Lyon");
  expect(result.work?.arrondissement).toBe(11);
});

it("maps the legacy single preference to its matching independent field", () => {
  const result = extractLocationPreferencesFromMetadata({
    territoryLabel: "Lyon",
    territoryLocationType: "work",
  });
  expect(result).toMatchObject({ residence: null, work: { label: "Lyon" } });
});

it("clears location keys without touching unrelated Clerk metadata", () => {
  const result = clearLocationPreferenceMetadata({
    keepMe: "yes",
    territoryPreferences: { residence: null, work: null },
    territoryLabel: "Paris 1er",
    territoryLocationType: "residence",
  });
  expect(result).toEqual({ keepMe: "yes" });
});

it("canonicalizes the legacy France label and accepts ISO country codes", () => {
  expect(parseCountryCode("France")).toBe("FR");
  expect(parseCountryCode("ca")).toBe("CA");
  expect(parseCountryCode("CAN")).toBeNull();
  expect(parseCountryCode("ZZ")).toBeNull();
  expect(
    extractLocationPreferencesFromMetadata({
      territoryPreferences: {
        residence: {
          country: "CA",
          level: "province",
          label: "Québec",
          subtitle: "Canada",
          arrondissement: null,
          arrondissementCity: null,
          administrativeCode: "QC",
        },
        work: null,
      },
    }),
  ).toEqual({
    residence: {
      country: "CA",
      level: "province",
      label: "Québec",
      subtitle: "Canada",
      arrondissement: null,
      arrondissementCity: null,
      administrativeCode: "QC",
    },
    work: null,
  });
});

it("keeps country-specific administrative levels without French fields", () => {
  expect(
    extractLocationPreferencesFromMetadata({
      territoryPreferences: {
        residence: {
          country: "SN",
          level: "district",
          label: "Dakar",
          subtitle: null,
          arrondissement: null,
          arrondissementCity: null,
        },
        work: null,
      },
    }).residence,
  ).toEqual({
    country: "SN",
    level: "district",
    label: "Dakar",
    subtitle: null,
    arrondissement: null,
    arrondissementCity: null,
  });
});

it("does not infer French arrondissement fields from a foreign label", () => {
  expect(
    extractLocationPreferencesFromMetadata({
      territoryPreferences: {
        residence: {
          country: "CA",
          level: "province",
          label: "Paris, Ontario",
          subtitle: "Ontario",
          arrondissement: 5,
          arrondissementCity: "Paris",
          administrativeCode: "CA-ON",
        },
        work: null,
      },
    }).residence,
  ).toEqual({
    country: "CA",
    level: "province",
    label: "Paris, Ontario",
    subtitle: "Ontario",
    arrondissement: null,
    arrondissementCity: null,
    administrativeCode: "CA-ON",
  });
});

it("does not fall back to legacy French fields when canonical preferences are empty", () => {
  expect(
    extractLocationPreferencesFromMetadata({
      territoryPreferences: { residence: null, work: null },
      territoryLabel: "Paris 11e",
      territoryLocationType: "residence",
      parisArrondissement: 11,
    }),
  ).toEqual({ residence: null, work: null });
});

describe("metadata source precedence", () => {
  const legacyParis = {
    territoryLabel: "Paris 11e",
    territoryLocationType: "residence",
    parisArrondissement: 11,
  };

  const canadaResidence = {
    country: "CA",
    level: "province",
    label: "Québec",
    subtitle: "Canada",
    arrondissement: null,
    arrondissementCity: null,
    administrativeCode: "CA-QC",
  };

  it("does not let unsafe legacy metadata mask a cleared public preference", () => {
    expect(
      extractLocationPreferencesFromMetadataSources([
        legacyParis,
        { territoryPreferences: { residence: null, work: null } },
        null,
      ]),
    ).toEqual({ residence: null, work: null });
  });

  it("uses a foreign public canonical preference over unsafe legacy metadata", () => {
    expect(
      extractLocationPreferencesFromMetadataSources([
        legacyParis,
        { territoryPreferences: { residence: canadaResidence, work: null } },
      ]),
    ).toEqual({
      residence: canadaResidence,
      work: null,
    });
  });

  it("finds a private canonical preference before applying any legacy fallback", () => {
    expect(
      extractLocationPreferencesFromMetadataSources([
        legacyParis,
        {},
        { territoryPreferences: { residence: canadaResidence, work: null } },
      ]),
    ).toEqual({ residence: canadaResidence, work: null });
  });

  it("keeps the first canonical layer authoritative when canonical layers disagree", () => {
    expect(
      extractLocationPreferencesFromMetadataSources([
        { territoryPreferences: { residence: canadaResidence, work: null } },
        {
          territoryPreferences: {
            residence: {
              ...canadaResidence,
              country: "SN",
              level: "district",
              label: "Dakar",
              subtitle: "Sénégal",
              administrativeCode: "SN-DAK",
            },
            work: null,
          },
        },
      ]),
    ).toEqual({ residence: canadaResidence, work: null });
  });

  it("preserves the historical first-valid legacy fallback when no canonical object exists", () => {
    expect(
      extractLocationPreferencesFromMetadataSources([
        { territoryLabel: "", territoryLocationType: "residence" },
        legacyParis,
        { territoryLabel: "Paris 4e", territoryLocationType: "work", parisArrondissement: 4 },
      ]),
    ).toMatchObject({ residence: expect.objectContaining({ label: "Paris 11e" }), work: null });
  });

  it("keeps a work-only foreign preference and its administrative code", () => {
    expect(
      extractLocationPreferencesFromMetadataSources([
        legacyParis,
        {
          territoryPreferences: {
            residence: null,
            work: { ...canadaResidence, label: "Montréal", administrativeCode: "CA-QC-MTL" },
          },
        },
      ]),
    ).toEqual({
      residence: null,
      work: { ...canadaResidence, label: "Montréal", administrativeCode: "CA-QC-MTL" },
    });
  });
});
