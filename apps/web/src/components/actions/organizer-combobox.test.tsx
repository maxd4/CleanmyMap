import { describe, expect, it } from "vitest";
import { getOrganizerComboboxKeyAction } from "./organizer-combobox";

describe("OrganizerCombobox keyboard contract", () => {
  it("cycles through suggestions with ArrowDown and ArrowUp", () => {
    expect(getOrganizerComboboxKeyAction("ArrowDown", -1, 3, false)).toEqual({ type: "move", index: 0 });
    expect(getOrganizerComboboxKeyAction("ArrowDown", 2, 3, true)).toEqual({ type: "move", index: 0 });
    expect(getOrganizerComboboxKeyAction("ArrowUp", 0, 3, true)).toEqual({ type: "move", index: 2 });
  });

  it("selects the active option with Enter and closes with Escape", () => {
    expect(getOrganizerComboboxKeyAction("Enter", 1, 3, true)).toEqual({ type: "select", index: 1 });
    expect(getOrganizerComboboxKeyAction("Enter", 1, 3, false)).toBeNull();
    expect(getOrganizerComboboxKeyAction("Escape", 1, 3, true)).toEqual({ type: "close" });
  });

  it("does not expose a phantom option when there are no suggestions", () => {
    expect(getOrganizerComboboxKeyAction("ArrowDown", -1, 0, false)).toEqual({ type: "move", index: -1 });
  });
});
