import { describe, expect, it } from "vitest";
import { convertCigaretteButtsToKg, createInitialFormState } from "./model";

describe("action form cigarette-butt conversion", () => {
  it("uses the canonical qualified runtime conversion", () => {
    expect(convertCigaretteButtsToKg(2_500, "propre")).toBe(0.55);
    expect(convertCigaretteButtsToKg(2_500, "humide")).toBe(1.25);
    expect(convertCigaretteButtsToKg(2_500, "mouille")).toBe(1.25);
  });
});

describe("action declaration model", () => {
  it("creates isolated initial form state copies", () => {
    const first = createInitialFormState("Alice", "clean_place");
    first.suggestedMaterials.push("gloves");
    first.equipmentInventory.glovesPairs = 2;
    first.preparationChecklist[0].checked = true;

    const second = createInitialFormState("Bob");

    expect(first).toMatchObject({ actorName: "Alice", recordType: "clean_place" });
    expect(second).toMatchObject({ actorName: "Bob", recordType: "action" });
    expect(second.suggestedMaterials).not.toContain("gloves");
    expect(second.equipmentInventory).not.toHaveProperty("glovesPairs");
    expect(second.preparationChecklist[0].checked).toBe(false);
  });

  it("starts a new action with an empty total and unknown categories", () => {
    const form = createInitialFormState("Alice");

    expect(form.volunteersCount).toBe("");
    expect(form.childrenCount).toBe("");
    expect(form.adultCount).toBe("");
    expect(form.retiredCount).toBe("");
    expect(form.cigaretteButtsInputSource).toBeNull();
  });
});
