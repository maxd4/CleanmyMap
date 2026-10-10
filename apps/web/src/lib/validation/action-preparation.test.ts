import { buildCreateActionPayload, createInitialFormState } from "@/components/actions/action-declaration/payload";
import { toContractCreatePayload } from "@/lib/actions/contracts/contract-builders";
import { describe, expect, it } from "vitest";
import { createActionSchema, updateActionSchema } from "./action";

const basePayload = {
  actorName: "Bénévole test",
  associationName: "Action spontanée",
  actionDate: "2026-04-22",
  locationLabel: "Canal Saint-Martin",
  wasteKg: 1.5,
  cigaretteButts: 0,
  volunteersCount: 2,
  durationMinutes: 45,
};

describe("HTTP preparation data contract", () => {
  it("accepts the new form defaults on both creation contracts", () => {
    const form = createInitialFormState("Alice");
    form.actionDate = "2026-04-22";
    form.locationLabel = "Canal Saint-Martin";
    form.organizerType = "spontaneous";
    form.organizerName = "Alice";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });
    const legacy = createActionSchema.safeParse(payload);

    expect(legacy.success).toBe(true);
    if (!legacy.success) return;
    expect(legacy.data.preparationData?.accessibilityStatus).toBe("not_evaluated");
    expect(legacy.data.preparationData?.preparationChecklist).toHaveLength(4);

    const contract = createActionSchema.safeParse(toContractCreatePayload(payload));
    expect(contract.success).toBe(true);
    if (contract.success) {
      expect(contract.data.preparationData?.accessibilityStatus).toBe("not_evaluated");
      expect(contract.data.preparationData?.preparationChecklist).toHaveLength(4);
    }
  });

  it("accepts preparation edits and keeps old payloads compatible", () => {
    const update = updateActionSchema.safeParse({
      preparationData: {
        accessibilityStatus: "conditions_reported",
        materialsProvided: "Sacs disponibles au départ.",
        suggestedMaterials: ["gloves", "bags"],
        preparationChecklist: [
          { key: "materials_checked", label: "Matériel vérifié", checked: true },
        ],
      },
    });

    expect(update.success).toBe(true);
    if (update.success) {
      expect(update.data.preparationData).toMatchObject({
        accessibilityStatus: "conditions_reported",
        materialsProvided: "Sacs disponibles au départ.",
        suggestedMaterials: ["gloves", "bags"],
        preparationChecklist: [{ key: "materials_checked", checked: true }],
      });
    }
    expect(createActionSchema.safeParse(basePayload).success).toBe(true);
    expect(updateActionSchema.safeParse({ preparationData: { safetyInstructions: "Rester en binôme." } }).success).toBe(true);
  });

  it("rejects unknown values, duplicates, overlong arrays and invalid labels", () => {
    const valid = {
      ...basePayload,
      preparationData: {
        accessibilityStatus: "to_confirm",
        materialsProvided: "Pinces sur place.",
        suggestedMaterials: ["grabbers"],
        preparationChecklist: [{ key: "briefing", label: "Briefing sécurité", checked: false }],
      },
    };

    expect(createActionSchema.safeParse({ ...valid, preparationData: { ...valid.preparationData, accessibilityStatus: "certified_pmr" } }).success).toBe(false);
    expect(createActionSchema.safeParse({ ...valid, preparationData: { ...valid.preparationData, suggestedMaterials: ["unknown"] } }).success).toBe(false);
    expect(createActionSchema.safeParse({
      ...valid,
      preparationData: {
        ...valid.preparationData,
        preparationChecklist: Array.from({ length: 13 }, (_, index) => ({
          key: `item-${index}`,
          label: `Élément ${index}`,
          checked: false,
        })),
      },
    }).success).toBe(false);
    expect(createActionSchema.safeParse({
      ...valid,
      preparationData: {
        ...valid.preparationData,
        preparationChecklist: [
          { key: "briefing", label: "Briefing sécurité", checked: false },
          { key: "briefing", label: "Autre libellé", checked: true },
        ],
      },
    }).success).toBe(false);
    expect(createActionSchema.safeParse({
      ...valid,
      preparationData: { ...valid.preparationData, preparationChecklist: [{ key: " ", label: "Briefing sécurité", checked: false }] },
    }).success).toBe(false);
    expect(createActionSchema.safeParse({
      ...valid,
      preparationData: { ...valid.preparationData, preparationChecklist: [{ key: "briefing", label: "x".repeat(121), checked: false }] },
    }).success).toBe(false);
    expect(createActionSchema.safeParse({
      ...valid,
      preparationData: { ...valid.preparationData, materialsProvided: "x".repeat(2001) },
    }).success).toBe(false);
    expect(createActionSchema.safeParse({
      ...valid,
      preparationData: { ...valid.preparationData, preparationChecklist: [{ key: "briefing", label: "Briefing sécurité" }] },
    }).success).toBe(false);
  });
});
