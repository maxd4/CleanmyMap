import { describe, expect, it } from "vitest";
import { createActionInterventionMode } from "@/lib/actions/intervention-mode";
import { ACTION_PREPARATION_CHECKLIST_DEFAULTS } from "@/lib/actions/preparation-contract";
import { createInitialFormState } from "../payload";
import {
  addSuggestedPreparationItem,
  contextualPreparationSuggestions,
  preparationMomentContext,
  preparationMomentForItem,
} from "./preparation-checklist-model";

describe("preparation checklist moments and suggestions", () => {
  it("keeps the four canonical checks unchecked and places them in the operational moments", () => {
    expect(ACTION_PREPARATION_CHECKLIST_DEFAULTS).toHaveLength(4);
    expect(ACTION_PREPARATION_CHECKLIST_DEFAULTS.every((item) => !item.checked)).toBe(true);
    expect(ACTION_PREPARATION_CHECKLIST_DEFAULTS.map(({ key }) => preparationMomentForItem(key))).toEqual([
      "before",
      "start",
      "before",
      "start",
    ]);
  });

  it("suggests items for the selected mode without adding or confirming them", () => {
    const checklist = ACTION_PREPARATION_CHECKLIST_DEFAULTS.map((item) => ({ ...item }));
    const suggestions = contextualPreparationSuggestions({
      interventionMode: createActionInterventionMode("itinerary"),
      preparationChecklist: checklist,
    });
    const selected = suggestions.find((item) => item.key === "route_reconnaissance");
    expect(selected).toBeDefined();
    expect(checklist).toHaveLength(4);

    const updated = addSuggestedPreparationItem(checklist, selected!);
    expect(updated).toHaveLength(5);
    expect(updated.at(-1)).toMatchObject({ key: "custom_before_1", checked: false });
    expect(preparationMomentForItem(updated.at(-1)!.key)).toBe("before");
  });

  it("preserves historical custom keys and rejects duplicate or over-limit additions", () => {
    const historical = { key: "custom_7", label: "Rappel historique", checked: true };
    expect(preparationMomentForItem(historical.key)).toBe("unassigned");
    const items = [...ACTION_PREPARATION_CHECKLIST_DEFAULTS.map((item) => ({ ...item })), historical];
    const suggestion = contextualPreparationSuggestions({
      interventionMode: createActionInterventionMode("fixed_area"),
      preparationChecklist: items,
    }).find((item) => item.key === "weighing")!;

    const added = addSuggestedPreparationItem(items, suggestion);
    expect(added.at(-1)).toMatchObject({ checked: false, label: suggestion.label });
    expect(addSuggestedPreparationItem(added, suggestion)).toBe(added);
    const full = Array.from({ length: 12 }, (_, index) => ({ key: `custom_${index}`, label: `Contrôle ${index}`, checked: false }));
    expect(addSuggestedPreparationItem(full, suggestion)).toBe(full);
  });

  it("reuses declared schedule, materials, waste, and private notes in their respective moments", () => {
    const form = createInitialFormState("Organisateur", "action");
    form.recommendedMaterials = "Gants et eau";
    form.materialsProvided = "Sacs sur place";
    form.meetingTime = "09:15";
    form.departureTime = "09:30";
    form.departureLocationLabel = "Entrée nord";
    form.participantMessage = "Prévoir une gourde";
    form.safetyInstructions = "Rester avec le groupe";
    form.logisticsNotes = "Note privée de coordination";
    form.wasteCategories = ["plastic"];
    form.equipmentInventory.luggageScaleAvailable = true;

    const context = preparationMomentContext(form);
    expect(context.before.join(" ")).toContain("Gants et eau");
    expect(context.before.join(" ")).toContain("Sacs sur place");
    expect(context.before.join(" ")).toContain("Prévoir une gourde");
    expect(context.start.join(" ")).toContain("Horaires canoniques : rendez-vous 09:15 · départ 09:30");
    expect(context.during.join(" ")).toContain("Note interne (non transmise aux participants) : Note privée de coordination");
    expect(context.end.join(" ")).toContain("Plastique");
    expect(context.end.join(" ")).toContain("pèse-bagage annoncé disponible");
  });
});
