import { describe, expect, it } from "vitest";
import {
  buildEntrepriseAssociationName,
  isValidAssociationName,
  normalizeAssociationScopeValue,
  normalizeAssociationSelectionForPrefill,
} from "./association-options";

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
