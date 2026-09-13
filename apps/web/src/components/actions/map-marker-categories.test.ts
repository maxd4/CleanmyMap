import { describe, expect, it } from "vitest";
import type { ActionMapItem } from "../../lib/actions/types";
import {
  ACTION_POLLUTION_COLOR_THRESHOLDS,
  DEFAULT_VISIBLE_CATEGORIES,
  classifyPollutionColor,
  deriveMarkerCategories,
  isVisibleWithCategoryFilter,
  resolveInfrastructureEmoji,
  resolveInfrastructureNeed,
  resolveDynamicColor,
} from "./map-marker-categories";
import type { PollutionScoreReferences } from "@/lib/actions/pollution/pollution-score";

const references: PollutionScoreReferences = {
  global: {
    wastePerVolunteer: 20,
    buttsPerVolunteer: 2_000,
    wasteSourceCount: 1,
    buttsSourceCount: 1,
  },
};

function buildItem(partial: Partial<ActionMapItem>): ActionMapItem {
  return {
    id: "action-1",
    action_date: "2026-08-25",
    location_label: "Lieu test",
    latitude: 48.85,
    longitude: 2.35,
    waste_kg: 0,
    cigarette_butts: 0,
    volunteers_count: 1,
    duration_minutes: 60,
    status: "approved",
    record_type: "action",
    source: "actions",
    ...partial,
  };
}

describe("map marker categories", () => {
  it("shows all categories by default for exhaustive map", () => {
    expect(Object.values(DEFAULT_VISIBLE_CATEGORIES).every(Boolean)).toBe(true);
  });

  it("uses the global V2 reference and the maximum component score", () => {
    expect(
      classifyPollutionColor(
        buildItem({ waste_kg: 40, cigarette_butts: 3_000 }),
        references,
      ),
    ).toBe("red");
    expect(
      resolveInfrastructureNeed(
        buildItem({ waste_kg: 16, cigarette_butts: 0 }),
        references,
      ),
    ).toBe("bin");
    expect(
      resolveInfrastructureNeed(
        buildItem({ waste_kg: 0, cigarette_butts: 1_500 }),
        references,
      ),
    ).toBe("ashtray");
    expect(
      resolveInfrastructureEmoji(
        buildItem({ waste_kg: 18, cigarette_butts: 1_800 }),
        references,
      ),
    ).toBe("💰");
  });

  it("keeps a missing V2 reference explicitly unavailable", () => {
    expect(classifyPollutionColor(buildItem({ waste_kg: 20 }))).toBe("blue");
    expect(resolveInfrastructureNeed(buildItem({ waste_kg: 20 }))).toBeNull();
  });

  it("applies visibility filters to derived pollution categories", () => {
    const item = buildItem({ waste_kg: 16, cigarette_butts: 0 });
    expect(isVisibleWithCategoryFilter(item, DEFAULT_VISIBLE_CATEGORIES, references)).toBe(true);
    expect(
      isVisibleWithCategoryFilter(
        item,
        {
          ...DEFAULT_VISIBLE_CATEGORIES,
          orange: false,
          red: false,
          violet: false,
          black: false,
          blue: false,
          green: false,
          bin: false,
        },
        references,
      ),
    ).toBe(false);
  });

  it("keeps green exclusive to explicit clean places", () => {
    expect(
      classifyPollutionColor(
        buildItem({ record_type: "clean_place", waste_kg: 1 }),
        references,
      ),
    ).toBe("green");
    expect(
      resolveDynamicColor(ACTION_POLLUTION_COLOR_THRESHOLDS.BLACK),
    ).toContain("0%, 8%");
  });

  it("uses neutral categories when work-hours are invalid", () => {
    expect(
      deriveMarkerCategories(
        buildItem({ duration_minutes: 0, waste_kg: 20 }),
        references,
      ),
    ).toEqual(["blue"]);
  });
});
