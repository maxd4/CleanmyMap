import { describe, expect, it } from "vitest";
import { resolveTrashSpotterWasteCategories } from "./trash-spotter-types";

describe("Trash Spotter waste scope", () => {
  it("keeps categories for a spot and clears them for a clean place", () => {
    const categories = ["plastic", "broken_glass"];

    expect(resolveTrashSpotterWasteCategories("spot", categories)).toEqual(categories);
    expect(resolveTrashSpotterWasteCategories("clean_place", categories)).toEqual([]);
  });

  it("validates categories through the canonical slug registry", () => {
    expect(
      resolveTrashSpotterWasteCategories("spot", ["plastic", "not-a-slug"]),
    ).toEqual(["plastic"]);
  });
});
