import { describe, expect, it } from"vitest";
import type { ActionMapItem } from"../../lib/actions/types";
import {
 ACTION_POLLUTION_COLOR_THRESHOLDS,
 DEFAULT_VISIBLE_CATEGORIES,
 classifyPollutionColor,
 deriveMarkerCategories,
 isVisibleWithCategoryFilter,
 resolveInfrastructureEmoji,
 resolveInfrastructureNeed,
 resolveDynamicColor,
} from"./map-marker-categories";

function buildItem(partial: Partial<ActionMapItem>): ActionMapItem {
 return {
 id:"action-1",
    action_date: new Date().toISOString(),
 location_label:"Lieu test",
 latitude: 48.85,
 longitude: 2.35,
 waste_kg: 0,
    cigarette_butts: 0,
    status:"approved",
    record_type:"other",
 ...partial,
 };
}

describe("map marker categories", () => {
 it("shows all categories by default for exhaustive map", () => {
 expect(DEFAULT_VISIBLE_CATEGORIES.orange).toBe(true);
 expect(DEFAULT_VISIBLE_CATEGORIES.red).toBe(true);
 expect(DEFAULT_VISIBLE_CATEGORIES.violet).toBe(true);
 expect(DEFAULT_VISIBLE_CATEGORIES.black).toBe(true);
 expect(DEFAULT_VISIBLE_CATEGORIES.green).toBe(true);
 expect(DEFAULT_VISIBLE_CATEGORIES.blue).toBe(true);
 expect(DEFAULT_VISIBLE_CATEGORIES.ashtray).toBe(true);
 expect(DEFAULT_VISIBLE_CATEGORIES.bin).toBe(true);
 expect(DEFAULT_VISIBLE_CATEGORIES.combo).toBe(true);
 });

  it("classifies pollution color with defined thresholds", () => {
    expect(
      classifyPollutionColor(
        buildItem({ waste_kg: 40, cigarette_butts: 3000 }),
      ),
 ).toBe("black");
    expect(
      classifyPollutionColor(buildItem({ waste_kg: 20, cigarette_butts: 0 })),
    ).toBe("black");
 expect(
 classifyPollutionColor(buildItem({ waste_kg: 1, cigarette_butts: 0 })),
 ).toBe("blue");
 expect(
 classifyPollutionColor(buildItem({ waste_kg: 0, cigarette_butts: 0 })),
 ).toBe("blue");
 });

 it("adds a combo marker when both infrastructure thresholds are exceeded", () => {
 const categories = deriveMarkerCategories(
 buildItem({ waste_kg: 18, cigarette_butts: 1800 }),
 );
 expect(categories).toContain("violet");
 expect(categories).toContain("combo");
 });

 it("derives infrastructure needs from normalized component scores", () => {
 expect(resolveInfrastructureNeed(buildItem({ waste_kg: 16, cigarette_butts: 0 }))).toBe("bin");
 expect(resolveInfrastructureNeed(buildItem({ waste_kg: 0, cigarette_butts: 1500 }))).toBe("ashtray");
 expect(resolveInfrastructureNeed(buildItem({ waste_kg: 18, cigarette_butts: 1800 }))).toBe("combo");
 expect(resolveInfrastructureNeed(buildItem({ waste_kg: 2, cigarette_butts: 100 }))).toBeNull();
 });

 it("maps infrastructure needs to explicit emojis", () => {
 expect(resolveInfrastructureEmoji(buildItem({ waste_kg: 16, cigarette_butts: 0 }))).toBe("🗑️");
 expect(resolveInfrastructureEmoji(buildItem({ waste_kg: 0, cigarette_butts: 1500 }))).toBe("🚬");
 expect(resolveInfrastructureEmoji(buildItem({ waste_kg: 18, cigarette_butts: 1800 }))).toBe("💰");
 });

 it("applies visibility filter from toggles", () => {
 const lowPriorityItem = buildItem({ waste_kg: 1, cigarette_butts: 0 });
 const visibleByDefault = isVisibleWithCategoryFilter(
 lowPriorityItem,
 DEFAULT_VISIBLE_CATEGORIES,
 );
 expect(visibleByDefault).toBe(true);

 const withGreenEnabled = {
 ...DEFAULT_VISIBLE_CATEGORIES,
 blue: false,
 bin: false,
 };
 expect(isVisibleWithCategoryFilter(lowPriorityItem, withGreenEnabled)).toBe(
 false,
 );
 });

 it("uses the shared reference when provided", () => {
 const references = {
 wastePerVolunteer: 10,
 buttsPerVolunteer: 1000,
 };

 expect(classifyPollutionColor(buildItem({ waste_kg: 2, cigarette_butts: 0 }), references)).toBe(
 "blue",
 );
 expect(
 classifyPollutionColor(buildItem({ waste_kg: 20, cigarette_butts: 0 }), references),
 ).toBe("black");
 expect(
 resolveInfrastructureNeed(buildItem({ waste_kg: 8, cigarette_butts: 900 }), references),
 ).toBe("combo");
 expect(
 isVisibleWithCategoryFilter(
 buildItem({ waste_kg: 20, cigarette_butts: 0 }),
 DEFAULT_VISIBLE_CATEGORIES,
 references,
 ),
 ).toBe(true);
 });

  it("keeps green exclusively for explicit clean places and interpolates without score opacity", () => {
 expect(
 classifyPollutionColor(buildItem({ waste_kg: 1, cigarette_butts: 0 })),
 ).toBe("blue");
 expect(
 classifyPollutionColor(
 buildItem({ record_type: "clean_place", waste_kg: 1 }),
 ),
 ).toBe("green");

 const midpoint = resolveDynamicColor(
 ACTION_POLLUTION_COLOR_THRESHOLDS.ORANGE - 1,
 );
 expect(midpoint.startsWith("hsl(")).toBe(true);
 expect(midpoint).not.toContain("hsla");
 expect(resolveDynamicColor(ACTION_POLLUTION_COLOR_THRESHOLDS.BLACK)).toContain(
 "0%, 8%",
 );
  });

  it("maps pollution thresholds to blue, orange, red, violet and black", () => {
    const now = new Date("2026-08-25T00:00:00.000Z");
    const itemAt = (score: number) =>
      buildItem({
        action_date: "2026-08-25T00:00:00.000Z",
        waste_pollution_score: score,
        cigarette_butts_pollution_score: 0,
      });

    expect(classifyPollutionColor(itemAt(0), undefined, now)).toBe("blue");
    expect(classifyPollutionColor(itemAt(30), undefined, now)).toBe("orange");
    expect(classifyPollutionColor(itemAt(60), undefined, now)).toBe("red");
    expect(classifyPollutionColor(itemAt(80), undefined, now)).toBe("violet");
    expect(classifyPollutionColor(itemAt(100), undefined, now)).toBe("black");
  });

 it("lets each infrastructure category be hidden independently", () => {
 const ashtrayItem = buildItem({ waste_kg: 0, cigarette_butts: 1500 });
 const binItem = buildItem({ waste_kg: 16, cigarette_butts: 0 });
 const comboItem = buildItem({ waste_kg: 18, cigarette_butts: 1800 });
 const hideItemCategories = (item: ActionMapItem) =>
 deriveMarkerCategories(item).reduce(
 (acc, category) => ({ ...acc, [category]: false }),
 DEFAULT_VISIBLE_CATEGORIES,
 );

 expect(
 isVisibleWithCategoryFilter(ashtrayItem, hideItemCategories(ashtrayItem)),
 ).toBe(false);
 expect(
 isVisibleWithCategoryFilter(binItem, hideItemCategories(binItem)),
 ).toBe(false);
 expect(
 isVisibleWithCategoryFilter(comboItem, hideItemCategories(comboItem)),
 ).toBe(false);
 });
});
