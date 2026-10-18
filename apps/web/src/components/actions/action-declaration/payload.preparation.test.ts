import { describe, expect, it } from "vitest";
import { buildCreateActionPayload, buildPreparationDataFromForm, createInitialFormState } from "./payload";
import { buildBaseForm } from "./payload.test-fixtures";

describe("action declaration payload données de préparation", () => {
  it("omits unselected descriptive choices while preserving explicit choices", () => {
    const blankForm = createInitialFormState("Alice");
    const blankPreparation = buildPreparationDataFromForm(blankForm);
    const blankPayload = buildCreateActionPayload({
      form: blankForm,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(blankPreparation).not.toHaveProperty("plannedObjective");
    expect(blankPreparation).not.toHaveProperty("estimatedDifficulty");
    expect(blankPreparation).not.toHaveProperty("creatorRole");
    expect(blankPreparation).not.toHaveProperty("placeType");
    expect(blankPreparation).not.toHaveProperty("equipmentInventory");
    expect(blankPreparation).not.toHaveProperty("refreshmentsProvided");
    expect(blankPreparation.durationMinutesDeclared).toBe(false);
    expect(blankPayload).not.toHaveProperty("placeType");
    expect(blankPayload.preparationData).not.toHaveProperty("plannedObjective");
    expect(blankPayload.preparationData).not.toHaveProperty("estimatedDifficulty");
    expect(blankPayload.preparationData).not.toHaveProperty("creatorRole");
    expect(blankPayload.preparationData).not.toHaveProperty("placeType");

    const explicitForm = {
      ...blankForm,
      plannedObjective: "nettoyage" as const,
      estimatedDifficulty: "soutenue" as const,
      placeType: "parc",
    };
    const explicitPreparation = buildPreparationDataFromForm(explicitForm);

    expect(explicitPreparation).toMatchObject({
      plannedObjective: "nettoyage",
      estimatedDifficulty: "soutenue",
      placeType: "parc",
      durationMinutesDeclared: false,
    });

    explicitForm.durationMinutes = "45";
    expect(buildPreparationDataFromForm(explicitForm).durationMinutesDeclared).toBe(true);
  });

  it("stores canonical waste expectations without persisting derived guidance", () => {
    const form = buildBaseForm();
    form.wasteCategories = ["broken_glass", "sharps"];
    form.safetyInstructions = "Consigne organisateur";
    form.recommendedMaterials = "Sacs renforcés";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.preparationData?.expectedWasteCategories).toEqual(["broken_glass", "sharps"]);
    expect(payload.preparationData?.safetyInstructions).toBe("Consigne organisateur");
    expect(payload.preparationData?.recommendedMaterials).toBe("Sacs renforcés");
    expect(payload.preparationData?.safetyInstructions).not.toContain("dérivées du référentiel");
    expect(payload.preparationData?.recommendedMaterials).not.toContain("dérivé du référentiel");
  });

  it("persists structured preparation without mixing organizer text and derived guidance", () => {
    const form = buildBaseForm();
    form.accessibilityStatus = "conditions_reported";
    form.accessibility = "Accès par la rampe nord.";
    form.materialsProvided = "Sacs disponibles au départ.";
    form.suggestedMaterials = ["gloves", "grabbers"];
    form.preparationChecklist[0].checked = true;
    form.recommendedMaterials = "Eau et chaussures adaptées.";
    form.equipmentInventory = { glovesPairs: 0, garbageBags: 8, firstAidKitAvailable: true };
    form.refreshmentsProvided = { waterDuringAction: true, drinksAfterAction: false, snackAfterAction: true };

    const preparation = buildPreparationDataFromForm(form);

    expect(preparation.accessibilityStatus).toBe("conditions_reported");
    expect(preparation.materialsProvided).toBe("Sacs disponibles au départ.");
    expect(preparation.suggestedMaterials).toEqual(["gloves", "grabbers"]);
    expect(preparation.equipmentInventory).toEqual({ glovesPairs: 0, garbageBags: 8, firstAidKitAvailable: true });
    expect(preparation.refreshmentsProvided).toEqual({ waterDuringAction: true, drinksAfterAction: false, snackAfterAction: true });
    expect(preparation.preparationChecklist?.[0]).toMatchObject({
      key: "materials_checked",
      checked: true,
    });
    expect(preparation.safetyInstructions).toBeUndefined();
  });
});
