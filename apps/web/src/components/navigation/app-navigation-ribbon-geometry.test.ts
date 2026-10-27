import { describe, expect, it } from "vitest";
import {
  getNavigationRibbonIndicatorLeft,
  NAVIGATION_RIBBON_DOCK_WIDTH_PX,
  NAVIGATION_RIBBON_INDICATOR_WIDTH_PX,
  NAVIGATION_RIBBON_MENISCUS_CIRCLE_CENTER_Y_PX,
  NAVIGATION_RIBBON_MENISCUS_CIRCLE_SIZE_PX,
  NAVIGATION_RIBBON_MENISCUS_INDICATOR_HEIGHT_PX,
  NAVIGATION_RIBBON_TRIGGER_GAP_PX,
  NAVIGATION_RIBBON_TRIGGER_WIDTH_PX,
  getNavigationRibbonMeniscusCircleBounds,
} from "./app-navigation-ribbon-geometry";

describe("desktop navigation ribbon geometry", () => {
  it("keeps the published dimensions aligned with the five-block dock", () => {
    expect(NAVIGATION_RIBBON_DOCK_WIDTH_PX).toBe(240);
    expect(NAVIGATION_RIBBON_TRIGGER_WIDTH_PX).toBe(36);
    expect(NAVIGATION_RIBBON_TRIGGER_GAP_PX).toBe(2);
    expect(NAVIGATION_RIBBON_INDICATOR_WIDTH_PX).toBe(88);
    expect(NAVIGATION_RIBBON_MENISCUS_INDICATOR_HEIGHT_PX).toBe(64);
    expect(NAVIGATION_RIBBON_MENISCUS_CIRCLE_SIZE_PX).toBe(44);
    expect(NAVIGATION_RIBBON_MENISCUS_CIRCLE_CENTER_Y_PX).toBe(12);

    const circle = getNavigationRibbonMeniscusCircleBounds();
    expect(circle.top).toBe(-10);
    expect(circle.bottom).toBe(34);
    expect(circle.top).toBeLessThan(0);
  });

  it.each([
    [0, "calc(50% - 120px + 0px)"],
    [2, "calc(50% - 120px + 76px)"],
    [4, "calc(50% - 120px + 152px)"],
  ])("centers the meniscus over five blocks at index %i", (index, expected) => {
    expect(getNavigationRibbonIndicatorLeft(index, 5)).toBe(expected);
  });

  it("adapts the same geometry when the visible block count changes", () => {
    expect(getNavigationRibbonIndicatorLeft(0, 6)).toBe(
      "calc(50% - 139px + 0px)",
    );
    expect(getNavigationRibbonIndicatorLeft(5, 6)).toBe(
      "calc(50% - 139px + 190px)",
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
