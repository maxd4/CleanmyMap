import { describe, expect, it } from "vitest";
import { getActionOperationalContext } from "./operational-context";

describe("action operational place type labels", () => {
  it("labels canonical identifiers and keeps historical values readable", () => {
    expect(getActionOperationalContext({ metadata: { placeType: "urban_streets" } }).placeTypeLabel).toBe("Rues & espaces urbains");
    expect(getActionOperationalContext({ metadata: { placeType: "Quai/Pont/Port" } }).placeTypeLabel).toBe("Quai/Pont/Port");
  });
});
