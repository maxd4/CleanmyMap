import { describe, expect, it } from "vitest";
import {
  getNavigationRibbonIndicatorLeft,
  NAVIGATION_RIBBON_DOCK_WIDTH_PX,
  NAVIGATION_RIBBON_INDICATOR_WIDTH_PX,
  NAVIGATION_RIBBON_TRIGGER_GAP_PX,
  NAVIGATION_RIBBON_TRIGGER_WIDTH_PX,
} from "./app-navigation-ribbon-geometry";

describe("desktop navigation ribbon geometry", () => {
  it("keeps the published dimensions aligned with the five-block dock", () => {
    expect(NAVIGATION_RIBBON_DOCK_WIDTH_PX).toBe(240);
    expect(NAVIGATION_RIBBON_TRIGGER_WIDTH_PX).toBe(36);
    expect(NAVIGATION_RIBBON_TRIGGER_GAP_PX).toBe(2);
    expect(NAVIGATION_RIBBON_INDICATOR_WIDTH_PX).toBe(76);
  });

  it.each([
    [0, "calc(50% - 114px + 0px)"],
    [2, "calc(50% - 114px + 76px)"],
    [4, "calc(50% - 114px + 152px)"],
  ])("centers the meniscus over five blocks at index %i", (index, expected) => {
    expect(getNavigationRibbonIndicatorLeft(index, 5)).toBe(expected);
  });

  it("adapts the same geometry when the visible block count changes", () => {
    expect(getNavigationRibbonIndicatorLeft(0, 6)).toBe(
      "calc(50% - 133px + 0px)",
    );
    expect(getNavigationRibbonIndicatorLeft(5, 6)).toBe(
      "calc(50% - 133px + 190px)",
    );
  });

  it.each([
    [-1, 5],
    [5, 5],
    [0, 0],
    [1.5, 5],
  ])("does not render an indicator for invalid selection %i/%i", (index, count) => {
    expect(getNavigationRibbonIndicatorLeft(index, count)).toBeNull();
  });
});
