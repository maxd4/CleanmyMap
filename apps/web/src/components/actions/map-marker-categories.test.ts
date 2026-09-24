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
        buildItem({ waste_kg: 16, cigarette_butts: 1_500 }),
        references,
        { displayMode: "observed" },
      ),
    ).toBe("violet");
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
    expect(classifyPollutionColor(buildItem({ waste_kg: 20 }))).toBe("unavailable");
    expect(deriveMarkerCategories(buildItem({ waste_kg: 20 }))).toContain("unavailable");
    expect(resolveInfrastructureNeed(buildItem({ waste_kg: 20 }))).toBeNull();
  });

  it("keeps the score scope and display mode matrix on the same resolver", () => {
    const item = buildItem({
      action_date: "2026-01-01",
      waste_kg: 20,
      cigarette_butts: 800,
      contract: {
        type: "action",
        id: "action-1",
        status: "approved",
        source: "actions",
        dates: { observedAt: "2026-01-01" },
        location: { departmentCode: "99" },
        metadata: {
          wasteKg: 20,
          cigaretteButts: 800,
          volunteersCount: 1,
        },
      } as never,
    });

    for (const scoreScope of ["global", "department"] as const) {
      for (const displayMode of ["observed", "projected_today"] as const) {
        const category = classifyPollutionColor(item, references, {
          scoreScope,
          displayMode,
          now: "2026-09-17",
        });

        if (scoreScope === "department") {
          expect(category).toBe("unavailable");
        } else {
          expect(category).not.toBe("unavailable");
          expect(["orange", "red", "violet", "black"]).toContain(category);
        }
      }
    }
  });

  it("keeps the observed RED/VIOLET boundary explicit", () => {
    expect(
      classifyPollutionColor(
        buildItem({ waste_kg: 12, cigarette_butts: 0 }),
        references,
        { displayMode: "observed" },
      ),
    ).toBe("red");
    expect(
      classifyPollutionColor(
        buildItem({ waste_kg: 16, cigarette_butts: 0 }),
        references,
        { displayMode: "observed" },
      ),
    ).toBe("violet");
    expect(ACTION_POLLUTION_COLOR_THRESHOLDS.RED).toBe(60);
    expect(ACTION_POLLUTION_COLOR_THRESHOLDS.VIOLET).toBe(80);
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

  it("keeps the pre-77 score population independent from duration", () => {
    expect(
      deriveMarkerCategories(
        buildItem({ duration_minutes: 0, waste_kg: 20 }),
        references,
        { displayMode: "observed" },
      ),
    ).toEqual(["black", "bin"]);
  });
});
