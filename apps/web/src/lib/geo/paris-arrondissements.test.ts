import { describe, expect, it } from "vitest";
import {
  distanceToParisArrondissementKm,
  formatArrondissementLabel,
  getArrondissementHelpLabel,
  getArrondissementMunicipalLabel,
  getParisArrondissementLabel,
  inferArrondissementCityFromLabel,
  isParisArrondissementLabel,
  parseParisArrondissement,
} from "./paris-arrondissements";

describe("paris-arrondissements", () => {
  it("parses valid arrondissement values", () => {
    expect(parseParisArrondissement(10)).toBe(10);
    expect(parseParisArrondissement("18")).toBe(18);
  });

  it("rejects invalid arrondissement values", () => {
    expect(parseParisArrondissement("0")).toBeNull();
    expect(parseParisArrondissement(21)).toBeNull();
    expect(parseParisArrondissement("abc")).toBeNull();
  });

  it("returns readable labels", () => {
    expect(getParisArrondissementLabel(1)).toBe("Paris 1er");
    expect(getParisArrondissementLabel(20)).toBe("Paris 20e");
  });

  it("recognizes Paris arrondissement labels and ignores non-Paris ones", () => {
    expect(isParisArrondissementLabel("15e arrondissement")).toBe(true);
    expect(isParisArrondissementLabel("Paris 15e")).toBe(true);
    expect(isParisArrondissementLabel("Lyon 2e")).toBe(false);
  });

  it("infers the city from arrondissement labels", () => {
    expect(inferArrondissementCityFromLabel("Paris 11e")).toBe("Paris");
    expect(inferArrondissementCityFromLabel("Lyon 2e")).toBe("Lyon");
    expect(inferArrondissementCityFromLabel("Marseille 1er")).toBe("Marseille");
  });

  it("formats arrondissement labels by city", () => {
    expect(formatArrondissementLabel("Paris", 11)).toBe("Paris 11e");
    expect(formatArrondissementLabel("Lyon", 2)).toBe("Lyon 2e");
    expect(formatArrondissementLabel("Marseille", 1)).toBe("Marseille 1er");
  });

  it("adds Marseille sector helper labels", () => {
    expect(getArrondissementMunicipalLabel("Marseille", 1)).toBe(
      "Marseille 1er arrondissement",
    );
    expect(getArrondissementHelpLabel("Marseille", 1)).toBe(
      "Mairie de secteur 1/7",
    );
    expect(getArrondissementHelpLabel("Marseille", 10)).toBe(
      "Mairie de secteur 9/10",
    );
  });

  it("computes shorter distance for nearby coordinates", () => {
    const near10e = distanceToParisArrondissementKm(48.876, 2.359, 10);
    const farFrom10e = distanceToParisArrondissementKm(48.825, 2.27, 10);
    expect(near10e).toBeLessThan(farFrom10e);
  });
});
