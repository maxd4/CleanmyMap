import { describe, expect, it } from "vitest";
import {
  ACTION_PREPARATION_CHECKLIST_DEFAULTS,
  normalizeActionPreparationContract,
  normalizePreparationChecklist,
  normalizeSuggestedMaterials,
} from "./preparation-contract";

describe("ActionPreparationData preparation extensions", () => {
  it("keeps the default checklist explicit and entirely unchecked", () => {
    expect(ACTION_PREPARATION_CHECKLIST_DEFAULTS).toHaveLength(4);
    expect(ACTION_PREPARATION_CHECKLIST_DEFAULTS.every((item) => !item.checked)).toBe(true);
  });

  it("bounds and deduplicates structured checklist items without converting prose", () => {
    expect(normalizePreparationChecklist([
      { key: "materials_checked", label: " Matériel vérifié ", checked: false },
      { key: "materials_checked", label: "Doublon", checked: true },
      { key: "bad", label: "", checked: true },
      { key: "custom_1", label: "Élément libre", checked: true },
    ])).toEqual([
      { key: "materials_checked", label: "Matériel vérifié", checked: false },
      { key: "custom_1", label: "Élément libre", checked: true },
    ]);
    expect(normalizePreparationChecklist("Matériel vérifié")).toBeUndefined();
  });

  it("accepts only the bounded material suggestion vocabulary", () => {
    expect(normalizeSuggestedMaterials(["gloves", "gloves", "unknown", 1])).toEqual(["gloves"]);
  });

  it("removes invalid structured values at the server normalization boundary", () => {
    expect(normalizeActionPreparationContract({
      accessibilityStatus: "certified_pmr",
      suggestedMaterials: ["unknown"],
      preparationChecklist: [{ key: "x", label: "ok", checked: false }],
      checklistBeforeDeparture: "Matériel vérifié",
    })).toEqual({
      preparationChecklist: [{ key: "x", label: "ok", checked: false }],
      checklistBeforeDeparture: "Matériel vérifié",
    });
  });
});
