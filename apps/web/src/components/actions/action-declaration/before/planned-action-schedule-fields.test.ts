import { describe, expect, it } from "vitest";
import { extendActionDurationSliderMax, resolveActionDurationSliderMax } from "./planned-action-schedule-fields";

describe("action duration slider contract", () => {
  it.each([
    [undefined, 180],
    [0, 180],
    [15, 180],
    [180, 180],
    [181, 240],
    [240, 240],
    [300, 300],
    [1440, 1440],
    [1500, 1440],
  ])("resolves the persisted value %s to a safe max of %s", (value, expected) => {
    expect(resolveActionDurationSliderMax(value)).toBe(expected);
  });

  it.each([
    [180, 180, 240],
    [240, 240, 300],
    [300, 285, 300],
    [1380, 1380, 1440],
    [1440, 1440, 1440],
  ])("extends only when the selected value reaches the current max", (currentMax, selectedMinutes, expected) => {
    expect(extendActionDurationSliderMax(currentMax, selectedMinutes)).toBe(expected);
  });
});
