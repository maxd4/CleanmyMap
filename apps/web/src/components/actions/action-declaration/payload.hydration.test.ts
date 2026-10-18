import { describe, expect, it } from "vitest";
import {
  applyPreparationDataToForm,
  buildPreparationDataFromForm,
  createInitialFormState,
} from "./payload";
import { formatWasteGuidanceLines } from "@/lib/waste";
import { buildBaseForm } from "./payload.test-fixtures";

describe("action declaration payload hydratation", () => {
  it("keeps descriptive choices absent when hydrating a draft without them", () => {
    const form = createInitialFormState("Alice");
    const hydrated = applyPreparationDataToForm(form, {
      creatorRole: "benevole",
      preparationState: "brouillon",
    });

    expect(hydrated.plannedObjective).toBe("");
    expect(hydrated.estimatedDifficulty).toBe("");
    expect(hydrated).not.toHaveProperty("creatorRole");
    expect(hydrated.placeType).toBe("");
    expect(hydrated).not.toHaveProperty("preparationState");
  });

  it("rehydrates new fields and preserves unchecked historical defaults", () => {
    const form = buildBaseForm();
    const hydrated = applyPreparationDataToForm(form, {
      accessibilityStatus: "to_confirm",
      materialsProvided: "Pinces sur place.",
      suggestedMaterials: ["bags"],
      equipmentInventory: { glovesPairs: 0, grabbers: 2, luggageScaleAvailable: true },
      refreshmentsProvided: { waterDuringAction: true, snackAfterAction: false },
      preparationChecklist: [{ key: "materials_checked", label: "Matériel vérifié", checked: true }],
      checklistBeforeDeparture: "Ancienne note à relire",
    });

    expect(hydrated.accessibilityStatus).toBe("to_confirm");
    expect(hydrated.materialsProvided).toBe("Pinces sur place.");
    expect(hydrated.suggestedMaterials).toEqual(["bags"]);
    expect(hydrated.equipmentInventory).toEqual({ glovesPairs: 0, grabbers: 2, luggageScaleAvailable: true });
    expect(hydrated.refreshmentsProvided).toEqual({ waterDuringAction: true, snackAfterAction: false });
    expect(hydrated.preparationChecklist).toEqual([
      { key: "materials_checked", label: "Matériel vérifié", checked: true },
    ]);
    expect(hydrated.checklistBeforeDeparture).toBe("Ancienne note à relire");
  });

  it("rehydrates historical derived blocks into editable organizer text once", () => {
    const form = buildBaseForm();
    const guidance = formatWasteGuidanceLines(["broken_glass"]);
    const hydrated = applyPreparationDataToForm(form, {
      expectedWasteCategories: ["broken_glass"],
      safetyInstructions: `Consigne organisateur\n\nConsignes dérivées du référentiel:\n${guidance.toAvoid}\n${guidance.toReport}`,
      recommendedMaterials: `Sacs renforcés\n\nMatériel dérivé du référentiel:\n${guidance.toPrepare}`,
    });

    expect(hydrated.safetyInstructions).toBe("Consigne organisateur");
    expect(hydrated.recommendedMaterials).toBe("Sacs renforcés");

    const saved = buildPreparationDataFromForm(hydrated);
    const savedAgain = buildPreparationDataFromForm(
      applyPreparationDataToForm(hydrated, saved),
    );
    expect(saved.safetyInstructions).toBe("Consigne organisateur");
    expect(saved.recommendedMaterials).toBe("Sacs renforcés");
    expect(savedAgain.safetyInstructions).toBe("Consigne organisateur");
    expect(savedAgain.recommendedMaterials).toBe("Sacs renforcés");
  });

  it("updates derived guidance after category changes without erasing manual text", () => {
    const form = buildBaseForm();
    const guidance = formatWasteGuidanceLines(["broken_glass"]);
    const hydrated = applyPreparationDataToForm(form, {
      expectedWasteCategories: ["sharps"],
      safetyInstructions: `Consigne organisateur\n\nConsignes dérivées du référentiel:\n${guidance.toAvoid}\n${guidance.toReport}`,
      recommendedMaterials: `Sacs renforcés\n\nMatériel dérivé du référentiel:\n${guidance.toPrepare}`,
    });

    expect(hydrated.wasteCategories).toEqual(["sharps"]);
    expect(hydrated.safetyInstructions).toBe("Consigne organisateur");
    expect(hydrated.recommendedMaterials).toBe("Sacs renforcés");
    expect(buildPreparationDataFromForm(hydrated).expectedWasteCategories).toEqual(["sharps"]);
  });

  it("preserves ambiguous historical text and omits empty recommendations", () => {
    const form = createInitialFormState("Alice");
    const hydrated = applyPreparationDataToForm(form, {
      safetyInstructions: "Consigne organisateur\n\nConsignes dérivées du référentiel:\n- Consigne écrite par l'organisateur",
      recommendedMaterials: "Matériel libre",
    });

    expect(hydrated.safetyInstructions).toContain("Consignes dérivées du référentiel");
    expect(buildPreparationDataFromForm(hydrated).safetyInstructions).toContain("Consignes dérivées du référentiel");
    expect(buildPreparationDataFromForm(form).safetyInstructions).toBeUndefined();
    expect(buildPreparationDataFromForm(form).recommendedMaterials).toBeUndefined();
  });
});
