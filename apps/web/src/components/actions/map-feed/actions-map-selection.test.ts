import { describe, expect, it } from "vitest";
import {
  buildActionsMapSelectionHref,
  mergeSelectedActionIntoMapItems,
} from "./actions-map-selection";

describe("actions map selection URL", () => {
  it("preserves other deep-link parameters while selecting and deselecting", () => {
    expect(
      buildActionsMapSelectionHref(
        "/actions/map",
        "dateScope=all_time&tab=journal&actionId=old",
        "target",
      ),
    ).toBe("/actions/map?dateScope=all_time&tab=journal&actionId=target");

    expect(
      buildActionsMapSelectionHref(
        "/actions/map",
        "dateScope=all_time&tab=journal&actionId=target",
        null,
      ),
    ).toBe("/actions/map?dateScope=all_time&tab=journal");
  });

  it("keeps a selected public action visible when it was outside the viewport feed", () => {
    const visible = { id: "visible" } as never;
    const target = { id: "outside-viewport" } as never;
    expect(mergeSelectedActionIntoMapItems([visible], target)).toEqual([
      visible,
      target,
    ]);
    expect(mergeSelectedActionIntoMapItems([target], target)).toEqual([target]);
  });
});
