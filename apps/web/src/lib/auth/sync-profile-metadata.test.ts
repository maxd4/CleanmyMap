import { describe, expect, it } from "vitest";
import {
  buildCompatibilityProfileMetadata,
  resolveProfileArrondissement,
  type ProfileRow,
} from "./sync-profile-metadata";

const existingProfile = (overrides: Partial<ProfileRow> = {}): ProfileRow => ({
  id: "user-1",
  handle: "user",
  display_name_mode: null,
  avatar_url: null,
  metadata: {
    territoryPreferences: {
      residence: {
        country: "FR",
        level: "arrondissement",
        label: "Paris 11e",
        subtitle: "Paris",
        arrondissement: 11,
        arrondissementCity: "Paris",
      },
      work: null,
    },
    territoryCountry: "FR",
    territoryLevel: "arrondissement",
    territoryLabel: "Paris 11e",
    territoryArrondissement: 11,
    parisArrondissement: 11,
    keepMe: "yes",
  },
  paris_arrondissement: 11,
  ...overrides,
});

describe("territory compatibility projection", () => {
  it("projects the latest canonical foreign preference over stale Supabase metadata", () => {
    const result = buildCompatibilityProfileMetadata(existingProfile(), {
      territoryPreferences: {
        residence: {
          country: "CA",
          level: "province",
          label: "Québec",
          subtitle: "Canada",
          arrondissement: 11,
          arrondissementCity: "Paris",
          administrativeCode: "QC",
        },
        work: null,
      },
      profileSetupCompleted: true,
    });

    expect(result).toMatchObject({
      territoryPreferences: {
        residence: {
          country: "CA",
          level: "province",
          label: "Québec",
          administrativeCode: "QC",
        },
        work: null,
      },
      territoryCountry: "CA",
      territoryLevel: "province",
      territoryLabel: "Québec",
      territoryAdministrativeCode: "QC",
      keepMe: "yes",
      profileSetupCompleted: true,
    });
    expect(result).not.toHaveProperty("parisArrondissement");
    expect(result).not.toHaveProperty("territoryArrondissement");
    expect(result.territoryPreferences).toEqual({
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
    expect(resolveProfileArrondissement(result)).toBeNull();
  });

  it("recomputes a changed French preference and removes old arrondissement values", () => {
    const result = buildCompatibilityProfileMetadata(existingProfile(), {
      territoryPreferences: {
        residence: {
          country: "FR",
          level: "arrondissement",
          label: "Paris 4e",
          subtitle: "Paris",
          arrondissement: 4,
          arrondissementCity: "Paris",
        },
        work: null,
      },
    });

    expect(result).toMatchObject({
      territoryLabel: "Paris 4e",
      territoryArrondissement: 4,
      parisArrondissement: 4,
    });
    expect(result).not.toHaveProperty("territoryLabel", "Paris 11e");
    expect(resolveProfileArrondissement(result)).toBe(4);
  });

  it("clears the compatibility projection when both canonical preferences are removed", () => {
    const result = buildCompatibilityProfileMetadata(existingProfile(), {
      territoryPreferences: { residence: null, work: null },
    });

    expect(result).toEqual({
      territoryPreferences: { residence: null, work: null },
      keepMe: "yes",
    });
    expect(resolveProfileArrondissement(result)).toBeNull();
  });

  it("is idempotent when Clerk synchronizes the same canonical preference again", () => {
    const canonical = {
      territoryPreferences: {
        residence: {
          country: "SN",
          level: "district",
          label: "Dakar",
          subtitle: "Dakar",
          arrondissement: null,
          arrondissementCity: null,
          administrativeCode: "SN-DAK",
        },
        work: null,
      },
    };
    const first = buildCompatibilityProfileMetadata(existingProfile(), canonical);
    const second = buildCompatibilityProfileMetadata(
      existingProfile({ metadata: first, paris_arrondissement: null }),
      canonical,
    );

    expect(second).toEqual(first);
  });

  it("keeps the historical French fallback when canonical preferences are absent", () => {
    const result = buildCompatibilityProfileMetadata(
      existingProfile({ metadata: null, paris_arrondissement: 15 }),
      {},
    );

    expect(result).toMatchObject({
      territoryCountry: "FR",
      territoryLabel: "Paris 15e",
      territoryArrondissement: 15,
      parisArrondissement: 15,
    });
    expect(resolveProfileArrondissement(result)).toBe(15);
  });
});
