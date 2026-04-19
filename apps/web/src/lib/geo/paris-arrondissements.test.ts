import { describe, expect, it } from "vitest";
import {
  distanceToParisArrondissementKm,
  getParisArrondissementLabel,
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

  it("computes shorter distance for nearby coordinates", () => {
    const near10e = distanceToParisArrondissementKm(48.876, 2.359, 10);
    const farFrom10e = distanceToParisArrondissementKm(48.825, 2.27, 10);
    expect(near10e).toBeLessThan(farFrom10e);
  });
});
