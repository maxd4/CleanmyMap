import { describe, expect, it } from "vitest";
import type { ActionMapItem } from "../../lib/actions/types";
import {
  DEFAULT_VISIBLE_CATEGORIES,
  classifyPollutionColor,
  deriveMarkerCategories,
  isVisibleWithCategoryFilter,
} from "./map-marker-categories";

function buildItem(partial: Partial<ActionMapItem>): ActionMapItem {
  return {
    id: "action-1",
    action_date: "2026-04-03",
    location_label: "Lieu test",
    latitude: 48.85,
    longitude: 2.35,
    waste_kg: 0,
    cigarette_butts: 0,
    status: "approved",
    ...partial,
  };
}

describe("map marker categories", () => {
  it("shows all categories by default for exhaustive map", () => {
    expect(DEFAULT_VISIBLE_CATEGORIES.yellow).toBe(true);
    expect(DEFAULT_VISIBLE_CATEGORIES.violet).toBe(true);
    expect(DEFAULT_VISIBLE_CATEGORIES.green).toBe(true);
    expect(DEFAULT_VISIBLE_CATEGORIES.blue).toBe(true);
    expect(DEFAULT_VISIBLE_CATEGORIES.ashtray).toBe(true);
    expect(DEFAULT_VISIBLE_CATEGORIES.bin).toBe(true);
  });

  it("classifies pollution color with defined thresholds", () => {
    expect(
      classifyPollutionColor(
        buildItem({ waste_kg: 40, cigarette_butts: 3000 }),
      ),
    ).toBe("violet");
    expect(
      classifyPollutionColor(buildItem({ waste_kg: 20, cigarette_butts: 0 })),
    ).toBe("yellow");
    expect(
      classifyPollutionColor(buildItem({ waste_kg: 1, cigarette_butts: 0 })),
    ).toBe("green");
    expect(
      classifyPollutionColor(buildItem({ waste_kg: 0, cigarette_butts: 0 })),
    ).toBe("blue");
  });

  it("adds ashtray/bin markers when relevant", () => {
    const categories = deriveMarkerCategories(
      buildItem({ waste_kg: 20, cigarette_butts: 800 }),
    );
    expect(categories).toContain("yellow");
    expect(categories).toContain("ashtray");
    expect(categories).toContain("bin");
  });

  it("applies visibility filter from toggles", () => {
    const greenItem = buildItem({ waste_kg: 1, cigarette_butts: 0 });
    const visibleByDefault = isVisibleWithCategoryFilter(
      greenItem,
      DEFAULT_VISIBLE_CATEGORIES,
    );
    expect(visibleByDefault).toBe(true);

    const withGreenEnabled = {
      ...DEFAULT_VISIBLE_CATEGORIES,
      green: false,
      bin: false,
    };
    expect(isVisibleWithCategoryFilter(greenItem, withGreenEnabled)).toBe(
      false,
    );
  });
});
