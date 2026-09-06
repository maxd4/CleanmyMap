import { describe, expect, it } from "vitest";
import {
  ASSOCIATION_SELECTION_OPTIONS,
  ORGANIZER_DIRECTORY,
  buildEntrepriseAssociationName,
  getOrganizerDirectoryEntries,
  getOrganizerDirectoryEntryByValue,
  isAssociationSelectionOption,
  isKnownOrganizerDirectoryValue,
  isValidAssociationName,
  normalizeAssociationScopeValue,
  normalizeAssociationSelectionForPrefill,
} from "./association-options";
import { ORGANIZER_TYPE_VALUES } from "./organizer-type";

describe("organizer directory", () => {
  it("keeps directory ids unique and excludes spontaneous actions", () => {
    const ids = ORGANIZER_DIRECTORY.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ORGANIZER_DIRECTORY.map((entry) => entry.organizerType)).not.toContain(
      "spontaneous",
    );
  });

  it("uses only canonical organizer types", () => {
    const validTypes = new Set<string>(ORGANIZER_TYPE_VALUES);

    expect(
      ORGANIZER_DIRECTORY.every((entry) => validTypes.has(entry.organizerType)),
    ).toBe(true);
  });

  it("does not invent a local location for national structures", () => {
    const nationalEntries = ORGANIZER_DIRECTORY.filter(
      (entry) => entry.geographicScope === "national",
    );

    expect(nationalEntries.length).toBeGreaterThan(0);
    expect(
      nationalEntries.every(
        (entry) =>
          entry.city === null &&
          entry.region === null &&
          entry.isIleDeFrance === null,
      ),
    ).toBe(true);
  });

  it("filters entries by organizer type and excludes spontaneous", () => {
    const associations = getOrganizerDirectoryEntries("association");

    expect(associations.length).toBeGreaterThan(0);
    expect(associations.every((entry) => entry.organizerType === "association")).toBe(
      true,
    );
    expect(getOrganizerDirectoryEntries("spontaneous")).toEqual([]);
    expect(getOrganizerDirectoryEntries(null)).toEqual([]);
  });

  it("resolves canonical values and rejects unknown values", () => {
    const known = getOrganizerDirectoryEntryByValue("  World Cleanup Day France ");

    expect(known?.id).toBe("association-world-cleanup-day-france");
    expect(isKnownOrganizerDirectoryValue("World Cleanup Day France")).toBe(true);
    expect(isKnownOrganizerDirectoryValue("Structure inconnue")).toBe(false);
    expect(ASSOCIATION_SELECTION_OPTIONS).toContain("World Cleanup Day France");
  });
});

describe("legacy association compatibility", () => {
  it("continues accepting historical association values", () => {
    for (const value of [
      "AEBCPEV",
      "Association Sans Murs Paris 15",
      "La Brigade Verte Paris",
      "Clean Walk Paris 10",
      "Megothon",
    ]) {
      expect(isAssociationSelectionOption(value)).toBe(true);
      expect(isValidAssociationName(value)).toBe(true);
    }
  });
});

describe("association options helpers", () => {
  it("builds and validates entreprise-specific association names", () => {
    const value = buildEntrepriseAssociationName("Veolia");
    expect(value).toBe("Entreprise - Veolia");
    expect(isValidAssociationName(value)).toBe(true);
  });

  it("normalizes entreprise-specific values for prefill select", () => {
    expect(normalizeAssociationSelectionForPrefill("Entreprise - SNCF")).toBe(
      "Entreprise",
    );
  });

  it("rejects invalid entreprise placeholder values", () => {
    expect(isValidAssociationName("Entreprise - ")).toBe(false);
  });

  it("normalizes enterprise scope labels for classement filters", () => {
    expect(normalizeAssociationScopeValue("Entreprise")).toBe(
      "Entreprise - Non precise",
    );
    expect(normalizeAssociationScopeValue(" Entreprise -  SNCF  ")).toBe(
      "Entreprise - SNCF",
    );
  });
});
