import { describe, expect, it } from "vitest";
import { PLANETARY_BOUNDARIES, PLANETARY_BOUNDARIES_REFERENCE } from "./planetary-boundaries-data";

describe("dated planetary assessment", () => {
  it("contains nine unique boundaries and seven classified as transgressed", () => {
    expect(new Set(PLANETARY_BOUNDARIES.map((boundary) => boundary.id)).size).toBe(9);
    expect(PLANETARY_BOUNDARIES.filter((boundary) => boundary.status === "transgressed")).toHaveLength(7);
    expect(PLANETARY_BOUNDARIES.filter((boundary) => boundary.status === "safe").map((boundary) => boundary.id)).toEqual(["atmospheric-aerosols", "ozone-depletion"]);
    expect(PLANETARY_BOUNDARIES_REFERENCE.year).toBe(2026);
  });
});
